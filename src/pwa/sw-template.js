/* sw.js - משחק שעובד גם באוטו.
 *
 * הקובץ הזה הוא תבנית. הבנייה מחליפה את שלושת הסמנים שלמטה ברשימת
 * הקבצים האמיתית של אותה בנייה ובחתימה שלה, ואז כותבת את התוצאה
 * ל-dist/sw.js. הוא לא נטען אף פעם כמו שהוא.
 *
 * למה תבנית ולא רשימה כתובה ביד: Vite מוסיף גיבוב לשם כל קובץ, כך
 * שהשמות משתנים בכל בנייה. רשימה ידנית הייתה מתיישנת בבנייה הראשונה
 * ומפסיקה לעבוד בשקט - המשחק היה נראה מצוין אונליין ופשוט לא נפתח
 * בלי רשת. רשימה שנגזרת מהתוצאה עצמה לא יכולה להתיישן.
 *
 * אסטרטגיה אחת בלבד, וזה מכוון: הכל כאן הוא מעטפת. אין במשחק אף נכס
 * חיצוני - הקולות מסונתזים בדפדפן והציורים הם אמוג'י - ולכן אין את
 * החלוקה המקובלת בין קוד לתוכן. הכל **רשת קודם**, כדי שתיקון שנדחף
 * יגיע מיד, עם נפילה לקאש כשאין רשת.
 *
 * מה שאסור לגעת בו: כל בקשה למקור אחר, כלומר שרת הסנכרון, עוברת
 * ישר לרשת ולא נכנסת לשום קאש. שמירה מיושנת שחוזרת מקאש היא הדבר
 * היחיד שגרוע יותר מהיעדר שמירה.
 */

const VERSION = '__VERSION__'
const CACHE = 'castle-' + VERSION
const NET_TIMEOUT = 4000

const SHELL = __SHELL__
const INDEX = '__INDEX__'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // אחד-אחד וסלחני: קובץ בודד שנכשל לא אמור לבטל את כל ההתקנה
      // ולהשאיר את המשחק בלי עותק לא-מקוון בכלל.
      await Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n.startsWith('castle-') && n !== CACHE).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

/** רשת קודם, עם רצועה קצרה כדי שחיבור גרוע לא יהיה תקיעה. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), NET_TIMEOUT)
    const res = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    if (res && res.ok) cache.put(request, res.clone())
    return res
  } catch (err) {
    const hit = await cache.match(request)
    if (hit) return hit
    // ניווט בלי שום דבר בקאש עדיין חייב להציג משהו.
    if (request.mode === 'navigate') {
      const shell = await cache.match(INDEX)
      if (shell) return shell
    }
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // שרת הסנכרון יושב במקום אחר, ואסור לענות לו מקאש.
  if (url.origin !== self.location.origin) return

  event.respondWith(networkFirst(request))
})

// ===== הודעות מהדף =====
self.addEventListener('message', (event) => {
  const msg = event.data || {}

  if (msg.type === 'STATUS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE)
        const keys = await cache.keys()
        if (event.source) {
          event.source.postMessage({ type: 'STATUS', cached: keys.length, total: SHELL.length, version: VERSION })
        }
      })(),
    )
  }

  // מוריד עכשיו את כל מה שחסר, כדי שההורה יוכל להגיד "מוכן לנסיעה"
  // במקום לקוות שהדפדפן הספיק.
  if (msg.type === 'PRECACHE') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE)
        let done = 0
        let failed = 0
        for (const url of SHELL) {
          try {
            if (!(await cache.match(url))) await cache.add(new Request(url, { cache: 'reload' }))
          } catch (err) {
            failed++
          }
          done++
        }
        if (event.source) event.source.postMessage({ type: 'PRECACHE_DONE', done, failed, total: SHELL.length })
      })(),
    )
  }

  if (msg.type === 'CLEAR') {
    event.waitUntil(
      (async () => {
        const names = await caches.keys()
        await Promise.all(names.filter((n) => n.startsWith('castle-')).map((n) => caches.delete(n)))
        if (event.source) event.source.postMessage({ type: 'CLEARED' })
      })(),
    )
  }
})
