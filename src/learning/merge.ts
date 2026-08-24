/**
 * מיזוג שתי שמירות.
 *
 * זה הלב של המשחק בכמה מכשירים. דניאל משחקת היום ב-iPad ומחר בטלפון,
 * ולפעמים גם בלי רשת. השאלה היחידה שחשובה כאן היא: מה קורה כששתי
 * גרסאות של ההתקדמות נפגשות.
 *
 * התשובה הרווחת היא "האחרון מנצח", והיא שגויה כאן: היא מוחקת שעה של
 * משחק רק כי המכשיר השני עלה לרשת אחריו. ילדה שתאבד ערב שלם של
 * התקדמות לא תחזור למשחק, ובצדק.
 *
 * מה שמאפשר לעשות טוב יותר הוא שכמעט כל הנתונים כאן מונוטוניים: מונים
 * שרק עולים, ודגלים שרק נדלקים. כוכבים לא יורדים, אזור שנפתח לא נסגר,
 * ומילה שנלמדה לא נשכחת מהרשימה. לנתון מונוטוני יש מיזוג טבעי - מקסימום
 * לכל מונה, איחוד לכל אוסף - והוא לא מאבד כלום ולא סופר כלום פעמיים.
 *
 * מה שאינו מונוטוני הוא קטן ומוגדר: המראה, ההגדרות והאזור האחרון.
 * שם, ורק שם, הגרסה החדשה מנצחת.
 *
 * הקובץ הזה משותף ללקוח ולשרת בכוונה. שתי מימושים של מיזוג שנפרדים
 * זה מזה הם בדיוק הדרך לאבד נתונים בלי לשים לב.
 */

/**
 * הטיפוסים כאן מוגדרים מקומית ולא מיובאים מ-progress.ts, וזה מכוון.
 *
 * הקובץ הזה נבנה גם לשרת, שרץ ב-Node בלי DOM. ייבוא מ-progress.ts
 * היה גורר לבנייה של השרת את כל שרשרת הקבצים של המשחק, על ה-DOM
 * ועל Three.js שבקצה שלה. מבנה מקומי שמתאר רק את מה שהמיזוג באמת
 * נוגע בו משאיר את הקובץ עצמאי, ו-SaveData מתאים לו מבנית.
 */

export interface MergeableStat {
  id: string
  kind: string
  seen: number
  correct: number
  wrong: number
  streak: number
  bestStreak: number
  last: number
  lastCorrect: number
}

export interface MergeableList {
  id: string
  title: string
  wordIds: string[]
  created: number
  active: boolean
}

export interface MergeableWord {
  id: string
  english: string
  hebrew: string
  emoji: string
  sounds?: string[]
}

export interface MergeableLogEntry {
  t: number
  kind: 'area' | 'practice'
  id: string
  correct: number
  total: number
}

/**
 * כמה שורות יומן שומרים.
 *
 * הקבוע הזה מוגדר כאן ולא ב-progress.ts כי המיזוג הוא זה שחייב לחתוך
 * בדיוק כמו הכתיבה המקומית. שני מספרים שנפרדים זה מזה היו גורמים לשני
 * מכשירים להתכנס לשתי תשובות שונות ולכתוב זה על זה בלי סוף.
 */
export const MAX_LOG = 300

export interface MergeableSave {
  version: number
  game?: string
  // avatar ו-settings אטומים למיזוג: הוא לא נכנס לתוכן שלהם אלא
  // בוחר את אחד השניים כמכלול, ולכן טיפוס רחב כאן הוא הנכון.
  avatar: unknown
  settings: unknown
  stars: number
  wordsLearned: string[]
  correct: number
  mistakes: number
  needPractice: { id: string; strikes: number; cooldown: number; missedType?: string }[]
  areas: Record<string, { unlocked: boolean; completedTasks: number; stars: number; done: boolean }>
  lastArea: string
  stats: Record<string, MergeableStat>
  lists: MergeableList[]
  deletedLists: string[]
  customWords: MergeableWord[]
  log: MergeableLogEntry[]
  scenesSeen: string[]
  revision: number
}

type ItemStat = MergeableStat
type CustomList = MergeableList
type CustomWord = MergeableWord
type SaveData = MergeableSave

/**
 * מתי השמירה עודכנה. משמש רק לשדות שאינם מונוטוניים.
 *
 * נגזר מהתוכן עצמו ולא מזמן הסנכרון, כי זמן הסנכרון שייך למכשיר ולא
 * לשמירה: מכשיר ריק שסנכרן לפני דקה אינו עדכני יותר ממכשיר שדניאל
 * שיחקה בו אתמול שעה שלמה.
 */
export function stampOf(save: SaveData): number {
  return latestActivity(save)
}

