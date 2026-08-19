/**
 * סנכרון בין מכשירים.
 *
 * המטרה: דניאל משחקת היום ב-iPad, מחר בטלפון ומחרתיים במחשב, וכל
 * ההתקדמות נמצאת בכל מקום.
 *
 * העיצוב נגזר מהמגבלה החשובה ביותר: זו ילדה בת שמונה, ואסור שיהיה כאן
 * חשבון, סיסמה, אימייל או שם. לכן אין הרשמה ואין התחברות. יש **קוד
 * משפחה** - מחרוזת אקראית שנוצרת פעם אחת ומוקלדת פעם אחת בכל מכשיר.
 * השרת לא יודע מי זו דניאל, בן כמה היא ואיפה היא גרה. הוא מחזיק
 * מסמך התקדמות אחד לכל קוד, וזה הכל.
 *
 * השרת הוא קופסה טיפשה במכוון: מקבל שמירה, מחזיר שמירה, ולא ממזג
 * כלום. כל התבונה כאן, ובפרט ב-merge.ts, ויש לה בדיקות. שתי מימושים
 * של מיזוג שנפרדים זה מזה הם בדיוק הדרך לאבד נתונים בלי לשים לב.
 *
 * שלושה כללים שלא נשברים:
 *
 * 1. **המשחק חייב לעבוד בלי רשת.** אם אין שרת, אם אין קוד, אם הרשת
 *    נפלה או אם השרת מחזיר שגיאה - שום דבר לא נעצר ושום דבר לא נמחק.
 *    השמירה המקומית נשארת מקור האמת, והסנכרון הוא שכבה מעליה.
 * 2. **סנכרון לא מוחק.** אף פעם לא מחליפים את השמירה המקומית בזו של
 *    השרת. תמיד ממזגים. כל סנכרון הוא קרא, מזג, כתוב - ולכן לא משנה
 *    מי סנכרן ראשון, מי היה מנותק שבוע, ואם אותו סנכרון רץ פעמיים.
 * 3. **כל מסלול נגמר במשפט בעברית.** גם כשלון. כפתור שלא אומר כלום
 *    נראה שבור, וההורה שעומד מול הטאבלט מסיק שהמשחק אבד.
 */

import { mergeSaves } from './merge'
import { flushSave, getProgress, replaceProgress, GAME_ID, type SaveData } from './progress'
import { readSyncConfig, syncConfigured, writeSyncConfig, type SyncConfig } from './syncConfig'
import { syncCustomWords } from './wordbank'

/** כמה זמן מחכים לשרת לפני שמוותרים וממשיכים מקומית. */
const TIMEOUT_MS = 9000

export type SyncState = 'off' | 'idle' | 'working' | 'ok' | 'error'

export interface SyncResult {
  state: SyncState
  /** הודעה בעברית להצגה. תמיד מלאה, גם בכשלון. */
  message: string
  /** מתי הסתיים סנכרון מוצלח. */
  at?: number
}

const OFF_MESSAGE = 'המשחק שומר על המכשיר הזה בלבד'

let lastResult: SyncResult = { state: 'off', message: OFF_MESSAGE }
const listeners = new Set<(r: SyncResult) => void>()

export function syncState(): SyncResult {
  return lastResult
}

