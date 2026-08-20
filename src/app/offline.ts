/**
 * הצד של הדף במשחק לא-מקוון ובהתקנה למסך הבית.
 *
 * הרישום שקט בכוונה: אם הוא נכשל, או שהמשחק רץ מכתובת שלא מרשה
 * service worker בכלל, שום דבר כאן לא מתלונן ושום דבר לא משתנה.
 * משחק לא-מקוון הוא תוספת, אף פעם לא תלות.
 *
 * למה בכלל כפתור התקנה בתוך המשחק: כרום קובר את "הוסף למסך הבית"
 * עמוק בתפריט, תחת שם שמשתנה בין גרסאות, **ודפדפן פנימי של אפליקציה
 * - מה שנפתח כשלוחצים על קישור בוואטסאפ - לא מציע את זה בכלל.**
 * הורה שעומד מול טאבלט לא אמור לחפש.
 *
 * באייפון אין אירוע התקנה בכלל, ולכן הכפתור מוחלף בהוראה. שם זה גם
 * לא קוסמטי: ספארי מוחק אחסון של אתרים שלא נכנסים אליהם שבוע, ואילו
 * אפליקציה שיושבת במסך הבית פטורה מזה. כלומר דווקא באייפון, התקנה
 * היא מה שמגן על ההתקדמות של דניאל.
 */

import { isIosDevice } from './installCheck'

/** האירוע שהדפדפן שולח כשהוא מוכן להתקין. אינו בטיפוסים הסטנדרטיים. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installEvent: InstallPromptEvent | null = null
let registration: ServiceWorkerRegistration | null = null
const listeners = new Set<() => void>()

/**
 * מודיע למסך ההורים שההצעה הגיעה או נעלמה, גם אם הוא כבר פתוח.
 *
 * הצילום של הרשימה לפני המעבר עליה אינו קוסמטי. מאזין טיפוסי כאן
 * מצייר מחדש את המסך, והציור מחדש רושם מאזין חדש - ו-Set ב-JavaScript
 * מבקר גם באיברים שנוספו תוך כדי המעבר עליו. בלי הצילום זו לולאה
 * אינסופית שתוקעת את הדף לגמרי, בדיוק ברגע שהדפדפן מציע להתקין.
 */
function announce(): void {
  for (const fn of Array.from(listeners)) {
    try {
      fn()
    } catch {
      /* מסך ההורים אולי נסגר באמצע. זו לא בעיה שלנו */
    }
  }
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** service worker דורש מקור אמיתי. לקובץ מקומי לא יהיה כזה לעולם. */
export function offlinePossible(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  )
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!offlinePossible()) return null
  try {
    // BASE_URL ולא נתיב יחסי: כך זה נכון גם מקומית וגם תחת /<repo>/.
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    return registration
  } catch {
    // בפיתוח אין קובץ כזה בכלל, וזה בסדר גמור.
    return null
  }
}

