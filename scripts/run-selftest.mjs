/**
 * מריץ את הבדיקה העצמית בדפדפן ללא מסך, ומחזיר קוד יציאה.
 *
 * הבדיקה העצמית חייבת דפדפן אמיתי: היא לוחצת על כפתורים, קוראת DOM
 * ומשתמשת ב-localStorage. לכן היא לא יכולה לרוץ ב-Node לבד, ולכן
 * עד שהסקריפט הזה נוסף היא רצה רק כשמישהו זכר לפתוח את הדף.
 *
 * השרת מורם דרך ה-API של Vite ולא כתהליך נפרד, וזו החלטה שנלמדה
 * מכישלון: הגרסה עם תהליך בן דרשה טיפול ביציאה תפוסה, בהריגת קבוצת
 * תהליכים ובאיסוף הפלט שלו, וכשהיא נפלה ב-CI היא לא ידעה להגיד למה.
 * בתוך התהליך אין תהליך שדולף, אין יציאה שנשארת תפוסה, וכל שגיאה
 * מגיעה כחריגה עם הודעה אמיתית.
 *
 * משתני סביבה:
 *   SELFTEST_PORT       יציאה. ברירת מחדל 5179.
 *   SELFTEST_CHROMIUM   נתיב לדפדפן שכבר מותקן, אם לא רוצים עוד עותק.
 */

import { chromium } from 'playwright'
import { createServer } from 'vite'

const PORT = Number(process.env.SELFTEST_PORT ?? 5179)
const HOST = '127.0.0.1'
const PATH = '/selftest.html'

let exitCode = 1
let browser
let server

try {
  // strictPort נופל עם הודעה ברורה אם היציאה תפוסה. זה חשוב: שרת ישן
  // שהיה עונה במקומנו היה מריץ את הבדיקות מול קוד ישן ומדווח ירוק.
  server = await createServer({
    configFile: 'vite.config.ts',
    server: { port: PORT, strictPort: true, host: HOST },
    logLevel: 'warn',
  })
  await server.listen()

  const url = `http://${HOST}:${PORT}${PATH}`

  const executablePath = process.env.SELFTEST_CHROMIUM
  browser = await chromium.launch(executablePath ? { executablePath } : {})
  const page = await browser.newPage()

  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  const response = await page.goto(url, { waitUntil: 'networkidle' })
  if (!response || !response.ok()) {
    throw new Error(`${url} answered ${response ? response.status() : 'nothing'}`)
  }

  await page.waitForFunction(
    () => {
      const text = document.getElementById('out')?.textContent ?? ''
      return text.length > 0 && text !== 'running…'
    },
    { timeout: 180_000 },
  )

  const output = await page.evaluate(() => document.getElementById('out')?.textContent ?? '')
  const summary = output.split('\n')[0] ?? ''
  const failures = output.split('\n').filter((line) => line.startsWith('FAIL'))

  if (failures.length > 0) console.error(`${failures.join('\n')}\n`)
  console.log(summary)

  if (pageErrors.length > 0) {
    console.error('\nuncaught errors on the page:')
    console.error(pageErrors.join('\n'))
  }

  exitCode = failures.length === 0 && pageErrors.length === 0 && summary.includes('PASSED') ? 0 : 1
} catch (err) {
  console.error(String(err instanceof Error ? (err.stack ?? err.message) : err))
} finally {
  await browser?.close()
  await server?.close()
}

process.exit(exitCode)