/** הפעילות האחרונה שנרשמה בשמירה. */
function latestActivity(save: SaveData): number {
  let latest = 0
  for (const stat of Object.values(save.stats ?? {})) {
    if (stat.last > latest) latest = stat.last
  }
  for (const list of save.lists ?? []) {
    if (list.created > latest) latest = list.created
  }
  for (const entry of save.log ?? []) {
    if (entry.t > latest) latest = entry.t
  }
  return latest
}

/**
 * איחוד שני יומנים.
 *
 * המפתח הוא שעה, סוג ומזהה - שלושתם נקבעים ברגע שהשורה נוצרת ולא
 * משתנים אחר כך. לכן אותה שורה שהגיעה משני מכשירים היא שורה אחת,
 * וסנכרון חוזר לא מכפיל כלום. הוא לא תלוי בשעון של המכשיר שממזג
 * עכשיו, וזה מה שהופך את הפעולה לאידמפוטנטית באמת.
 *
 * המיון והחיתוך זהים לאלה שב-progress.ts בכוונה: שני מכשירים שממזגים
 * את אותן שורות חייבים לקבל בדיוק את אותו מערך, אחרת כל אחד היה כותב
 * גרסה מעט שונה בסנכרון הבא, לנצח.
 */
function mergeLog(a: MergeableLogEntry[] | undefined, b: MergeableLogEntry[] | undefined): MergeableLogEntry[] {
  const seen = new Map<string, MergeableLogEntry>()
  for (const entry of [...(a ?? []), ...(b ?? [])]) {
    if (!entry || typeof entry.t !== 'number') continue
    const key = `${entry.t}:${entry.kind}:${entry.id}`
    if (!seen.has(key)) seen.set(key, entry)
  }
  const sorted = Array.from(seen.entries())
    .sort((x, y) => x[1].t - y[1].t || x[0].localeCompare(y[0]))
    .map(([, entry]) => entry)
  return sorted.length > MAX_LOG ? sorted.slice(sorted.length - MAX_LOG) : sorted
}

function maxNum(a: number | undefined, b: number | undefined): number {
  return Math.max(typeof a === 'number' && Number.isFinite(a) ? a : 0, typeof b === 'number' && Number.isFinite(b) ? b : 0)
}

function union(a: readonly string[] | undefined, b: readonly string[] | undefined): string[] {
  return Array.from(new Set([...(a ?? []), ...(b ?? [])]))
}

/**
 * מיזוג שני מדדי שליטה של אותו פריט.
 *
 * המונים נלקחים במקסימום ולא בסכום, וזה מכוון: אין דרך לדעת אם שני
 * המכשירים ספרו את אותם מפגשים או מפגשים שונים, וסכימה הייתה מנפחת
 * את המספרים בכל סנכרון. מקסימום אף פעם לא מנפח ואף פעם לא מוחק.
 *
 * הרצף נלקח מהעדכני מבין השניים, כי רצף הוא מצב רגעי ולא מונה:
 * אם במכשיר האחרון היא טעתה, הרצף באמת נשבר.
 */
export function mergeStat(a: ItemStat | undefined, b: ItemStat | undefined): ItemStat | undefined {
  if (!a) return b
  if (!b) return a
  const newer = a.last >= b.last ? a : b
  return {
    id: a.id,
    kind: a.kind,
    seen: maxNum(a.seen, b.seen),
    correct: maxNum(a.correct, b.correct),
    wrong: maxNum(a.wrong, b.wrong),
    streak: newer.streak,
    bestStreak: maxNum(a.bestStreak, b.bestStreak),
    last: maxNum(a.last, b.last),
    lastCorrect: maxNum(a.lastCorrect, b.lastCorrect),
  }
}

function mergeStats(a: Record<string, ItemStat>, b: Record<string, ItemStat>): Record<string, ItemStat> {
  const out: Record<string, ItemStat> = {}
  for (const key of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const merged = mergeStat(a?.[key], b?.[key])
    if (merged) out[key] = merged
  }
  return out
}

function mergeLists(a: SaveData, b: SaveData): { lists: CustomList[]; deletedLists: string[] } {
  const deleted = new Set(union(a.deletedLists, b.deletedLists))
  const byId = new Map<string, CustomList>()
  for (const list of [...(a.lists ?? []), ...(b.lists ?? [])]) {
    if (deleted.has(list.id)) continue
    const existing = byId.get(list.id)
    if (!existing) {
      byId.set(list.id, { ...list })
      continue
    }
    // רשימה שקיימת בשני המכשירים: איחוד המילים, וכיבוי מנצח הדלקה
    // כי כיבוי הוא פעולה מכוונת של ההורה ואילו דלוק הוא ברירת המחדל.
    byId.set(list.id, {
      ...existing,
      wordIds: union(existing.wordIds, list.wordIds),
      active: existing.active && list.active,
      created: pickCreated(existing.created, list.created),
    })
  }
  return { lists: Array.from(byId.values()), deletedLists: Array.from(deleted) }
}