async function ready(): Promise<ServiceWorkerRegistration | null> {
  if (!offlinePossible()) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- התקנה

/** האם הדפדפן כבר אמר שהוא מוכן להתקין את הדף הזה. */
export function installable(): boolean {
  return installEvent !== null
}

/** כבר רץ כאפליקציה מותקנת - אין מה להציע. */
export function installed(): boolean {
  try {
    return (
      (typeof window.matchMedia === 'function' &&
        (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches)) ||
      (navigator as { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

/**
 * אייפון ואייפד: אין אירוע התקנה, יש הוראה ידנית.
 *
 * הזיהוי עצמו יושב ב-installCheck.ts ולא כאן, כדי שלא יהיו שתי
 * גרסאות שנפרדות זו מזו: הבדיקה שמסבירה למה אי אפשר להתקין חייבת
 * להסכים עם הקוד שמחליט אם בכלל להציג כפתור.
 */
export function isIos(): boolean {
  return isIosDevice()
}

/**
 * מציג את חלון ההתקנה של הדפדפן.
 *
 * האירוע השמור הוא חד-פעמי: ברגע שהוצג הוא מנוצל, לא משנה מה ההורה
 * בחר. לכן הוא מנוקה **לפני** ההמתנה ולא אחריה - לחיצה שנייה על
 * אירוע מת זורקת שגיאה.
 */
export async function promptInstall(): Promise<{ ok: boolean; message: string }> {
  const event = installEvent
  if (!event) {
    if (installed()) return { ok: false, message: 'המשחק כבר מותקן על המכשיר הזה.' }
    if (isIos()) {
      return { ok: false, message: 'באייפון ובאייפד ההתקנה נעשית מכפתור השיתוף ⬆️ ואז "הוסף למסך הבית".' }
    }
    return {
      ok: false,
      message: 'הדפדפן עוד לא הציע להתקין. לרוב זה מסתדר אחרי כמה שניות במשחק, או אחרי רענון. בדפדפן שנפתח מתוך אפליקציה אחרת אין התקנה - כדאי לפתוח את הקישור בכרום או בספארי.',
    }
  }

  // מנוקה כאן, בלי להודיע. הודעה כאן הייתה גורמת למסך ההורים לצייר
  // את עצמו מחדש בזמן שהלחיצה עוד מחכה לתשובה, והתשובה הייתה נכתבת
  // לתוך אלמנט שכבר לא נמצא על המסך - כלומר לחיצה בלי שום משוב.
  installEvent = null
  try {
    await event.prompt()
    const choice = await event.userChoice
    if (choice.outcome === 'accepted') {
      return { ok: true, message: 'מצוין. האייקון של הטירה נמצא עכשיו במסך הבית.' }
    }
    return { ok: false, message: 'ביטלת את ההתקנה. אפשר לחזור לכאן ולהתקין מתי שתרצי - ההצעה תחזור אחרי רענון.' }
  } catch (err) {
    return { ok: false, message: `ההתקנה לא נפתחה: ${err instanceof Error ? err.message : String(err)}. אפשר לנסות שוב אחרי רענון.` }
  }
}

// ---------------------------------------------------------------- קאש

export interface CacheStatus {
  cached: number
  total: number
  version: string
}

/** כמה מהמשחק כבר יושב על המכשיר. null כשאין service worker פעיל. */
export async function cacheStatus(): Promise<CacheStatus | null> {
  return askWorker<CacheStatus>({ type: 'STATUS' }, 'STATUS')
}

/** מוריד עכשיו את מה שחסר, כדי שאפשר יהיה לצאת לדרך בלי רשת. */
export async function downloadForOffline(): Promise<{ ok: boolean; message: string }> {
  const result = await askWorker<{ done: number; failed: number; total: number }>({ type: 'PRECACHE' }, 'PRECACHE_DONE', 30000)
  if (!result) return { ok: false, message: 'המשחק עוד לא הספיק להתכונן. כדאי לרענן את הדף ולנסות שוב.' }
  if (result.failed > 0) {
    return { ok: false, message: `הורדתי ${result.done - result.failed} מתוך ${result.total} קבצים. כדאי לנסות שוב כשהרשת יציבה יותר.` }
  }
  return { ok: true, message: `המשחק שמור על המכשיר - כל ${result.total} הקבצים. אפשר לשחק בלי רשת.` }
}

/**
 * מוחק את הקאש ואת ה-service worker ומרענן.
 *
 * זה פתח המילוט. קאש שהשתבש הוא כשלון שהורה לא יכול לאבחן, ולכן יש
 * כפתור שמסיר ממנו כל זכר. השמירה לא נוגעת בזה: היא ב-localStorage,
 * ושום דבר כאן לא מתקרב לשם.
 */
export async function resetOffline(): Promise<void> {
  try {
    const reg = await ready()
    if (reg?.active) {
      reg.active.postMessage({ type: 'CLEAR' })
      await new Promise((r) => setTimeout(r, 400))
    }
    const names = await caches.keys()
    await Promise.all(names.filter((n) => n.startsWith('castle-')).map((n) => caches.delete(n)))
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* ממשיכים לרענון בכל מקרה: הוא לבדו פותר חלק מהמקרים */
  }
  location.reload()
}

/** שאלה ל-service worker עם תשובה אחת וזמן קצוב. */
function askWorker<T>(message: object, replyType: string, timeout = 5000): Promise<T | null> {
  return ready().then((reg) => {
    if (!reg?.active) return null
    return new Promise<T | null>((resolve) => {
      const done = (value: T | null): void => {
        navigator.serviceWorker.removeEventListener('message', listener)
        clearTimeout(timer)
        resolve(value)
      }
      const listener = (e: MessageEvent): void => {
        if ((e.data as { type?: string } | null)?.type !== replyType) return
        done(e.data as T)
      }
      navigator.serviceWorker.addEventListener('message', listener)
      const timer = setTimeout(() => done(null), timeout)
      reg.active?.postMessage(message)
    })
  })
}

// ---------------------------------------------------------------- אירועים
//
// כרום שולח את ההצעה פעם אחת, מוקדם, ורק אם החליט שהדף עומד בתנאים.
// חייבים לתפוס אותה כבר בטעינה: עד שההורה יפתח את מסך ההורים האירוע
// מזמן חלף, ואירוע שלא נתפס גורם לכרום להציג באנר משלו.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e as InstallPromptEvent
    announce()
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    announce()
  })
}
