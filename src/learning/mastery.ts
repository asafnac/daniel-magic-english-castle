/**
 * מעקב שליטה לכל פריט.
 *
 * עד כאן המשחק ידע רק שתי מספרים גלובליים: כמה נכון וכמה טעות. אי אפשר
 * ללמוד מזה כלום. כדי לדעת איפה דניאל חזקה ואיפה חלשה, וכדי להחליט מה
 * כדאי לתרגל עכשיו, צריך נתון לכל פריט בנפרד: כל מילה, כל צליל וכל
 * מסגרת משפט.
 *
 * הקובץ הזה הוא הבסיס לשני דברים: התרגול המסתגל ומסך ההורים.
 *
 * שתי החלטות שכדאי להכיר:
 *
 * 1. הנתונים כאן מונוטוניים ברובם - מונים שרק עולים. זה לא במקרה:
 *    זה מה שמאפשר למזג שתי שמירות משני מכשירים בלי לאבד כלום.
 *    ראו sync.ts.
 * 2. אין כאן ציון ואין אחוזים שמוצגים לילדה. הנתון הזה קיים בשביל
 *    המשחק ובשביל ההורה, ולעולם לא מוצג לה כמדד.
 */

import type { SaveData } from './progress'

/** סוגי הפריטים שאפשר לעקוב אחריהם. */
export type ItemKind = 'word' | 'sound' | 'frame'

export interface ItemStat {
  /** מזהה מלא, כולל הסוג: "word:cat", "sound:s", "frame:the-size-noun". */
  id: string
  kind: ItemKind
  /** כמה פעמים הפריט הוצג. */
  seen: number
  correct: number
  wrong: number
  /** רצף התשובות הנכונות הנוכחי. מתאפס בכל טעות. */
  streak: number
  /** הרצף הארוך ביותר שהיה אי פעם. */
  bestStreak: number
  /** מתי נראה לאחרונה, במילישניות. */
  last: number
  /** מתי נענה נכון לאחרונה. */
  lastCorrect: number
}

export function itemKey(kind: ItemKind, id: string): string {
  return `${kind}:${id}`
}

export function splitKey(key: string): { kind: ItemKind; id: string } {
  const at = key.indexOf(':')
  return { kind: key.slice(0, at) as ItemKind, id: key.slice(at + 1) }
}

export function freshStat(kind: ItemKind, id: string): ItemStat {
  return { id: itemKey(kind, id), kind, seen: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0, last: 0, lastCorrect: 0 }
}

/** מנקה ערך שנקרא מאחסון, כדי ששמירה פגומה לא תפיל את המשחק. */
export function sanitizeStat(raw: unknown): ItemStat | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<ItemStat>
  if (typeof r.id !== 'string' || !r.id.includes(':')) return null
  const { kind, id } = splitKey(r.id)
  if (kind !== 'word' && kind !== 'sound' && kind !== 'frame') return null
  if (!id) return null
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
  return {
    id: r.id,
    kind,
    seen: n(r.seen),
    correct: n(r.correct),
    wrong: n(r.wrong),
    streak: n(r.streak),
    bestStreak: n(r.bestStreak),
    last: n(r.last),
    lastCorrect: n(r.lastCorrect),
  }
}

// ---------------------------------------------------------------- רישום

function statIn(save: SaveData, kind: ItemKind, id: string): ItemStat {
  const key = itemKey(kind, id)
  const existing = save.stats[key]
  if (existing) return existing
  const created = freshStat(kind, id)
  save.stats[key] = created
  return created
}

export function getStat(save: SaveData, kind: ItemKind, id: string): ItemStat | undefined {
  return save.stats[itemKey(kind, id)]
}

/**
 * רושם תשובה לתוך שמירה נתונה.
 *
 * הפונקציה מקבלת את השמירה במקום לייבא אותה, כדי שהקובץ הזה לא יתלה
 * ב-progress.ts בזמן ריצה. progress.ts כבר תלוי כאן לצורך ניקוי
 * הנתונים, ותלות הדדית אמיתית בין השניים היא בדיוק סוג התקלה שקשה
 * לאתר אחר כך.
 */