export function onSyncChange(fn: (r: SyncResult) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setState(next: SyncResult): SyncResult {
  lastResult = next
  for (const fn of listeners) fn(next)
  return next
}

// ---------------------------------------------------------------- הגדרות

export function isConfigured(config: SyncConfig = readSyncConfig()): boolean {
  return syncConfigured(config)
}

export function syncConfig(): SyncConfig {
  return readSyncConfig()
}

/**
 * מייצר קוד משפחה חדש.
 *
 * הקוד הוא הסוד היחיד שמגן על הנתונים, ולכן הוא ארוך: 20 תווים
 * מאלפבית של 28 אותיות הם בערך 96 ביט של אקראיות, ואי אפשר לנחש
 * אותו. הוא לא מכיל תנועות, כדי שלא ייווצרו בטעות מילים,
 * ולא מכיל 0, O, 1 ו-I כדי שאפשר יהיה להקליד אותו מדף.
 *
 * המקטעים מופרדים במקף, שהשרת מקבל כתו חוקי בקוד. זה נועד לעין
 * אנושית שמעתיקה אותו למכשיר שני.
 */
export function newFamilyCode(): string {
  const alphabet = '23456789BCDFGHJKLMNPQRSTVWXZ'
  const bytes = new Uint8Array(20)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 5 === 0) out += '-'
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

/**
 * אותה בדיקה שהשרת עושה, לפני שמטריחים אותו.
 *
 * קוד קצר מדי או עם תווים שהשרת לא מקבל היה חוזר כשגיאת HTTP סתומה,
 * ואילו כאן אפשר להגיד להורה מה בדיוק לא בסדר.
 */
export function validCode(code: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(cleanCode(code))
}

export function validUrl(url: string): boolean {
  try {
    const u = new URL(normalizeUrl(url))
    // http רגיל ייחסם ממילא בדפדפן ברגע שהמשחק מוגש ב-https. עדיף
    // להגיד את זה כאן מאשר להיכשל בהמשך בלי הסבר.
    return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/** מנקה כתובת שרת שההורה הדביק. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

/** מנקה קוד שהודבק: רווחים ותווים נסתרים יוצאים, האותיות עולות לגדולות. */
function cleanCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

export function saveSyncConfig(url: string, code: string): SyncConfig {
  const next = writeSyncConfig({ url: normalizeUrl(url), code: cleanCode(code), lastError: '' })
  setState(
    isConfigured(next)
      ? { state: 'idle', message: 'מחובר. הסנכרון יקרה בכניסה וביציאה מהמשחק' }
      : { state: 'off', message: OFF_MESSAGE },
  )
  return next
}

// ---------------------------------------------------------------- רשת

/**
 * הקוד נשלח כפרמטר שאילתה, כי זה מה שהשרת מצפה לו.
 *
 * הכתובת מוגשת תמיד ב-https, כלומר הפרמטר מוצפן בדרך ככל שאר הבקשה.
 * הוא כן עלול להופיע ביומני שרת, וזו הסיבה שהשרת שומר לפי גיבוב של
 * הקוד ולא לפי הקוד עצמו.
 */
function endpoint(config: SyncConfig): string {
  const u = new URL(config.url)
  u.searchParams.set('code', config.code)
  return u.toString()
}

interface Envelope {
  save: SaveData | null
  updatedAt: string | null
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, cache: 'no-store', signal: controller.signal })
    const text = await res.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    if (!res.ok) {
      const stated = body && typeof body === 'object' ? (body as { error?: string }).error : undefined
      throw new Error(stated ?? `HTTP ${res.status}`)
    }
    if (body === null) throw new Error('the server did not answer with JSON')
    return body
  } finally {
    clearTimeout(timer)
  }
}

/**
 * מתרגם כשלון למשפט שאפשר לפעול לפיו.
 *
 * זו לא קוסמטיקה. ההבדל בין "אין רשת" לבין "הקוד לא נכון" הוא ההבדל
 * בין לחכות רגע לבין להקליד מחדש, ובלי המשפט הזה ההורה לא יכול לדעת
 * במה מדובר.
 */
export function explainSyncFailure(reason: string): string {
  const r = reason.toLowerCase()
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'אין רשת כרגע. הכל נשמר על המכשיר, והסנכרון יקרה מעצמו כשהרשת תחזור.'
  }
  if (r.includes('timeout') || r.includes('abort')) {
    return 'השרת לא ענה בזמן. ההתקדמות בטוחה על המכשיר - כדאי לנסות שוב עוד רגע.'
  }
  if (r.includes('failed to fetch') || r.includes('networkerror') || r.includes('load failed')) {
    return 'לא הצלחתי להגיע לשרת. בדקי שהכתובת נכונה ומתחילה ב-https, ושיש רשת.'
  }
  if (r.includes('bad code')) {
    return 'השרת לא מקבל את הקוד הזה. קוד תקין הוא לפחות 16 תווים, אותיות וספרות בלבד. אפשר ללחוץ "לייצר קוד חדש".'
  }
  if (r.includes('not a game save')) {
    return 'השרת דחה את השמירה. זה מצב שלא אמור לקרות - כדאי לרענן את הדף ולנסות שוב.'
  }
  if (r.includes('too large')) {
    return 'השמירה גדולה מדי לשרת. זה לא אמור לקרות, וכדאי לספר לי.'
  }
  if (r.includes('404')) {
    return 'הכתובת עונה, אבל לא בנקודה הזאת. כדאי לבדוק שהעתקת את כל הכתובת של השרת.'
  }
  if (r.includes('405')) {
    return 'הכתובת הזאת לא מקבלת שמירות. כנראה זו כתובת של אתר רגיל ולא של שרת הסנכרון.'
  }
  return `הסנכרון נכשל: ${reason}. ההתקדמות שלמה על המכשיר הזה, ואפשר לנסות שוב.`
}

function reasonOf(err: unknown): string {
  if (err instanceof Error) return err.name === 'AbortError' ? 'timeout' : err.message || 'failed'
  return String(err)
}

/** האם המסמך שחזר מהשרת הוא בכלל שמירה של המשחק הזה. */
function looksLikeOurSave(save: unknown): save is SaveData {
  if (!save || typeof save !== 'object') return false
  const s = save as Partial<SaveData>
  return s.game === GAME_ID && typeof s.version === 'number' && Array.isArray(s.log)
}

