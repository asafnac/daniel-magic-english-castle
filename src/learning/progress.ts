/**
 * שמירת ההתקדמות ב-localStorage.
 *
 * כללי ברזל כאן:
 * 1. אם האחסון חסום או מלא, המשחק ממשיך לעבוד מזיכרון זמני.
 * 2. אם המידע השמור פגום או מגרסה אחרת, מתחילים נקי במקום להתרסק.
 * 3. הכתיבה מושהית מעט, כדי לא לכתוב לדיסק באמצע אנימציה.
 */

import { AREAS, FIRST_AREA_ID } from './areas'
import { sanitizeAvatar, type AvatarConfig } from '../app/avatarConfig'
import { sanitizeStat, type ItemStat } from './mastery'
import { MAX_LOG } from './merge'
import { adoptLegacySyncConfig } from './syncConfig'
import type { TaskType } from './questions'

const STORAGE_KEY = 'dmec:v1'
const SCHEMA_VERSION = 1

/**
 * מזהה המשחק בתוך השמירה.
 *
 * השרת הוא קופסה טיפשה שמזוהה בקוד בלבד, ואותו שרת משרת גם את משחק
 * החשבון של אח המשפחה. קוד שהוקלד פעמיים בטעות היה גורם לשתי השמירות
 * לדרוס זו את זו. השדה הזה מאפשר לזהות את המצב לפני שכותבים, ולעצור.
 */
export const GAME_ID = 'dmec'

/**
 * שורה ביומן: מה נעשה ומתי.
 *
 * שלושה דברים שונים תלויים בשדה הזה, וכדאי להכיר את כולם.
 *
 * 1. **השרת דורש אותו.** הוא דוחה גוף בלי מערך log, וזו הגנה שפויה
 *    מפני לקוח שבור שימחק שנה של היסטוריה בבקשה אחת. לכן השדה חייב
 *    להתקיים מהטעינה הראשונה, ריק או לא - אחרת הסנכרון הראשון ממכשיר
 *    חדש נכשל דווקא ברגע שההורה מנסה להתחבר בפעם הראשונה.
 * 2. **מדדי השליטה לא יודעים לספר על זמן.** הם יודעים מה דניאל יודעת,
 *    ולא מתי היא ישבה לשחק. היומן הוא מה שמאפשר להראות להורה שבוע
 *    שקט או שלושה ימים ברצף.
 * 3. **הוא ממוזג לפי מפתח יציב** - שעה, סוג ומזהה - ולכן אותה שורה
 *    שמגיעה משני מכשירים היא שורה אחת, וסנכרון חוזר לא מכפיל כלום.
 */
export interface LogEntry {
  /** מתי הסתיים, לפי שעון המכשיר שיצר את השורה. */
  t: number
  /** 'area' לסיום אזור, 'practice' לסבב תרגול. */
  kind: 'area' | 'practice'
  /** מזהה האזור, או 'free' לתרגול חופשי. */
  id: string
  /** כמה נענו נכון בפעם הראשונה, מתוך כמה. */
  correct: number
  total: number
}

/**
 * היומן הוא היסטוריה ולא התקדמות: אף החלטה במשחק לא נשענת עליו, ולכן
 * מותר לו להיות מוגבל. הגבול עצמו מוגדר ב-merge.ts, כי שם הוא קריטי:
 * חיתוך מקומי שנפרד מהחיתוך של המיזוג היה מייצר שתי אמיתות.
 */
export { MAX_LOG }

export interface Settings {
  music: boolean
  voice: boolean
  /** קצב הדיבור באנגלית. איטי במכוון. */
  speechRate: number
  /** הצגת המילה באנגלית בכתב. כבוי כברירת מחדל, כי דניאל עדיין לא קוראת. */
  showEnglishText: boolean
  /** זיהוי דיבור בדפדפן. אופציונלי לגמרי, לעולם לא חוסם התקדמות. */
  speechRecognition: boolean
}

export interface PracticeEntry {
  id: string
  /** כמה פעמים ענתה נכון ברצף מאז הטעות. ביציאה מהתור צריך 2. */
  strikes: number
  /** באיזה סוג משימה נטעתה, כדי שהחזרה תהיה בסוג אחר. */
  missedType?: TaskType
  /** כמה משימות עוד צריכות לעבור לפני שהמילה תחזור. */
  cooldown: number
}

export interface AreaProgress {
  unlocked: boolean
  completedTasks: number
  stars: number
  done: boolean
}

