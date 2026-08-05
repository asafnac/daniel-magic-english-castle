/**
 * תרגול מסתגל: הסבב שלא נגמר.
 *
 * זו התשובה לבעיה שהמשחק נגמר. תשעים ומשהו משימות כתובות בקוד בסדר
 * קבוע נגמרות ביום, ואחרי זה אין סיבה לחזור. כאן אין רשימה: המשחק
 * מסתכל על מה שדניאל כבר פגשה, מדרג כל פריט לפי כמה דחוף לתרגל אותו
 * עכשיו, ובונה סבב קצר מהעליונים.
 *
 * הסבב קצר בכוונה - שמונה משימות, שלוש עד חמש דקות עם סיום ברור.
 * מקטע קצר עם סוף שרואים עדיף על סבב ארוך שנוטשים באמצע, ובמיוחד
 * למי שקשה לה עם קשב.
 *
 * מקורות הפריטים:
 * 1. מה שדניאל כבר נפגשה איתו, לפי מעקב השליטה.
 * 2. מילים מרשימות פעילות שההורה הוסיף, כמו הכתבה מבית הספר.
 *    אלה מקבלות עדיפות, כי יש להן תאריך.
 */

import { AREAS } from './areas'
import { Lives } from './lives'
import { getStat, urgencyOf, type ItemKind } from './mastery'
import { PHONEMES } from './phonics'
import { getProgress, updateProgress, type SaveData } from './progress'
import { createPracticeTask, createTask, trackedItems, type Task } from './questions'
import { applyAnswer } from './mastery'
import { FRAMES, nounOf, randomPicks } from './sentences'
import type { AnswerResult, TaskSession } from './session'
import { allWords, findAnyWord } from './wordbank'

/** אורך סבב. קצר בכוונה. */
export const PRACTICE_ROUND = 8

/** מועמד לתרגול, לפני שנבחר. */
export interface Candidate {
  kind: ItemKind
  id: string
  urgency: number
  /** הגיע מרשימה של ההורה, ולכן מקבל עדיפות. */
  fromList?: string
}

/** האם כבר נפתחו אזורי הקריאה, כלומר מותר לתת משימת קריאה בתרגול. */
export function readingUnlocked(save: SaveData = getProgress()): boolean {
  return AREAS.some((a) => a.phonicsSet !== undefined && save.areas[a.id]?.done)
}

/** האם כבר נפתחו אזורי המשפטים. */
export function sentencesUnlocked(save: SaveData = getProgress()): boolean {
  return AREAS.some((a) => a.teachesSentences && save.areas[a.id]?.done)
}

/**
 * כל מה שאפשר לתרגל עכשיו, מדורג לפי דחיפות.
 *
 * פריט שדניאל עוד לא נפגשה איתו בכלל לא נכנס לכאן, חוץ ממילים
 * מרשימה של ההורה: אלה בדיוק המילים שהיא צריכה ללמוד השבוע,
 * וזה שהיא לא ראתה אותן עדיין הוא הסיבה לתרגל אותן ולא סיבה לדלג.
 */
export function candidates(save: SaveData = getProgress(), now = Date.now()): Candidate[] {
  const out: Candidate[] = []
  const seen = new Set<string>()

  const push = (kind: ItemKind, id: string, boost = 0, fromList?: string): void => {
    const key = `${kind}:${id}`
    if (seen.has(key)) return
    seen.add(key)
    const urgency = Math.min(1, urgencyOf(getStat(save, kind, id), now) + boost)
    out.push({ kind, id, urgency, fromList })
  }

  // מילים מרשימות פעילות. עדיפות גבוהה, גם אם עוד לא נפגשו.
  for (const list of save.lists) {
    if (!list.active) continue
    for (const wordId of list.wordIds) push('word', wordId, 0.3, list.title)
  }

  // כל מה שכבר נפגשה איתו
  for (const stat of Object.values(save.stats)) {
    const at = stat.id.indexOf(':')
    const kind = stat.id.slice(0, at) as ItemKind
    const id = stat.id.slice(at + 1)
    if (kind === 'sound' && !PHONEMES.some((p) => p.id === id)) continue
    if (kind === 'frame' && !FRAMES.some((f) => f.id === id)) continue
    if (kind === 'word' && !findAnyWord(id, save)) continue
    push(kind, id)
  }

  return out.sort((a, b) => b.urgency - a.urgency)
}

