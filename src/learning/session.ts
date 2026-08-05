/**
 * ניהול סבב משימות באזור אחד.
 *
 * הסשן יודע איזו משימה עכשיו, מה קורה בתשובה נכונה או שגויה,
 * מתי מגיעה משימת חזרה, ומתי האזור הסתיים. הוא לא מכיר DOM ולא Three.js.
 */

import { getArea, nextArea, type AreaDef } from './areas'
import { createPracticeTask, createTask, type Task } from './questions'
import { Lives } from './lives'
import { addStars, areaProgress, markWordLearned, unlockArea, updateProgress } from './progress'
import { nextDuePractice, recordMistake, recordSuccess, tickCooldowns } from './practice'

/** כמה משימות חזרה מקסימום נשתול בסבב אחד, כדי שהאזור לא יתארך. */
const MAX_PRACTICE_PER_RUN = 3
const STARS_PER_TASK = 1
const STARS_AREA_BONUS = 5

export interface AnswerResult {
  correct: boolean
  /** כמה יהלומים נשארו. */
  diamonds: number
  /** נגמרו היהלומים והמשימה תתחיל מחדש. */
  outOfDiamonds: boolean
  /** הרמז להצגה עכשיו, אם יש. */
  hint?: string
  /** כמה אפשרויות שגויות להסתיר עכשיו. */
  hideDistractors: number
}

export class AreaSession {
  readonly area: AreaDef
  readonly lives = new Lives()

  private queue: Task[]
  private index = 0
  private practiceUsed = 0
  private completedReal = 0
  /** זוגות שכבר הותאמו במשימת התאמה. */
  private matched = new Set<string>()

  constructor(areaId: string) {
    this.area = getArea(areaId)
    this.queue = this.area.tasks.map((spec) => createTask(this.area.id, spec))
    this.lives.startTask()
  }

  get task(): Task {
    return this.queue[this.index]
  }

  get isFinished(): boolean {
    return this.index >= this.queue.length
  }

  /** מיקום לתצוגת התקדמות. משימות חזרה לא נספרות, כדי לא לבלבל. */
  get position(): { done: number; total: number } {
    return { done: this.completedReal, total: this.area.tasks.length }
  }

  get matchedPairs(): ReadonlySet<string> {
    return this.matched
  }

  // ------------------------------------------------------------ תשובות

  /** תשובה למשימה עם אפשרויות. */
  answer(optionId: string): AnswerResult {
    const task = this.task
    // רשת ביטחון: משימה בלי אפשרויות, כמו "שמעתי ואמרתי", אינה יכולה
    // להיכשל. בלי השורה הזאת קריאה שגויה מה-UI הייתה הופכת אותה
    // למשימה שאי אפשר לעבור אותה לעולם, וזה בדיוק מה שילדה חווה כתקיעה.
    if (task.options.length === 0) return this.onCorrect()
    const option = task.options.find((o) => o.id === optionId)
    if (option?.correct) return this.onCorrect()
    return this.onWrong()
  }

  /** התאמה בין מילה לחפץ. מחזיר null אם עוד לא סיימנו את כל הזוגות. */
  answerPair(wordId: string, objectId: string): AnswerResult | null {
    if (wordId !== objectId) return this.onWrong()
    this.matched.add(wordId)
    const total = this.task.pairs?.length ?? 0
    if (this.matched.size < total) return null
    return this.onCorrect()
  }

  /** אישור במשימת "שמעתי ואמרתי". תמיד מצליח, אין כאן טעויות. */
  confirmSaid(): AnswerResult {
    return this.onCorrect()
  }

  /**
   * תשובה למשימת בנייה: המילה שנבנתה מאריחי הצליל.
   *
   * זו הדרך היחידה במשחק לענות בלי לבחור מתוך רשימה, ולכן היא לא
   * עוברת דרך answer. ההשוואה היא לאיות המלא, כי בנייה נכונה של
   * חלק מהמילה עדיין אינה המילה.
   */
  answerBuilt(text: string): AnswerResult {
    const target = this.task.build?.text
    if (target === undefined) return this.onWrong()
    return text.toLowerCase() === target.toLowerCase() ? this.onCorrect() : this.onWrong()
  }