/**
 * מה שיש עכשיו בשרת, בלי לכתוב כלום.
 *
 * זה הכלי שמונע את הבהלה. הורה שפותח את המשחק במכשיר שדניאל לא שיחקה
 * בו רואה מסך ריק, ובלי הקריאה הזאת הוא לא יכול להבחין בין "המכשיר
 * הזה עוד לא סונכרן" לבין "הכל נמחק". שתי האפשרויות נראות זהות, ורק
 * אחת מהן מפחידה.
 */
export async function peekServer(): Promise<
  { ok: true; save: SaveData | null; updatedAt: string | null } | { ok: false; message: string }
> {
  const config = readSyncConfig()
  if (!isConfigured(config)) return { ok: false, message: 'עוד אין כתובת שרת וקוד משפחה, אז אין מה להשוות.' }
  try {
    const body = (await request(endpoint(config), { method: 'GET', headers: { accept: 'application/json' } })) as Envelope
    const save = body.save ?? null
    if (save && !looksLikeOurSave(save)) {
      return { ok: false, message: 'בקוד הזה שמורה התקדמות של משחק אחר. כדאי לייצר קוד חדש לטירה, כדי ששני המשחקים לא ידרסו זה את זה.' }
    }
    return { ok: true, save, updatedAt: body.updatedAt ?? null }
  } catch (err) {
    return { ok: false, message: explainSyncFailure(reasonOf(err)) }
  }
}

/** תיאור של שמירה בשורה אחת, כדי להשוות שני צדדים במבט. */
export function describeSave(save: SaveData | null): string | null {
  if (!save) return null
  const areasDone = Object.values(save.areas ?? {}).filter((a) => a?.done).length
  return [
    count(save.stars ?? 0, 'כוכב אחד', 'כוכבים'),
    count((save.wordsLearned ?? []).length, 'מילה אחת', 'מילים'),
    count(areasDone, 'אזור אחד', 'אזורים'),
    count((save.log ?? []).length, 'סבב אחד', 'סבבים'),
  ].join(' · ')
}

