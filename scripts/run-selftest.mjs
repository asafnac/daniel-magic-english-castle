/**
 * מריץ את הבדיקה העצמית בדפדפן ללא מסך, ומחזיר קוד יציאה.
 *
 * הבדיקה העצמית חייבת דפדפן אמיתי: היא לוחצת על כפתורים, קוראת DOM
 * ומשתמשת ב-localStorage. לכן היא לא יכולה לרוץ ב-Node לבד, ולכן
 * עד שהסקריפט הזה נוסף היא רצה רק כשמישהו זכר לפתוח את הדף.
 *
 * הסקריפט מרים את שרת הפיתוח, פותח את הדף, ממתין לתוצאה ומדפיס אותה.
 * אם משהו נכשל, הוא יוצא בקוד שגיאה וה-CI נופל.
 *
 * משתני סביבה:
 *   SELFTEST_PORT       יציאה. ברירת מחדל 5179.
 *   SELFTEST_CHROMIUM   נתיב לדפדפן שכבר מותקן, אם לא רוצים עוד עותק.
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { chromium } from 'playwright'

const PORT = Number(process.env.SELFTEST_PORT ?? 5179)
const URL = `http://127.0.0.1:${PORT}/selftest.html`

/**
 * מוודא שהיציאה פנויה לפני שמרימים שרת.
 *
 * זו לא זהירות יתר. אם שרת ישן נשאר על היציאה, הוא יענה במקום השרת
 * שלנו, הבדיקות ירוצו מול גרסה ישנה של הקוד, והתוצאה תהיה ירוקה
 * ולא נכונה. עדיף ליפול עם הודעה ברורה.
 */
function ensurePortIsFree() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', (err) =>
      reject(
        err.code === 'EADDRINUSE'
          ? new Error(`port ${PORT} is already in use. Stop what is on it, or set SELFTEST_PORT.`)
          : err,
      ),
    )
    probe.once('listening', () => probe.close(() => resolve()))
    probe.listen(PORT, '127.0.0.1')
  })
}

/** ממתין עד שהשרת עונה, או נכשל אחרי זמן סביר. */
async function waitForServer(isDead, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL)
      if (res.ok) return
    } catch {
      /* עוד לא עלה */
    }
    const dead = isDead()
    if (dead) throw new Error(dead)
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`dev server did not answer on ${URL}`)
}

let exitCode = 1
let browser
let server

try {
  await ensurePortIsFree()

  // detached כדי שאפשר יהיה להרוג את כל קבוצת התהליכים. npx מריץ את
  // vite כתהליך בן, ולכן הריגה של npx בלבד הייתה משאירה את vite חי
  // ותופס את היציאה, וההרצה הבאה הייתה מתחברת אליו במקום לשרת חדש.
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: process.env,
    detached: true,
  })
  server.stderr.on('data', (d) => process.stderr.write(d))

  let serverDied = null
  server.on('exit', (code) => {
    if (code !== 0 && code !== null) serverDied = `dev server exited with code ${code}`
  })

  await waitForServer(() => serverDied)

  // בסביבה שבה כבר מותקן דפדפן אפשר להצביע עליו. ב-CI המשתנה לא
  // מוגדר, ו-Playwright משתמש בזה שהתקין בעצמו.
  const executablePath = process.env.SELFTEST_CHROMIUM
  browser = await chromium.launch(executablePath ? { executablePath } : {})
  const page = await browser.newPage()

  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  await page.goto(URL, { waitUntil: 'networkidle' })
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
  console.error(String(err instanceof Error ? err.message : err))
} finally {
  await browser?.close()
  if (server?.pid) {
    try {
      // מינוס לפני ה-pid הורג את כל קבוצת התהליכים, כולל vite עצמו
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      /* כבר מת */
    }
  }
}

process.exit(exitCode)
