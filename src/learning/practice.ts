/**
 * חזרה חכמה.
 *
 * מילה שדניאל טעתה בה נכנסת לתור. היא לא חוזרת מיד, אלא רק אחרי
 * כמה משימות אחרות, ובסוג משימה שונה מזה שבו נטעתה, כדי שהחזרה
 * לא תרגיש כמו עונש על אותו מסך בדיוק.
 * אחרי שתי תשובות נכונות ברצף המילה יוצאת מהתור.
 */

import { getProgress, updateProgress, type PracticeEntry } from './progress'
import type { TaskType } from './questions'

/** כמה משימות צריכות לעבור לפני שמילה חוזרת. */
const COOLDOWN_TASKS = 3
/** כמה הצלחות ברצף נדרשות כדי לצאת מהתור. */
const STRIKES_TO_GRADUATE = 2

export function recordMistake(wordId: string, type: TaskType): void {
  updateProgress((d) => {
    d.mistakes += 1
    const existing = d.needPractice.find((e) => e.id === wordId)
    if (existing) {
      existing.strikes = 0
      existing.missedType = type
      existing.cooldown = COOLDOWN_TASKS
    } else {
      d.needPractice.push({ id: wordId, strikes: 0, missedType: type, cooldown: COOLDOWN_TASKS })
    }
  })
}

export function recordSuccess(wordId: string): void {
  updateProgress((d) => {
    d.correct += 1
    const entry = d.needPractice.find((e) => e.id === wordId)
    if (!entry) return
    entry.strikes += 1
    if (entry.strikes >= STRIKES_TO_GRADUATE) {
      d.needPractice = d.needPractice.filter((e) => e.id !== wordId)
    } else {
      entry.cooldown = COOLDOWN_TASKS
    }
  })
}

/** מקדם את הטיימר של כל המילים בתור. נקרא אחרי כל משימה שהושלמה. */
export function tickCooldowns(): void {
  updateProgress((d) => {
    for (const e of d.needPractice) {
      if (e.cooldown > 0) e.cooldown -= 1
    }
  })
}

/** המילה הבאה שראוי לחזור עליה, אם יש כזאת. */
export function nextDuePractice(exclude: readonly string[] = []): PracticeEntry | undefined {
  const d = getProgress()
  return d.needPractice.find((e) => e.cooldown <= 0 && !exclude.includes(e.id))
}

/** רשימת המילים שכדאי לתרגל, למסך ההתקדמות. */
export function wordsToPractice(): string[] {
  return getProgress().needPractice.map((e) => e.id)
}