/** רשימת מילים שההורה הוסיף, למשל הכתבה מבית הספר. */
export interface CustomList {
  id: string
  /** שם הרשימה כפי שההורה קרא לה. */
  title: string
  /** מזהי המילים ברשימה. מילים מותאמות נשמרות ב-customWords. */
  wordIds: string[]
  /** מתי נוצרה. */
  created: number
  /** רשימה פעילה נכנסת לתרגול המסתגל. */
  active: boolean
}

/** מילה שההורה הגדיר בעצמו, ולא קיימת במאגר הקבוע. */
export interface CustomWord {
  id: string
  english: string
  hebrew: string
  emoji: string
  /** פירוק לצלילים, אם ההורה סימן שהמילה ניתנת לפענוח. */
  sounds?: string[]
}

export interface SaveData {
  version: number
  /** תמיד GAME_ID. מזהה שהמסמך הזה הוא שמירה של הטירה ולא של משחק אחר. */
  game: string
  avatar: AvatarConfig | null
  settings: Settings
  stars: number
  wordsLearned: string[]
  correct: number
  mistakes: number
  needPractice: PracticeEntry[]
  areas: Record<string, AreaProgress>
  lastArea: string
  /**
   * שליטה לכל פריט. המפתח הוא "word:cat" או "sound:s" או "frame:x".
   * ראו mastery.ts.
   */
  stats: Record<string, ItemStat>
  /** רשימות מילים שההורה הוסיף. */
  lists: CustomList[]
  /**
   * מזהי רשימות שנמחקו. בלי המצבות האלה מיזוג בין מכשירים היה מחזיר
   * לחיים כל רשימה שנמחקה, כי המיזוג הוא איחוד.
   */
  deletedLists: string[]
  /** מילים שההורה הגדיר ואינן במאגר הקבוע. */
  customWords: CustomWord[]
  /** יומן הפעילות. ראו LogEntry. */
  log: LogEntry[]
  /**
   * מונה שינויים מקומי. עולה בכל שמירה, ומשמש את הסנכרון כדי לדעת
   * שיש כאן משהו חדש לדחוף.
   */
  revision: number
}

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  voice: true,
  speechRate: 0.75,
  showEnglishText: false,
  speechRecognition: false,
}

function freshAreas(): Record<string, AreaProgress> {
  const out: Record<string, AreaProgress> = {}
  for (const a of AREAS) {
    out[a.id] = { unlocked: a.order === 1, completedTasks: 0, stars: 0, done: false }
  }
  return out
}

export function freshSave(): SaveData {
  return {
    version: SCHEMA_VERSION,
    game: GAME_ID,
    avatar: null,
    settings: { ...DEFAULT_SETTINGS },
    stars: 0,
    wordsLearned: [],
    correct: 0,
    mistakes: 0,
    needPractice: [],
    areas: freshAreas(),
    lastArea: FIRST_AREA_ID,
    stats: {},
    lists: [],
    deletedLists: [],
    customWords: [],
    // ריק, אבל קיים. ראו LogEntry: בלי השדה הזה הסנכרון הראשון
    // ממכשיר חדש נדחה על ידי השרת.
    log: [],
    revision: 0,
  }
}

// ------------------------------------------------------------ אחסון בטוח

let storageWorks = true

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    storageWorks = false
    return null
  }
}

function writeRaw(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // מצב פרטי, אחסון מלא או חסימה. ממשיכים מהזיכרון בלבד.
    storageWorks = false
  }
}

/** האם ההתקדמות באמת נשמרת בין רענונים. */
export function isStorageAvailable(): boolean {
  return storageWorks
}

// ------------------------------------------------------------ טעינה