/**
 * בוחר את פריטי הסבב.
 *
 * לא פשוט "העליונים ברשימה": בחירה דטרמיניסטית מייצרת בדיוק את אותו
 * סבב פעמיים ברצף, וזה משעמם ומרגיש שבור. לכן בוחרים מתוך מאגר
 * מורחב פי שלושה, בהטיה לטובת הדחופים.
 */
export function chooseRound(pool: readonly Candidate[], count = PRACTICE_ROUND, rand: () => number = Math.random): Candidate[] {
  const window = pool.slice(0, Math.max(count, count * 3))
  const picked: Candidate[] = []
  const left = window.slice()

  while (picked.length < count && left.length > 0) {
    const weights = left.map((c) => c.urgency + 0.05)
    const total = weights.reduce((a, b) => a + b, 0)
    let roll = rand() * total
    let index = 0
    while (index < left.length - 1 && roll > weights[index]) {
      roll -= weights[index]
      index += 1
    }
    picked.push(left[index])
    left.splice(index, 1)
  }

  return picked
}

/** בונה משימה עבור מועמד. מחזיר null אם אי אפשר לבנות ממנו משימה. */
export function taskFor(candidate: Candidate, save: SaveData = getProgress()): Task | null {
  const areaId = 'free-practice'
  try {
    if (candidate.kind === 'sound') {
      const phoneme = PHONEMES.find((p) => p.id === candidate.id)
      if (!phoneme) return null
      const task = createTask(areaId, { type: 'sound-to-letter', word: phoneme.anchor, phoneme: phoneme.id })
      task.isPractice = true
      return task
    }

    if (candidate.kind === 'frame') {
      if (!sentencesUnlocked(save)) return null
      const frame = FRAMES.find((f) => f.id === candidate.id)
      if (!frame) return null
      const picks = randomPicks(frame)
      const type = Math.random() < 0.5 ? 'sentence-pick' : 'sentence-build'
      const task = createTask(areaId, { type, frame: frame.id, picks, word: nounOf(frame.id, picks) })
      task.isPractice = true
      return task
    }

    return createPracticeTask(areaId, candidate.id, undefined, { allowReading: readingUnlocked(save) })
  } catch {
    // פריט שנמחק או השתנה מאז שנשמר. מדלגים עליו במקום להפיל סבב שלם.
    return null
  }
}

/**
 * סבב תרגול. מממש את אותו ממשק כמו סבב אזור, ולכן פאנל המשימה
 * מציג אותו בלי לדעת שהוא שונה.
 */
export class PracticeSession implements TaskSession {
  readonly lives = new Lives()
  readonly accent = '#4fb3a1'

  private queue: Task[]
  private index = 0
  private matched = new Set<string>()
  private answered = 0
  private gotRight = 0
  /** שמות הרשימות שהופיעו בסבב, לתצוגה בכרטיס הסיום. */
  private listNames = new Set<string>()

  constructor(size = PRACTICE_ROUND, save: SaveData = getProgress()) {
    const pool = candidates(save)
    const chosen = chooseRound(pool, size)
    this.queue = []
    for (const candidate of chosen) {
      const task = taskFor(candidate, save)
      if (!task) continue
      this.queue.push(task)
      if (candidate.fromList) this.listNames.add(candidate.fromList)
    }
    this.lives.startTask()
  }

  /** סבב ריק פירושו שאין עוד מה לתרגל. ה-UI חייב לבדוק את זה. */
  get isEmpty(): boolean {
    return this.queue.length === 0
  }

  get task(): Task {
    return this.queue[Math.min(this.index, this.queue.length - 1)]
  }

  get position(): { done: number; total: number } {
    return { done: this.answered, total: this.queue.length }
  }