/** עברית תקינה גם כשהמספר הוא אחד. ההורה קורא את זה, לא מכונה. */
function count(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n} ${many}`
}

/**
 * מסנכרן עכשיו: מושכים מהשרת, ממזגים, ודוחפים בחזרה.
 *
 * הסדר חשוב. משיכה לפני דחיפה מבטיחה שמה שנעשה במכשיר אחר ייכנס
 * לתוך המיזוג, ודחיפה של התוצאה הממוזגת מבטיחה ששני המכשירים
 * יתכנסו לאותה תמונה. דוחפים תמיד, גם כשלא הגיע כלום חדש: אולי
 * דווקא המכשיר השני הוא זה שמפגר, והכתיבה היא מה שמתקן את זה.
 */
export async function syncNow(): Promise<SyncResult> {
  const config = readSyncConfig()
  if (!isConfigured(config)) return setState({ state: 'off', message: OFF_MESSAGE })
  if (!validCode(config.code)) {
    return setState({ state: 'error', message: explainSyncFailure('bad code') })
  }

  setState({ state: 'working', message: 'מסנכרן…' })

  try {
    const local = getProgress()
    let merged = local

    const body = (await request(endpoint(config), { method: 'GET', headers: { accept: 'application/json' } })) as Envelope
    const remote = body.save ?? null
    if (remote) {
      // תא שמכיל משהו אחר - למשל אותו קוד שהוקלד בטעות בשני משחקים -
      // לא נדרס. עדיף להיעצר ולהסביר מאשר למחוק משחק אחר.
      if (!looksLikeOurSave(remote)) {
        const message = 'בקוד הזה שמורה התקדמות של משחק אחר, אז לא כתבתי עליה כלום. כדאי לייצר קוד חדש לטירה.'
        writeSyncConfig({ lastError: message })
        return setState({ state: 'error', message })
      }
      merged = mergeSaves(local, remote)
    }

    replaceProgress(merged)
    syncCustomWords(merged)

    await request(endpoint(config), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(merged),
    })

    const now = Date.now()
    writeSyncConfig({ lastAt: now, lastError: '' })
    const gained = merged.wordsLearned.length - local.wordsLearned.length
    return setState({
      state: 'ok',
      message: remote
        ? gained > 0
          ? `הכל מסונכרן. ירדו לכאן ${gained} מילים מהמכשיר השני.`
          : 'הכל מסונכרן. שני המכשירים מציגים עכשיו את אותה התקדמות.'
        : 'הכל מסונכרן. זו ההתקדמות הראשונה שנשמרת בשרת עם הקוד הזה.',
      at: now,
    })
  } catch (err) {
    // כישלון סנכרון אינו כישלון של המשחק. ההתקדמות המקומית שלמה,
    // והניסיון הבא יתפוס את מה שלא הספיק לעלות.
    const message = explainSyncFailure(reasonOf(err))
    writeSyncConfig({ lastError: message })
    return setState({ state: 'error', message })
  }
}

/**
 * בודק שהכתובת והקוד עובדים, בלי לגעת בנתונים.
 *
 * מקבל את מה שעל המסך ולא את מה שנשמר, כי הורה שלוחץ "לבדוק" מתכוון
 * למה שהוא רואה מולו.
 */
export async function testConnection(url: string, code: string): Promise<{ ok: boolean; message: string }> {
  const cleanUrl = normalizeUrl(url)
  const code2 = cleanCode(code)
  if (!cleanUrl || !code2) return { ok: false, message: 'צריך גם כתובת שרת וגם קוד משפחה.' }
  if (!validUrl(cleanUrl)) return { ok: false, message: 'הכתובת לא נראית תקינה. היא צריכה להתחיל ב-https.' }
  if (!validCode(code2)) return { ok: false, message: explainSyncFailure('bad code') }

  try {
    const body = (await request(endpoint({ url: cleanUrl, code: code2, lastAt: 0, lastError: '' }), {
      method: 'GET',
      headers: { accept: 'application/json' },
    })) as Envelope
    if (!body.save) return { ok: true, message: 'השרת עונה, והקוד הזה עוד ריק. הסנכרון הראשון ימלא אותו.' }
    if (!looksLikeOurSave(body.save)) {
      return { ok: false, message: 'השרת עונה, אבל בקוד הזה שמור משחק אחר. כדאי לייצר קוד חדש לטירה.' }
    }
    return { ok: true, message: `השרת עונה. שמורה שם התקדמות: ${describeSave(body.save)}.` }
  } catch (err) {
    return { ok: false, message: explainSyncFailure(reasonOf(err)) }
  }
}

// ---------------------------------------------------------------- הפעלה

let started = false

/**
 * מחבר את הסנכרון למחזור החיים של הדף.
 *
 * מסנכרנים בעלייה, בכל חזרה ללשונית, וכשהדף נעלם. אין כאן טיימר
 * שרץ ברקע: ילדה שמשחקת רבע שעה לא צריכה עשרים בקשות רשת, וזה
 * גם מבזבז סוללה של טאבלט.
 */
export function startSync(): void {
  if (started || typeof window === 'undefined') return
  started = true

  if (isConfigured()) {
    setState({ state: 'idle', message: 'מחובר. הסנכרון יקרה בכניסה וביציאה מהמשחק' })
    void syncNow()
  }

  document.addEventListener('visibilitychange', () => {
    if (!isConfigured()) return
    if (document.visibilityState === 'visible') void syncNow()
    else flushToServer()
  })

  window.addEventListener('online', () => {
    if (isConfigured()) void syncNow()
  })
}

/**
 * דחיפה מהירה לפני שהדף נעלם.
 *
 * משתמשים ב-sendBeacon כי fetch רגיל מבוטל כשסוגרים לשונית, ובדיוק
 * אז חשוב לא לאבד את הסבב האחרון.
 *
 * הדחיפה הזאת עיוורת: היא לא מושכת קודם ולא ממזגת, כי אין לה זמן.
 * מה שמגן עליה הוא שהיא נשלחת רק אחרי סנכרון מלא באותה טעינה, כלומר
 * מה שהיא דוחפת הוא כבר תוצאה של מיזוג. גם אם מכשיר אחר כתב בינתיים,
 * הסנכרון הבא של אותו מכשיר יאסוף את שני הצדדים - זו בדיוק הסיבה
 * שהמיזוג נבנה כך שהסדר לא משנה.
 */
export function flushToServer(): void {
  const config = readSyncConfig()
  if (!isConfigured(config) || !validCode(config.code)) return
  flushSave()
  const save = getProgress()
  const body = JSON.stringify(save)
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint(config), new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    /* ממשיכים לניסיון הרגיל */
  }
  void request(endpoint(config), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  }).catch(() => undefined)
}

/**
 * מנתק את המכשיר הזה מהשרת.
 *
 * מוחק רק את ההגדרה המקומית. ההתקדמות בשרת נשארת שלמה, וגם המקומית -
 * ניתוק הוא לא מחיקה, ולא נכון שהורה שרוצה להפסיק לסנכרן יאבד משהו.
 */
export function disconnectSync(): void {
  writeSyncConfig({ url: '', code: '', lastError: '' })
  setState({ state: 'off', message: 'המכשיר הזה מנותק. ההתקדמות נשארה כאן וגם בשרת.' })
}