function migrate(raw: unknown): SaveData {
  const base = freshSave()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<SaveData>

  if (r.version !== SCHEMA_VERSION) return base

  // גרסאות מוקדמות החזיקו את הגדרות הסנכרון בתוך השמירה. מעבירים
  // אותן פעם אחת למפתח הנפרד שלהן, ומכאן והלאה השמירה לא מכילה סוד.
  adoptLegacySyncConfig((raw as { sync?: unknown }).sync)

  const areas = freshAreas()
  if (r.areas && typeof r.areas === 'object') {
    for (const a of AREAS) {
      const saved = (r.areas as Record<string, Partial<AreaProgress>>)[a.id]
      if (!saved) continue
      areas[a.id] = {
        unlocked: saved.unlocked === true || a.order === 1,
        completedTasks: numOr(saved.completedTasks, 0),
        stars: numOr(saved.stars, 0),
        done: saved.done === true,
      }
    }
  }

  return {
    version: SCHEMA_VERSION,
    game: GAME_ID,
    avatar: r.avatar ? sanitizeAvatar(r.avatar) : null,
    settings: {
      music: r.settings?.music !== false,
      voice: r.settings?.voice !== false,
      speechRate: clamp(numOr(r.settings?.speechRate, DEFAULT_SETTINGS.speechRate), 0.5, 1.1),
      showEnglishText: r.settings?.showEnglishText === true,
      speechRecognition: r.settings?.speechRecognition === true,
    },
    stars: numOr(r.stars, 0),
    wordsLearned: Array.isArray(r.wordsLearned) ? r.wordsLearned.filter((x) => typeof x === 'string') : [],
    correct: numOr(r.correct, 0),
    mistakes: numOr(r.mistakes, 0),
    needPractice: Array.isArray(r.needPractice)
      ? r.needPractice
          .filter((e): e is PracticeEntry => !!e && typeof e.id === 'string')
          .map((e) => ({ id: e.id, strikes: numOr(e.strikes, 0), missedType: e.missedType, cooldown: numOr(e.cooldown, 0) }))
      : [],
    areas,
    lastArea: typeof r.lastArea === 'string' && areas[r.lastArea] ? r.lastArea : FIRST_AREA_ID,
    // השדות הבאים נוספו אחרי שכבר שיחקו. הם נקראים בסלחנות ומקבלים
    // ברירת מחדל ריקה, ובמכוון בלי להעלות את SCHEMA_VERSION: העלאת
    // הגרסה הייתה מוחקת את כל ההתקדמות של מי שכבר משחקת.
    stats: readStats(r.stats),
    lists: readLists(r.lists),
    deletedLists: Array.isArray(r.deletedLists) ? r.deletedLists.filter((x) => typeof x === 'string') : [],
    customWords: readCustomWords(r.customWords),
    log: readLog(r.log),
    revision: numOr(r.revision, 0),
  }
}

/** קריאה סלחנית של היומן. שורה פגומה נזרקת, שאר היומן שורד. */
export function readLog(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return []
  const out: LogEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const e = item as Partial<LogEntry>
    if (typeof e.t !== 'number' || !Number.isFinite(e.t) || e.t <= 0) continue
    if (e.kind !== 'area' && e.kind !== 'practice') continue
    if (typeof e.id !== 'string' || !e.id) continue
    out.push({ t: e.t, kind: e.kind, id: e.id, correct: numOr(e.correct, 0), total: numOr(e.total, 0) })
  }
  return trimLog(out)
}

/**
 * סדר קבוע וגודל קבוע.
 *
 * הסדר לפי זמן ואז לפי מפתח, כדי ששני מכשירים שממזגים את אותן שורות
 * יקבלו בדיוק את אותו מערך - גם כשלשתי שורות יש אותה חותמת זמן.
 * החיתוך שומר את החדשות, כי חודש אחרון מעניין את ההורה יותר מהחודש
 * שלפניו, ולא מונע מהמיזוג להיות אידמפוטנטי: אותו קלט נותן תמיד
 * את אותו חיתוך.
 */
export function trimLog(entries: LogEntry[]): LogEntry[] {
  const sorted = entries.slice().sort((a, b) => a.t - b.t || logKey(a).localeCompare(logKey(b)))
  return sorted.length > MAX_LOG ? sorted.slice(sorted.length - MAX_LOG) : sorted
}

/** המפתח שלפיו שורה זהה בשני מכשירים היא שורה אחת. */
export function logKey(entry: LogEntry): string {
  return `${entry.t}:${entry.kind}:${entry.id}`
}

/** רושם ביומן שמשהו הסתיים. */
export function appendLog(entry: Omit<LogEntry, 't'> & { t?: number }): void {
  updateProgress((d) => {
    d.log = trimLog([...d.log, { ...entry, t: entry.t ?? Date.now() }])
  })
}

function readStats(raw: unknown): Record<string, ItemStat> {
  const out: Record<string, ItemStat> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const value of Object.values(raw as Record<string, unknown>)) {
    const stat = sanitizeStat(value)
    if (stat) out[stat.id] = stat
  }
  return out
}

function readLists(raw: unknown): CustomList[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((l): l is CustomList => !!l && typeof l.id === 'string' && typeof l.title === 'string')
    .map((l) => ({
      id: l.id,
      title: l.title,
      wordIds: Array.isArray(l.wordIds) ? l.wordIds.filter((x) => typeof x === 'string') : [],
      created: numOr(l.created, 0),
      active: l.active !== false,
    }))
}