  get completion(): { emoji: string; title: string; text: string; nextLabel: string } {
    const lists = Array.from(this.listNames)
    const listNote = lists.length > 0 ? ` תרגלנו גם מ${lists.join(' ומ')}.` : ''
    return {
      emoji: this.gotRight === this.queue.length ? '🏆' : '🌟',
      title: 'סיימת סבב תרגול!',
      text: `${this.gotRight} מתוך ${this.queue.length} בפעם הראשונה.${listNote} אפשר עוד סבב מתי שבא לך.`,
      nextLabel: 'חזרה לטירה',
    }
  }

  // ------------------------------------------------------------ תשובות

  answer(optionId: string): AnswerResult {
    const task = this.task
    if (task.options.length === 0) return this.onCorrect()
    return task.options.find((o) => o.id === optionId)?.correct ? this.onCorrect() : this.onWrong()
  }

  answerPair(wordId: string, objectId: string): AnswerResult | null {
    if (wordId !== objectId) return this.onWrong()
    this.matched.add(wordId)
    if (this.matched.size < (this.task.pairs?.length ?? 0)) return null
    return this.onCorrect()
  }

  confirmSaid(): AnswerResult {
    return this.onCorrect()
  }

  answerBuilt(text: string): AnswerResult {
    const target = this.task.build?.text ?? this.task.sentenceBuild?.text
    if (target === undefined) return this.onWrong()
    return text.toLowerCase() === target.toLowerCase() ? this.onCorrect() : this.onWrong()
  }

  private onCorrect(): AnswerResult {
    // "בפעם הראשונה" נספר רק אם לא נעשתה טעות במשימה הזאת
    if (this.lives.value === this.lives.max) this.gotRight += 1
    this.track(true)
    return { correct: true, diamonds: this.lives.value, outOfDiamonds: false, hideDistractors: 0 }
  }

  private onWrong(): AnswerResult {
    this.track(false)
    const depleted = this.lives.loseOne()
    const hintIndex = Math.min(this.lives.hint, this.task.hints.length) - 1
    return {
      correct: false,
      diamonds: this.lives.value,
      outOfDiamonds: depleted,
      hint: hintIndex >= 0 ? this.task.hints[hintIndex] : undefined,
      hideDistractors: this.lives.hiddenDistractors(this.task.options.length),
    }
  }

  private track(correct: boolean): void {
    const items = trackedItems(this.task)
    updateProgress((save) => {
      for (const item of items) applyAnswer(save, item.kind, item.id, correct)
    })
  }

  // ------------------------------------------------------------ מעברים

  currentHint(): string | undefined {
    const idx = Math.min(this.lives.hint, this.task.hints.length) - 1
    return idx >= 0 ? this.task.hints[idx] : undefined
  }

  currentHideDistractors(): number {
    return this.lives.hiddenDistractors(this.task.options.length)
  }

  currentRevealedTiles(): number {
    const total = this.task.build?.sounds.length ?? 0
    if (total === 0) return 0
    if (this.lives.hint >= 3) return Math.max(0, total - 1)
    if (this.lives.hint >= 2) return 1
    return 0
  }

  currentRevealedWords(): number {
    const build = this.task.sentenceBuild
    if (!build) return 0
    const choosable = build.slots.filter((s) => !s.fixed).length
    if (choosable === 0) return 0
    return this.lives.hint >= 3 ? Math.min(1, choosable - 1) : 0
  }

  restartCurrentTask(): void {
    this.matched.clear()
    this.lives.restartSameTask()
  }

  advance(): { areaCompleted: boolean; unlockedAreaId?: string } {
    this.matched.clear()
    this.answered += 1
    this.index += 1
    this.lives.startTask()
    return { areaCompleted: this.index >= this.queue.length }
  }
}

/** כמה פריטים בכלל אפשר לתרגל כרגע. משמש להסתרת הכפתור כשאין. */
export function practiceAvailable(save: SaveData = getProgress()): number {
  return candidates(save).length
}

/** כל המילים שאפשר להציע להורה להוסיף לרשימה. */
export function practicableWords(save: SaveData = getProgress()): { id: string; english: string; hebrew: string }[] {
  return allWords(save).map((w) => ({ id: w.id, english: w.english, hebrew: w.hebrew }))
}
