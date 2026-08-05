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
 * שני כללים שלא נשברים:
 *
 * 1. **המשחק חייב לעבוד בלי רשת.** אם אין שרת, אם אין קוד, אם הרשת
 *    נפלה או אם השרת מחזיר שגיאה - שום דבר לא נעצר ושום דבר לא נמחק.
 *    השמירה המקומית נשארת מקור האמת, והסנכרון הוא שכבה מעליה.
 * 2. **סנכרון לא מוחק.** אף פעם לא מחליפים את השמירה המקומית בזו של
 *    השרת. תמיד ממזגים. ראו merge.ts.
 */

import { mergeSaves } from './merge'
import { flushSave, getProgress, replaceProgress, updateProgress, type SaveData, type SyncConfig } from './progress'
import { syncCustomWords } from './wordbank'

/** כמה זמן מחכים לשרת לפני שמוותרים וממשיכים מקומית. */
const TIMEOUT_MS = 8000

export type SyncState = 'off' | 'idle' | 'working' | 'ok' | 'error'

export interface SyncResult {
  state: SyncState
  /** הודעה בעברית להצגה. */
  message: string
  /** מתי הסתיים סנכרון מוצלח. */
  at?: number
}

let lastResult: SyncResult = { state: 'off', message: 'המשחק שומר על המכשיר הזה בלבד' }
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

export function isConfigured(config: SyncConfig = getProgress().sync): boolean {
  return config.url.trim().length > 0 && config.code.trim().length > 0
}

/**
 * מייצר קוד משפחה חדש.
 *
 * הקוד הוא הסוד היחיד שמגן על הנתונים, ולכן הוא ארוך: 20 תווים
 * מאלפבית של 32 אותיות הם בערך 100 ביט של אקראיות, ואי אפשר לנחש
 * אותו. הוא לא מכיל תנועות, כדי שלא ייווצרו בטעות מילים,
 * ולא מכיל 0, O, 1 ו-I כדי שאפשר יהיה להקליד אותו מדף.
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

/** מנקה כתובת שרת שההורה הדביק. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

export function saveSyncConfig(url: string, code: string): SyncConfig {
  const next = { url: normalizeUrl(url), code: code.trim().toUpperCase(), lastSync: getProgress().sync.lastSync }
  updateProgress((save) => {
    save.sync = next
  })
  flushSave()
  setState(
    isConfigured(next)
      ? { state: 'idle', message: 'מחובר. הסנכרון יקרה בכניסה וביציאה מהמשחק' }
      : { state: 'off', message: 'המשחק שומר על המכשיר הזה בלבד' },
  )
  return next
}

// ---------------------------------------------------------------- רשת

function endpoint(config: SyncConfig): string {
  return `${config.url}/save/${encodeURIComponent(config.code)}`
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * מסנכרן עכשיו: מושכים מהשרת, ממזגים, ודוחפים בחזרה.
 *
 * הסדר חשוב. משיכה לפני דחיפה מבטיחה שמה שנעשה במכשיר אחר ייכנס
 * לתוך המיזוג, ודחיפה של התוצאה הממוזגת מבטיחה ששני המכשירים
 * יתכנסו לאותה תמונה.
 */
export async function syncNow(): Promise<SyncResult> {
  const local = getProgress()
  const config = local.sync
  if (!isConfigured(config)) {
    return setState({ state: 'off', message: 'המשחק שומר על המכשיר הזה בלבד' })
  }

  setState({ state: 'working', message: 'מסנכרן…' })

  try {
    let merged = local

    const pulled = await request(endpoint(config), { method: 'GET', headers: { accept: 'application/json' } })
    if (pulled.ok) {
      const remote = (await pulled.json()) as Partial<SaveData> | null
      if (remote && typeof remote === 'object' && remote.version === local.version) {
        merged = mergeSaves(local, remote as SaveData)
      }
    } else if (pulled.status !== 404) {
      // 404 פירושו שהקוד עוד לא נשמר בשרת, וזה מצב תקין בהתחברות ראשונה.
      throw new Error(`server said ${pulled.status}`)
    }

    const now = Date.now()
    merged.sync = { ...config, lastSync: now }
    replaceProgress(merged)
    syncCustomWords(merged)

    const pushed = await request(endpoint(config), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(merged),
    })
    if (!pushed.ok) throw new Error(`server said ${pushed.status}`)

    return setState({ state: 'ok', message: 'הכל מסונכרן', at: now })
  } catch (err) {
    // כישלון סנכרון אינו כישלון של המשחק. ההתקדמות המקומית שלמה,
    // והניסיון הבא יתפוס את מה שלא הספיק לעלות.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return setState({
      state: 'error',
      message: offline
        ? 'אין רשת כרגע. הכל נשמר על המכשיר ויסונכרן בפעם הבאה'
        : `לא הצלחתי להתחבר לשרת. הכל נשמר על המכשיר (${String(err instanceof Error ? err.message : err)})`,
    })
  }
}

/** בודק שהכתובת והקוד עובדים, בלי לגעת בנתונים. */
export async function testConnection(url: string, code: string): Promise<{ ok: boolean; message: string }> {
  const config: SyncConfig = { url: normalizeUrl(url), code: code.trim().toUpperCase(), lastSync: 0 }
  if (!isConfigured(config)) return { ok: false, message: 'צריך גם כתובת שרת וגם קוד משפחה' }
  try {
    const res = await request(`${config.url}/health`, { method: 'GET' })
    if (!res.ok) return { ok: false, message: `השרת ענה ${res.status}` }
    return { ok: true, message: 'השרת עונה' }
  } catch (err) {
    return { ok: false, message: `לא הצלחתי להגיע לשרת: ${String(err instanceof Error ? err.message : err)}` }
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
    else void flushToServer()
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
 * sendBeacon שולח תמיד POST, ולכן השרת מקבל גם POST לאותה כתובת
 * ומתייחס אליו כדחיפה שממוזגת. בלי המיזוג בצד השרת, דחיפה עיוורת
 * כזאת הייתה יכולה לדרוס התקדמות שמכשיר אחר העלה בינתיים.
 */
export function flushToServer(): void {
  const save = getProgress()
  if (!isConfigured(save.sync)) return
  flushSave()
  try {
    const body = new Blob([JSON.stringify(save)], { type: 'application/json' })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint(save.sync), body)
      return
    }
  } catch {
    /* ממשיכים לניסיון הרגיל */
  }
  void request(endpoint(save.sync), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(save),
  }).catch(() => undefined)
}