export function applyAnswer(save: SaveData, kind: ItemKind, id: string, correct: boolean, now = Date.now()): void {
  const stat = statIn(save, kind, id)
  stat.seen += 1
  stat.last = now
  if (correct) {
    stat.correct += 1
    stat.streak += 1
    stat.bestStreak = Math.max(stat.bestStreak, stat.streak)
    stat.lastCorrect = now
  } else {
    stat.wrong += 1
    stat.streak = 0
  }
}

// ---------------------------------------------------------------- ניתוח

/** יום אחד במילישניות. */
const DAY = 24 * 60 * 60 * 1000

/**
 * דירוג שליטה בין 0 ל-1.
 *
 * שלושה גורמים, ובמכוון לא רק אחוז הצלחה: ילדה שענתה נכון פעם אחת
 * לפני חודש אינה שולטת במילה, וילדה שטעתה פעם אחת בהתחלה ומאז ענתה
 * נכון חמש פעמים כן שולטת בה.
 *
 * - דיוק: כמה מהפעמים היו נכונות.
 * - רצף: כמה נכונות ברצף עכשיו. זה מה שמבדיל בין "יודעת" ל"ניחשה".
 * - טריות: ידע נשחק. אחרי שבועיים בלי מפגש הציון יורד.
 */
export function masteryOf(stat: ItemStat | undefined, now = Date.now()): number {
  if (!stat || stat.seen === 0) return 0
  const accuracy = stat.correct / stat.seen
  const streakBoost = Math.min(1, stat.streak / 3)
  const base = accuracy * 0.55 + streakBoost * 0.45

  if (stat.lastCorrect === 0) return Math.min(base, 0.25)

  // דעיכה עדינה: אחרי שבועיים בלי מפגש נשארים בערך שני שלישים.
  const days = Math.max(0, (now - stat.lastCorrect) / DAY)
  const freshness = 1 / (1 + days / 30)
  return clamp01(base * (0.55 + 0.45 * freshness))
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** קטגוריות שליטה, לתצוגה להורה ולבחירת תרגול. */
export type MasteryBand = 'unseen' | 'shaky' | 'learning' | 'solid'

export function bandOf(mastery: number, stat: ItemStat | undefined): MasteryBand {
  if (!stat || stat.seen === 0) return 'unseen'
  if (mastery < 0.4) return 'shaky'
  if (mastery < 0.75) return 'learning'
  return 'solid'
}

export const BAND_LABEL: Record<MasteryBand, string> = {
  unseen: 'עוד לא נפגשה',
  shaky: 'צריכה חיזוק',
  learning: 'בדרך',
  solid: 'שולטת',
}

/**
 * דחיפות תרגול. ככל שהמספר גבוה יותר, כדאי יותר להציג את הפריט עכשיו.
 *
 * הסדר כאן הוא כל ההבדל בין תרגול שמרגיש חכם לבין תרגול אקראי:
 * קודם מה שנשבר לאחרונה, אחר כך מה שהגיע זמנו לחזור, ורק בסוף
 * מה שכבר יושב טוב. פריט שנראה ממש עכשיו יורד לתחתית בכל מקרה,
 * כדי שאותה מילה לא תחזור פעמיים ברצף.
 */
export function urgencyOf(stat: ItemStat | undefined, now = Date.now()): number {
  if (!stat || stat.seen === 0) return 0.65
  const mastery = masteryOf(stat, now)
  const sinceSeen = (now - stat.last) / DAY

  // נראה ממש עכשיו: לא חוזרים עליו מיד, כמה שלא יהיה חלש.
  if (sinceSeen < 0.003) return 0.02

  // מרווח החזרה גדל עם הרצף. זה הריווח המתרחב שהמחקר תומך בו.
  const dueIn = [0, 1, 2, 4, 8, 16][Math.min(stat.streak, 5)]
  const overdue = dueIn === 0 ? 1 : clamp01(sinceSeen / dueIn)

  return clamp01((1 - mastery) * 0.6 + overdue * 0.4)
}

export interface MasterySummary {
  total: number
  unseen: number
  shaky: number
  learning: number
  solid: number
}

export function summarize(stats: Iterable<ItemStat | undefined>, now = Date.now()): MasterySummary {
  const out: MasterySummary = { total: 0, unseen: 0, shaky: 0, learning: 0, solid: 0 }
  for (const s of stats) {
    out.total += 1
    out[bandOf(masteryOf(s, now), s)] += 1
  }
  return out
}