function readCustomWords(raw: unknown): CustomWord[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((w): w is CustomWord => !!w && typeof w.id === 'string' && typeof w.english === 'string')
    .map((w) => ({
      id: w.id,
      english: w.english,
      hebrew: typeof w.hebrew === 'string' ? w.hebrew : '',
      emoji: typeof w.emoji === 'string' && w.emoji ? w.emoji : '🔤',
      sounds: Array.isArray(w.sounds) ? w.sounds.filter((x) => typeof x === 'string') : undefined,
    }))
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

// ------------------------------------------------------------ ה-API

let data: SaveData = freshSave()
let loaded = false
let saveTimer: number | undefined

export function loadProgress(): SaveData {
  if (loaded) return data
  const raw = readRaw()
  if (raw) {
    try {
      data = migrate(JSON.parse(raw))
    } catch {
      data = freshSave()
    }
  } else {
    data = freshSave()
  }
  loaded = true
  return data
}

export function getProgress(): SaveData {
  return loaded ? data : loadProgress()
}

/** כתיבה מושהית, כדי לא לכתוב לדיסק בכל פריים של אנימציה. */
export function scheduleSave(): void {
  if (saveTimer !== undefined) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(flushSave, 300)
}

export function flushSave(): void {
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer)
    saveTimer = undefined
  }
  writeRaw(JSON.stringify(data))
}

/** מעדכן את ההתקדמות ושומר. */
export function updateProgress(fn: (d: SaveData) => void): SaveData {
  const d = getProgress()
  fn(d)
  d.revision += 1
  scheduleSave()
  return d
}

/**
 * מחליף את השמירה כולה. משמש רק את הסנכרון, אחרי מיזוג עם השרת.
 * כל שאר הקוד עובר דרך updateProgress.
 */
export function replaceProgress(next: SaveData): SaveData {
  data = next
  loaded = true
  flushSave()
  return data
}

export function resetProgress(): SaveData {
  const avatar = getProgress().avatar
  const settings = { ...getProgress().settings }
  const lists = getProgress().lists.slice()
  const deletedLists = getProgress().deletedLists.slice()
  const customWords = getProgress().customWords.slice()
  const log = getProgress().log.slice()
  data = freshSave()
  // המראה וההגדרות נשמרים. איפוס אמור להתחיל את הלמידה מחדש, לא למחוק את הדמות.
  data.avatar = avatar
  data.settings = settings
  // הרשימות של ההורה והיומן שורדים איפוס. איפוס נועד להתחיל את הלמידה
  // מחדש, לא למחוק את ההכתבה ולא את ההיסטוריה שההורה מסתכל עליה.
  // הגדרות הסנכרון ממילא לא כאן - הן במפתח נפרד, ואיפוס לא נוגע בהן.
  data.log = log
  data.lists = lists
  data.deletedLists = deletedLists
  data.customWords = customWords
  flushSave()
  return data
}

/** מוחק הכל, כולל הדמות. משמש רק בכפתור מפורש בהגדרות. */
export function eraseEverything(): SaveData {
  data = freshSave()
  flushSave()
  return data
}

// שמירה מיידית כשעוזבים את הדף, כדי שכוכב אחרון לא ילך לאיבוד.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave()
  })
}

// ------------------------------------------------------------ קיצורי דרך

export function areaProgress(areaId: string): AreaProgress {
  const d = getProgress()
  if (!d.areas[areaId]) {
    d.areas[areaId] = { unlocked: false, completedTasks: 0, stars: 0, done: false }
  }
  return d.areas[areaId]
}

export function unlockArea(areaId: string): void {
  updateProgress((d) => {
    if (d.areas[areaId]) d.areas[areaId].unlocked = true
  })
}

export function addStars(n: number, areaId: string): void {
  updateProgress((d) => {
    d.stars += n
    if (d.areas[areaId]) d.areas[areaId].stars += n
  })
}

export function markWordLearned(wordId: string): void {
  updateProgress((d) => {
    if (!d.wordsLearned.includes(wordId)) d.wordsLearned.push(wordId)
  })
}

export function saveAvatar(avatar: AvatarConfig): void {
  updateProgress((d) => {
    d.avatar = avatar
  })
  flushSave()
}

export function saveSettings(settings: Partial<Settings>): Settings {
  const d = updateProgress((s) => {
    s.settings = { ...s.settings, ...settings }
  })
  flushSave()
  return d.settings
}