  /**
   * כמה אריחים לחשוף במשימת בנייה. הרמז כאן אינו מסתיר הסחות
   * אלא מניח אריחים במקום, כי במשימה שאין בה אפשרויות אין מה להסתיר.
   */
  currentRevealedTiles(): number {
    const total = this.task.build?.sounds.length ?? 0
    if (total === 0) return 0
    if (this.lives.hint >= 3) return Math.max(0, total - 1)
    if (this.lives.hint >= 2) return 1
    return 0
  }

  private onCorrect(): AnswerResult {
    const task = this.task
    recordSuccess(task.wordId)
    markWordLearned(task.wordId)
    addStars(STARS_PER_TASK, this.area.id)
    return { correct: true, diamonds: this.lives.value, outOfDiamonds: false, hideDistractors: 0 }
  }

  private onWrong(): AnswerResult {
    const task = this.task
    recordMistake(task.wordId, task.type)
    const depleted = this.lives.loseOne()
    const hintIndex = Math.min(this.lives.hint, task.hints.length) - 1
    return {
      correct: false,
      diamonds: this.lives.value,
      outOfDiamonds: depleted,
      hint: hintIndex >= 0 ? task.hints[hintIndex] : undefined,
      hideDistractors: this.lives.hiddenDistractors(task.options.length),
    }
  }

  /** הרמז שצריך להיות מוצג כרגע, למשל אחרי התחלה מחדש של המשימה. */
  currentHint(): string | undefined {
    const idx = Math.min(this.lives.hint, this.task.hints.length) - 1
    return idx >= 0 ? this.task.hints[idx] : undefined
  }

  currentHideDistractors(): number {
    return this.lives.hiddenDistractors(this.task.options.length)
  }

  // ------------------------------------------------------------ מעברים

  /**
   * נגמרו היהלומים. חוזרים לתחילת אותה משימה בלבד,
   * עם ארבעה יהלומים חדשים ורמז חזק יותר. לא מאבדים שום התקדמות.
   */
  restartCurrentTask(): void {
    this.matched.clear()
    this.lives.restartSameTask()
  }

  /**
   * מסיימים את המשימה הנוכחית ועוברים לבאה.
   * מחזיר תיאור של מה שקרה, כדי שה-UI יידע אם האזור הסתיים.
   */
  advance(): { areaCompleted: boolean; unlockedAreaId?: string } {
    const finished = this.task
    if (!finished.isPractice) {
      this.completedReal += 1
      updateProgress((d) => {
        const ap = d.areas[this.area.id]
        if (ap) ap.completedTasks = Math.max(ap.completedTasks, this.completedReal)
      })
    }

    this.matched.clear()
    tickCooldowns()
    this.index += 1
    this.lives.startTask()

    this.maybeInsertPractice()

    if (this.index < this.queue.length) return { areaCompleted: false }

    // האזור הסתיים.
    addStars(STARS_AREA_BONUS, this.area.id)
    updateProgress((d) => {
      const a = d.areas[this.area.id]
      if (a) {
        a.done = true
        a.completedTasks = this.area.tasks.length
      }
      d.lastArea = this.area.id
    })

    const follow = nextArea(this.area.id)
    if (follow) {
      const alreadyOpen = areaProgress(follow.id).unlocked
      unlockArea(follow.id)
      if (!alreadyOpen) return { areaCompleted: true, unlockedAreaId: follow.id }
    }
    return { areaCompleted: true }
  }

  /** שותל משימת חזרה אם יש מילה שהגיע זמנה, ולא חרגנו מהמכסה. */
  private maybeInsertPractice(): void {
    if (this.practiceUsed >= MAX_PRACTICE_PER_RUN) return
    if (this.index >= this.queue.length) return
    const due = nextDuePractice()
    if (!due) return

    const task = createPracticeTask(this.area.id, due.id, due.missedType)
    this.queue.splice(this.index, 0, task)
    this.practiceUsed += 1
    // מאפסים את הטיימר, כדי שאותה מילה לא תחזור פעמיים ברצף.
    updateProgress((d) => {
      const e = d.needPractice.find((x) => x.id === due.id)
      if (e) e.cooldown = 3
    })
  }
}
