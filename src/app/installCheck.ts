/**
 * למה אי אפשר להתקין.
 *
 * הדפדפן מחליט לבד אם דף ראוי להתקנה, ואם התשובה שלילית הוא **לא
 * מסביר למה** - הוא פשוט לא מציע כלום. הורה שעומד מול טאבלט ולוחץ
 * "להתקין" ורואה "הדפדפן עוד לא הציע" לא יכול לדעת אם צריך לחכות,
 * לרענן, להחליף דפדפן, או שמשהו באתר שבור.
 *
 * הקובץ הזה בודק על המכשיר עצמו את אותם תנאים שהדפדפן בודק, ואומר
 * בעברית מה חסר. הוא לא יכול לדעת בוודאות מה כרום החליט - אין ממשק
 * כזה - אבל הוא כן יכול לשלול אחד-אחד את כל מה שתלוי בנו, ולהשאיר
 * במקרה הגרוע תשובה אחת: "הכל תקין מצדנו, זה עניין של זמן או של
 * הדפדפן".
 *
 * זה נבנה אחרי שהתקנה נכשלה בפועל על טאבלט, ואבחון מרחוק היה ניחוש.
 */

export interface CheckLine {
  /** true תקין, false בעיה, null לא רלוונטי או לא ידוע. */
  ok: boolean | null
  label: string
  detail: string
}

/** iOS ו-iPadOS: אין שם אירוע התקנה בכלל, ורק ספארי יודע להתקין. */
export function isIosDevice(): boolean {
  const ua = navigator.userAgent || ''
  const iosLike = /iPad|iPhone|iPod/.test(ua)
  const iPadOs = /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1
  return iosLike || iPadOs
}

/** ספארי אמיתי, להבדיל מכרום שרץ מעל WebKit באותו מכשיר. */
export function isSafari(): boolean {
  const ua = navigator.userAgent || ''
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium|Android/.test(ua)
}

/**
 * דפדפן פנימי של אפליקציה אחרת - מה שנפתח כשלוחצים על קישור
 * בוואטסאפ, בפייסבוק או בטלגרם. שם אין התקנה, והמשתמש בדרך כלל
 * לא יודע בכלל שהוא לא בדפדפן הרגיל שלו.
 */
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || ''
  if (/; wv\)/.test(ua)) return true
  return /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|Telegram|MicroMessenger/.test(ua)
}

function browserName(): string {
  const ua = navigator.userAgent || ''
  if (isInAppBrowser()) return 'דפדפן פנימי של אפליקציה'
  if (/CriOS/.test(ua)) return 'כרום על iOS'
  if (/EdgiOS|Edg\//.test(ua)) return 'Edge'
  if (/FxiOS|Firefox/.test(ua)) return 'פיירפוקס'
  if (/Chrome|Chromium/.test(ua)) return 'כרום'
  if (isSafari()) return 'ספארי'
  return 'דפדפן לא מזוהה'
}

function runningInstalled(): boolean {
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

/** טוען תמונה ומדווח אם הדפדפן הצליח לפענח אותה. */
function decodes(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth > 0)
    img.onerror = () => resolve(false)
    img.src = url
    // תמונה שלא עונה כלל אינה שונה בפועל מתמונה שבורה.
    window.setTimeout(() => resolve(false), 6000)
  })
}

/**
 * הבדיקה המלאה.
 *
 * offered אומר אם הדפדפן כבר שלח את הצעת ההתקנה בטעינה הזאת. הוא
 * מגיע מבחוץ, כי מי שמחזיק את האירוע הוא offline.ts.
 */