/** התאריך המוקדם מבין השניים, כשאחד מהם עשוי להיות חסר. */
function pickCreated(a: number, b: number): number {
  if (!a) return b || 0
  if (!b) return a
  return Math.min(a, b)
}

function mergeCustomWords(a: CustomWord[], b: CustomWord[], keepIds: Set<string>): CustomWord[] {
  const byId = new Map<string, CustomWord>()
  for (const word of [...(a ?? []), ...(b ?? [])]) {
    if (!keepIds.has(word.id)) continue
    if (!byId.has(word.id)) byId.set(word.id, word)
  }
  return Array.from(byId.values())
}

/**
 * ממזג שתי שמירות לשמירה אחת שלא מאבדת כלום.
 *
 * על החלק המונוטוני - כוכבים, אזורים, שליטה, מילים שנלמדו - הפעולה
 * קומוטטיבית ואידמפוטנטית: הסדר לא משנה, ומיזוג חוזר לא מזיז כלום.
 * שתי התכונות האלה הן מה שמאפשר לסנכרן שוב ושוב בלי שהמספרים יזחלו
 * למעלה, ויש להן בדיקות עצמיות.
 *
 * על החלק שאינו מונוטוני - מראה, הגדרות והאזור האחרון - העדכני מנצח,
 * ובתיקו מנצח הארגומנט הראשון, כלומר המכשיר שיזם את הסנכרון. שם
 * הסדר כן משנה, וזו הכרעה מכוונת: אין דרך למזג שתי בחירות של צבע שיער.
 *
 * הגדרות הסנכרון עצמן אף פעם לא נמזגות. הן שייכות למכשיר.
 */
export function mergeSaves<T extends MergeableSave>(a: T, b: T): T {
  const aNewer = stampOf(a) >= stampOf(b)
  const newer = aNewer ? a : b

  const areas: SaveData['areas'] = {}
  for (const id of new Set([...Object.keys(a.areas ?? {}), ...Object.keys(b.areas ?? {})])) {
    const x = a.areas?.[id]
    const y = b.areas?.[id]
    // סדר השדות זהה להגדרת AreaProgress בכוונה. המסמך הזה נשמר כ-JSON
    // בשרת, ומיזוג שמשנה רק את סדר המפתחות היה מייצר כתיבה חדשה
    // ו-diff מלוכלך בכל סנכרון, גם כשבפועל שום דבר לא השתנה.
    areas[id] = {
      unlocked: !!x?.unlocked || !!y?.unlocked,
      completedTasks: maxNum(x?.completedTasks, y?.completedTasks),
      stars: maxNum(x?.stars, y?.stars),
      done: !!x?.done || !!y?.done,
    }
  }

  const { lists, deletedLists } = mergeLists(a, b)
  const keepWordIds = new Set(lists.flatMap((l) => l.wordIds))

  // תור החזרה מאוחד לפי מזהה. הערך העיקש יותר מנצח, כי אם מכשיר אחד
  // עדיין חושב שצריך לתרגל את המילה, עדיף לתרגל אותה פעם מיותרת
  // מאשר לוותר על חיזוק שהיה נחוץ.
  const practice = new Map<string, SaveData['needPractice'][number]>()
  for (const entry of [...(a.needPractice ?? []), ...(b.needPractice ?? [])]) {
    const existing = practice.get(entry.id)
    if (!existing || entry.strikes < existing.strikes) practice.set(entry.id, entry)
  }

  return {
    version: a.version,
    game: a.game ?? b.game,
    // לא מונוטוניים: העדכני מנצח.
    avatar: newer.avatar ?? a.avatar ?? b.avatar,
    settings: newer.settings,
    lastArea: newer.lastArea,

    // מונוטוניים: אף פעם לא יורדים.
    stars: maxNum(a.stars, b.stars),
    correct: maxNum(a.correct, b.correct),
    mistakes: maxNum(a.mistakes, b.mistakes),
    wordsLearned: union(a.wordsLearned, b.wordsLearned),
    areas,
    stats: mergeStats(a.stats ?? {}, b.stats ?? {}),
    needPractice: Array.from(practice.values()),

    lists,
    deletedLists,
    customWords: mergeCustomWords(a.customWords ?? [], b.customWords ?? [], keepWordIds),
    log: mergeLog(a.log, b.log),
    // סצנה שנראתה במכשיר אחד נחשבת שנראתה. איחוד, כמו כל דגל שרק נדלק.
    scenesSeen: union(a.scenesSeen, b.scenesSeen),

    // הגדרות הסנכרון אינן כאן ואף פעם לא ימוזגו: הן שייכות למכשיר,
    // ויושבות במפתח localStorage נפרד. ראו syncConfig.ts.
    revision: maxNum(a.revision, b.revision),
  } as T
}