export async function diagnoseInstall(offered: boolean): Promise<CheckLine[]> {
  const lines: CheckLine[] = []
  const ios = isIosDevice()

  // 1. כבר מותקן
  if (runningInstalled()) {
    lines.push({ ok: true, label: 'כבר מותקן', detail: 'המשחק רץ עכשיו כאפליקציה מותקנת. אין מה להתקין שוב.' })
    return lines
  }

  // 2. הדפדפן
  if (isInAppBrowser()) {
    lines.push({
      ok: false,
      label: 'הדפדפן',
      detail: `${browserName()}. זה מה שנפתח כשלוחצים על קישור מתוך וואטסאפ או אפליקציה אחרת, ואין בו התקנה בכלל. צריך להעתיק את הכתובת ולפתוח אותה בכרום או בספארי.`,
    })
  } else if (ios) {
    lines.push({
      ok: isSafari() ? true : false,
      label: 'הדפדפן',
      detail: isSafari()
        ? 'ספארי. ההתקנה כאן ידנית: כפתור השיתוף ⬆️ ואז "הוסף למסך הבית".'
        : `${browserName()}. באייפון ובאייפד רק ספארי יודע ליצור אפליקציה אמיתית במסך הבית - כל דפדפן אחר שם, כולל כרום, לא יכול. צריך לפתוח את הכתובת בספארי.`,
    })
  } else {
    lines.push({ ok: true, label: 'הדפדפן', detail: `${browserName()}. תומך בהתקנה.` })
  }

  // 3. חיבור מאובטח
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  lines.push({
    ok: secure,
    label: 'חיבור מאובטח',
    detail: secure ? `הכתובת היא ${location.protocol}//${location.host}` : 'התקנה אפשרית רק מכתובת https. הכתובת הנוכחית אינה כזאת.',
  })

  // 4. service worker
  if (!('serviceWorker' in navigator)) {
    lines.push({ ok: false, label: 'עותק מקומי של המשחק', detail: 'הדפדפן הזה לא תומך בשמירת המשחק על המכשיר, ולכן גם לא בהתקנה.' })
  } else {
    const controlled = !!navigator.serviceWorker.controller
    let registered = false
    try {
      registered = (await navigator.serviceWorker.getRegistrations()).length > 0
    } catch {
      registered = false
    }
    lines.push({
      ok: controlled ? true : registered ? null : false,
      label: 'עותק מקומי של המשחק',
      detail: controlled
        ? 'רשום ופעיל.'
        : registered
          ? 'נרשם, אבל עוד לא השתלט על הדף. רענון אחד יסדר את זה.'
          : 'לא נרשם. בלעדיו הדפדפן לא יציע להתקין. כדאי לרענן, ואם זה חוזר - לספר לי.',
    })
  }

  // 5. קובץ ההגדרות והאייקונים
  const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
  if (!link) {
    lines.push({ ok: false, label: 'קובץ ההגדרות', detail: 'הדף לא מצביע על קובץ הגדרות התקנה בכלל. זו תקלה אצלי, כדאי לספר לי.' })
  } else {
    try {
      const res = await fetch(link.href, { cache: 'no-store' })
      if (!res.ok) throw new Error(`השרת ענה ${res.status}`)
      const manifest = (await res.json()) as {
        name?: string
        start_url?: string
        display?: string
        icons?: { src: string; sizes?: string; purpose?: string }[]
      }
      lines.push({ ok: true, label: 'קובץ ההגדרות', detail: `נטען בהצלחה: "${manifest.name ?? 'בלי שם'}", מצב תצוגה ${manifest.display ?? 'לא מוגדר'}.` })

      const icons = manifest.icons ?? []
      const results = await Promise.all(icons.map((icon) => decodes(new URL(icon.src, link.href).href)))
      const bad = icons.filter((_, i) => !results[i])
      lines.push({
        ok: bad.length === 0 && icons.length > 0,
        label: 'האייקונים',
        detail:
          icons.length === 0
            ? 'אין אייקונים בקובץ ההגדרות. בלעדיהם אין התקנה.'
            : bad.length === 0
              ? `כל ${icons.length} האייקונים נטענים.`
              : `${bad.length} מתוך ${icons.length} לא נטענים: ${bad.map((i) => i.src).join(', ')}. זו תקלה אצלי.`,
      })
    } catch (err) {
      lines.push({
        ok: false,
        label: 'קובץ ההגדרות',
        detail: `לא הצלחתי לטעון אותו (${err instanceof Error ? err.message : String(err)}). בלעדיו הדפדפן לא יציע להתקין.`,
      })
    }
  }

  // 6. ההצעה עצמה
  if (!ios) {
    lines.push({
      ok: offered ? true : null,
      label: 'ההצעה מהדפדפן',
      detail: offered
        ? 'הגיעה. אפשר ללחוץ "להתקין את הטירה".'
        : 'עוד לא הגיעה. כרום שולח אותה כשבא לו - לרוב אחרי כמה שניות של שימוש אמיתי בדף, ולפעמים רק בביקור השני. גם בלעדיה תמיד אפשר להתקין מהתפריט של הדפדפן.',
    })
  }

  return lines
}

/** ההוראה הידנית המתאימה למכשיר הזה. תמיד עובדת, גם בלי ההצעה. */
export function manualInstallHint(): string {
  if (isIosDevice()) {
    return 'באייפד ובאייפון: לפתוח את הכתובת ב-Safari, ללחוץ על כפתור השיתוף ⬆️ (ריבוע עם חץ למעלה), לגלול ולבחור "הוסף למסך הבית". רק ספארי יודע לעשות את זה - כרום על אייפד לא יכול.'
  }
  return 'באנדרואיד תמיד אפשר גם ידנית: תפריט שלוש הנקודות ⋮ בפינת כרום ← "התקנת אפליקציה" או "הוספה למסך הבית". זה עובד גם כשהכפתור כאן אומר שאין הצעה.'
}
