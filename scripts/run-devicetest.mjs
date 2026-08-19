/**
 * בדיקת המכשיר: סנכרון, מצב לא-מקוון והתקנה, בדפדפן אמיתי.
 *
 * הבדיקה העצמית ב-selftest.html בודקת את המיזוג כפונקציה. היא לא
 * יכולה לבדוק את מה שבאמת נכשל בשטח: כפתור שלא מגיב, הודעה שלא
 * נאמרת, דף שלא נפתח בלי רשת, ושמירה שנעלמת בין שני מכשירים. כאן
 * רצים דפדפן אמיתי, שרת אמיתי ושני הקשרים נפרדים - כלומר שני מכשירים.
 *
 * השרת שרץ כאן הוא **חיקוי מדויק של הוורקר שבאוויר**, כולל הדבר
 * החשוב ביותר: הוא לא ממזג כלום. שרת שממזג היה מסתיר בדיוק את הבאג
 * שהבדיקה מחפשת - מכשיר ריק שמוחק מכשיר מלא - כי הוא היה מתקן אותו
 * בשקט. כאן ההגנה היחידה היא המיזוג בצד הלקוח, וזה מה שנבדק.
 *
 * מריצים:
 *   npm run build && node scripts/run-devicetest.mjs
 */

import { createServer as createHttpServer } from 'node:http'
import { chromium } from 'playwright'
import { preview } from 'vite'

const SYNC_PORT = Number(process.env.DEVICETEST_SYNC_PORT ?? 8791)
const SITE_PORT = Number(process.env.DEVICETEST_SITE_PORT ?? 4181)
const HOST = '127.0.0.1'
const CODE = 'CASTLE-TEST-CODE-0001'

const lines = []
let failures = 0
const started = Date.now()
function check(name, ok, detail = '') {
  if (!ok) failures += 1
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`
  lines.push(line)
  // מודפס מיד ולא בסוף: בדיקה שרצה כמה דקות וכותבת הכל בסוף היא
  // בדיקה שאי אפשר לדעת איפה היא תקועה.
  console.log(`${String(Math.round((Date.now() - started) / 1000)).padStart(4)}s ${line}`)
}

// ---------------------------------------------------------------- השרת

/** מה שהוורקר עושה, בלי דבר נוסף. ראו server/cloudflare במקור. */
function startSyncServer() {
  const cells = new Map()
  const server = createHttpServer(async (req, res) => {
    const url = new URL(req.url, `http://${HOST}:${SYNC_PORT}`)
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': req.headers.origin ?? '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store',
    }
    const reply = (status, body) => {
      res.writeHead(status, headers)
      res.end(body === null ? '' : JSON.stringify(body))
    }

    if (req.method === 'OPTIONS') return reply(204, null)
    if (url.pathname !== '/') return reply(404, { error: 'not found' })

    const code = url.searchParams.get('code') ?? ''
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(code)) return reply(400, { error: 'bad code' })

    if (req.method === 'GET') {
      const doc = cells.get(code)
      return reply(200, { save: doc?.save ?? null, updatedAt: doc?.updatedAt ?? null })
    }

    if (req.method === 'POST') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      let save
      try {
        save = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        return reply(400, { error: 'body is not JSON' })
      }
      if (!save || typeof save !== 'object' || !Array.isArray(save.log)) {
        return reply(400, { error: 'not a game save' })
      }
      const updatedAt = new Date().toISOString()
      cells.set(code, { save, updatedAt })
      return reply(200, { ok: true, updatedAt })
    }

    return reply(405, { error: 'method not allowed' })
  })
  return new Promise((resolve) => {
    server.listen(SYNC_PORT, HOST, () => resolve({ server, cells }))
  })
}

// ---------------------------------------------------------------- שמירות

/** שמירה של ילדה ששיחקה. מבנה מלא, כדי שהטעינה תקבל אותה כמו שהיא. */
function fullSave() {
  return {
    version: 1,
    game: 'dmec',
    avatar: null,
    settings: { music: true, voice: true, speechRate: 0.75, showEnglishText: false, speechRecognition: false },
    stars: 210,
    wordsLearned: ['cat', 'dog', 'fish', 'red', 'blue'],
    correct: 180,
    mistakes: 20,
    needPractice: [],
    areas: { 'colors-garden': { unlocked: true, completedTasks: 12, stars: 40, done: true } },
    lastArea: 'colors-garden',
    stats: {
      'word:cat': { id: 'word:cat', kind: 'word', seen: 9, correct: 8, wrong: 1, streak: 4, bestStreak: 5, last: 8000, lastCorrect: 8000 },
    },
    lists: [],
    deletedLists: [],
    customWords: [],
    log: [
      { t: 1000, kind: 'area', id: 'colors-garden', correct: 10, total: 12 },
      { t: 2000, kind: 'practice', id: 'free', correct: 7, total: 8 },
    ],
    revision: 90,
  }
}

/** שמירה של משחק אחר באותו תא, כדי לבדוק שלא דורסים אותה. */
function otherGameSave() {
  return { version: 3, currentStage: 10, planesCollected: ['a'], log: [{ t: 1, a: 2, b: 3 }] }
}

// ---------------------------------------------------------------- דפדפן

/**
 * כתובת הדף, נגזרת מה-base שנפתר בפועל.
 *
 * ב-GitHub Actions ה-base הוא /<repo>/ ולא /. כתובת קשיחה כאן הייתה
 * עוברת מקומית ומחזירה 404 ב-CI בלבד, וזה כבר קרה פעם אחת.
 */
let siteBase = '/'
const SITE = () => `http://${HOST}:${SITE_PORT}${siteBase}`

async function openDevice(browser, { save, sync }) {
  const context = await browser.newContext()
  await context.addInitScript(
    ([saveJson, syncJson]) => {
      if (saveJson) window.localStorage.setItem('dmec:v1', saveJson)
      if (syncJson) window.localStorage.setItem('dmec:sync', syncJson)
    },
    [save ? JSON.stringify(save) : '', sync ? JSON.stringify(sync) : ''],
  )
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(SITE(), { waitUntil: 'load' })
  return { context, page, errors }
}

/** מגיע ללשונית מסך ההורים דרך הממשק, כמו הורה. */
async function openParentTab(page, tabLabel) {
  await page.getByRole('button', { name: /מסך הורים/ }).first().click()
  await page.getByRole('tab', { name: new RegExp(tabLabel) }).click()
}

async function readSave(page) {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('dmec:v1') ?? 'null'))
}

/** לוחץ "לסנכרן עכשיו" ומחזיר את המשפט שנאמר בסוף. */
async function pressSync(page, { url, code }) {
  const status = page.locator('.parent-sync-state').first()
  // מרוקנים את שורת המצב לפני הלחיצה. בלי זה הבדיקה קוראת את ההודעה
  // הישנה שעל המסך וחושבת שהיא התשובה - כלומר עוברת גם כשהכפתור מת.
  await status.evaluate((el) => {
    el.textContent = ''
  })

  await page.locator('input[aria-label="כתובת השרת"]').fill(url)
  await page.locator('input[aria-label="קוד המשפחה"]').fill(code)
  await page.getByRole('button', { name: 'לסנכרן עכשיו' }).click()

  // כל מסלול חייב להגיע למשפט סופי, גם כשלון.
  for (let i = 0; i < 80; i++) {
    const text = ((await status.textContent()) ?? '').trim()
    if (text && text !== 'מסנכרן…' && text !== 'שומר…' && text !== 'בודק…') return text
    await page.waitForTimeout(200)
  }
  return ((await status.textContent()) ?? '').trim()
}

function hebrew(text) {
  return /[א-ת]/.test(text) && text.length > 10
}

// ---------------------------------------------------------------- ההרצה

let browser
let site
let sync

try {
  sync = await startSyncServer()
  site = await preview({ configFile: 'vite.config.ts', preview: { port: SITE_PORT, strictPort: true, host: HOST } })
  siteBase = site.config.base ?? '/'

  const executablePath = process.env.SELFTEST_CHROMIUM
  browser = await chromium.launch(executablePath ? { executablePath } : {})

  const endpoint = `http://${HOST}:${SYNC_PORT}/`
  const conf = { url: endpoint, code: CODE, lastAt: 0, lastError: '' }

  // ============================================ 1. מכשיר ריק מול מלא
  //
  // ארבע הרצות. בכל אחת התא בשרת מתחיל מלא או ריק, ומכשיר אחר מסנכרן
  // ראשון. בכל אחת הטענה זהה: אחרי הכל, אף צד לא איבד כלום.
  for (const order of ['empty-first', 'full-first']) {
    for (const round of [1, 2]) {
      sync.cells.clear()

      const first = order === 'empty-first' ? { save: null } : { save: fullSave() }
      const second = order === 'empty-first' ? { save: fullSave() } : { save: null }

      const a = await openDevice(browser, { ...first, sync: conf })
      await openParentTab(a.page, 'סנכרון')
      const firstMessage = await pressSync(a.page, { url: endpoint, code: CODE })
      check(`[${order}, ${round}] the first device gets a sentence`, hebrew(firstMessage), firstMessage)

      const b = await openDevice(browser, { ...second, sync: conf })
      await openParentTab(b.page, 'סנכרון')
      const secondMessage = await pressSync(b.page, { url: endpoint, code: CODE })
      check(`[${order}, ${round}] the second device gets a sentence`, hebrew(secondMessage), secondMessage)

      // וסבב נוסף מהמכשיר הראשון, כי כשלון שמופיע רק בסנכרון השני הוא
      // בדיוק מה שנראה כמו "עבד, ואז נמחק".
      const again = await pressSync(a.page, { url: endpoint, code: CODE })
      check(`[${order}, ${round}] a second sync still ends in a sentence`, hebrew(again), again)

      const onServer = sync.cells.get(CODE)?.save
      const onA = await readSave(a.page)
      const onB = await readSave(b.page)

      const intact = (s, where) => {
        check(`[${order}, ${round}] ${where} kept the stars`, s?.stars === 210, String(s?.stars))
        check(`[${order}, ${round}] ${where} kept every word`, (s?.wordsLearned ?? []).length === 5, String((s?.wordsLearned ?? []).length))
        check(`[${order}, ${round}] ${where} kept the finished area`, s?.areas?.['colors-garden']?.done === true)
        check(`[${order}, ${round}] ${where} kept the history`, (s?.log ?? []).length === 2, String((s?.log ?? []).length))
      }
      intact(onServer, 'the server')
      intact(onA, 'device A')
      intact(onB, 'device B')

      check(`[${order}, ${round}] no page error`, a.errors.length === 0 && b.errors.length === 0, [...a.errors, ...b.errors].join(' | '))

      await a.context.close()
      await b.context.close()
    }
  }

  // ============================================ 2. מכשיר חדש לגמרי
  sync.cells.clear()
  {
    const fresh = await openDevice(browser, { save: null, sync: conf })
    await openParentTab(fresh.page, 'סנכרון')
    const message = await pressSync(fresh.page, { url: endpoint, code: CODE })
    check('a brand new device syncs successfully the first time', message.includes('מסונכרן'), message)
    check('the server accepted the first push', !!sync.cells.get(CODE), 'nothing was stored')
    check('what the empty device pushed has a log array', Array.isArray(sync.cells.get(CODE)?.save?.log))
    await fresh.context.close()
  }

  // ============================================ 3. הסוד לא בשמירה
  {
    const device = await openDevice(browser, { save: fullSave(), sync: conf })
    await openParentTab(device.page, 'סנכרון')
    await pressSync(device.page, { url: endpoint, code: CODE })
    const saved = await readSave(device.page)
    check('the sync code is not inside the local save', !('sync' in (saved ?? {})), JSON.stringify(saved?.sync ?? null))
    check('the sync code never reaches the server', !('sync' in (sync.cells.get(CODE)?.save ?? {})))
    const raw = await device.page.evaluate(() => window.localStorage.getItem('dmec:sync'))
    check('the sync code lives in its own key', typeof raw === 'string' && raw.includes(CODE))
    await device.context.close()
  }

  // ============================================ 4. כל כשלון מדבר עברית
  {
    const cases = [
      { name: 'a server that is not there', url: `http://${HOST}:1/`, code: CODE },
      { name: 'a code that is too short', url: endpoint, code: 'SHORT' },
      { name: 'a path that answers 404', url: `http://${HOST}:${SYNC_PORT}/nope`, code: CODE },
      { name: 'a code with characters the server rejects', url: endpoint, code: 'קוד בעברית שהוא לא חוקי' },
    ]
    const seen = new Set()
    for (const c of cases) {
      const device = await openDevice(browser, { save: fullSave(), sync: null })
      await openParentTab(device.page, 'סנכרון')
      const message = await pressSync(device.page, { url: c.url, code: c.code })
      check(`failure path speaks hebrew: ${c.name}`, hebrew(message), message)
      check(`failure path is not a raw error: ${c.name}`, !/error|failed to fetch|undefined/i.test(message), message)
      seen.add(message)
      const still = await readSave(device.page)
      check(`failure path keeps the progress: ${c.name}`, still?.stars === 210, String(still?.stars))
      await device.context.close()
    }
    check('the failure messages are not all the same sentence', seen.size >= 3, `${seen.size} distinct`)

    // ובנוסף: כפתור בלי שדות מלאים חייב להגיד למה, ולא לשתוק.
    const bare = await openDevice(browser, { save: fullSave(), sync: null })
    await openParentTab(bare.page, 'סנכרון')
    const empty = await pressSync(bare.page, { url: '', code: '' })
    check('pressing sync with empty fields says what is missing', hebrew(empty), empty)
    await bare.context.close()
  }

  // ============================================ 5. תא של משחק אחר
  {
    sync.cells.clear()
    sync.cells.set(CODE, { save: otherGameSave(), updatedAt: new Date().toISOString() })
    const device = await openDevice(browser, { save: fullSave(), sync: conf })
    await openParentTab(device.page, 'סנכרון')
    const message = await pressSync(device.page, { url: endpoint, code: CODE })
    check('a cell holding another game is explained', message.includes('משחק אחר'), message)
    check('a cell holding another game is not overwritten', sync.cells.get(CODE)?.save?.currentStage === 10)
  }

  // ============================================ 6. השוואה בין הצדדים
  {
    sync.cells.clear()
    sync.cells.set(CODE, { save: fullSave(), updatedAt: new Date().toISOString() })
    const device = await openDevice(browser, { save: null, sync: conf })
    await openParentTab(device.page, 'סנכרון')
    const compare = device.page.locator('.parent-compare')
    await compare.locator('.parent-compare-line').first().waitFor({ timeout: 15000 })
    const text = (await compare.textContent()) ?? ''
    check('the parent screen shows what is here', text.includes('כאן:'), text.slice(0, 120))
    check('the parent screen shows what is on the server', text.includes('בשרת:'), text.slice(0, 120))
    check('an empty device is told the progress exists on the server', text.includes('ההתקדמות קיימת בשרת'), text.slice(0, 200))
    await device.context.close()
  }

  // ============================================ 7. בלי רשת
  {
    const device = await openDevice(browser, { save: fullSave(), sync: null })
    // ממתינים ל-service worker, ואז רענון קשה כדי שהוא ישלוט בדף.
    const registered = await device.page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const reg = await navigator.serviceWorker.ready.catch(() => null)
      return !!reg
    })
    check('a service worker takes control', registered === true)

    await device.page.reload({ waitUntil: 'load' })
    const cached = await device.page.evaluate(async () => {
      const names = await caches.keys()
      const shell = names.find((n) => n.startsWith('castle-'))
      if (!shell) return 0
      const keys = await (await caches.open(shell)).keys()
      return keys.length
    })
    check('the game is stored on the device', cached >= 4, `${cached} files`)

    await device.context.setOffline(true)
    await device.page.reload({ waitUntil: 'load' })
    const alive = await device.page.evaluate(() => {
      const app = document.getElementById('app')
      return { children: app ? app.children.length : 0, text: document.body.innerText.slice(0, 80) }
    })
    check('the game still opens with the network off', alive.children > 0, JSON.stringify(alive))
    const offlineSave = await readSave(device.page)
    check('the progress is still there with the network off', offlineSave?.stars === 210, String(offlineSave?.stars))
    await device.context.setOffline(false)
    await device.context.close()
  }

  // ============================================ 8. כפתור ההתקנה
  //
  // כרום ללא ממשק לא מציע התקנה אמיתית, ולכן האירוע מזויף כאן. מה
  // שנבדק הוא הקוד שלנו: התפיסה, ההודעה כשאין הצעה, המסך שמתעדכן
  // כשההצעה מגיעה בזמן שהוא פתוח, אישור, ביטול, וכבר מותקן.
  {
    // 8א. אין הצעה
    const noOffer = await openDevice(browser, { save: null, sync: null })
    await openParentTab(noOffer.page, 'התקנה')
    const before = (await noOffer.page.locator('.parent-sync-state').first().textContent()) ?? ''
    check('with no offer the parent is told why', hebrew(before) && before.includes('עוד לא הציע'), before.slice(0, 80))

    await noOffer.page.getByRole('button', { name: 'להתקין את הטירה' }).click()
    const pressed = (await noOffer.page.locator('.parent-sync-state').first().textContent()) ?? ''
    check('pressing install with no offer still says something useful', hebrew(pressed), pressed.slice(0, 80))

    // 8ב. ההצעה מגיעה כשהמסך פתוח
    await noOffer.page.evaluate(() => {
      const e = new Event('beforeinstallprompt')
      e.prompt = () => Promise.resolve()
      e.userChoice = Promise.resolve({ outcome: 'accepted' })
      window.dispatchEvent(e)
    })
    await noOffer.page.waitForTimeout(300)
    const afterOffer = (await noOffer.page.locator('.parent-sync-state').first().textContent()) ?? ''
    check('the screen updates when the offer arrives while it is open', afterOffer.includes('מוכן להתקין'), afterOffer.slice(0, 80))

    // 8ג. אישור
    await noOffer.page.getByRole('button', { name: 'להתקין את הטירה' }).click()
    await noOffer.page.waitForTimeout(300)
    const accepted = (await noOffer.page.locator('.parent-sync-state').first().textContent()) ?? ''
    check('accepting the install says so', accepted.includes('מסך הבית'), accepted.slice(0, 80))
    await noOffer.context.close()

    // 8ד. ביטול
    const cancel = await openDevice(browser, { save: null, sync: null })
    await openParentTab(cancel.page, 'התקנה')
    await cancel.page.evaluate(() => {
      const e = new Event('beforeinstallprompt')
      e.prompt = () => Promise.resolve()
      e.userChoice = Promise.resolve({ outcome: 'dismissed' })
      window.dispatchEvent(e)
    })
    await cancel.page.waitForTimeout(300)
    await cancel.page.getByRole('button', { name: 'להתקין את הטירה' }).click()
    await cancel.page.waitForTimeout(300)
    const cancelled = (await cancel.page.locator('.parent-sync-state').first().textContent()) ?? ''
    check('cancelling the install is explained without blame', cancelled.includes('ביטלת'), cancelled.slice(0, 80))

    // ולחיצה נוספת על אירוע מנוצל לא זורקת, אלא מסבירה.
    await cancel.page.getByRole('button', { name: 'להתקין את הטירה' }).click()
    await cancel.page.waitForTimeout(300)
    const twice = (await cancel.page.locator('.parent-sync-state').first().textContent()) ?? ''
    check('a second press on a spent offer does not break', hebrew(twice) && cancel.errors.length === 0, `${twice.slice(0, 60)} ${cancel.errors.join('|')}`)
    await cancel.context.close()

    // 8ה. כבר מותקן
    const installed = await browser.newContext()
    await installed.addInitScript(() => {
      const real = window.matchMedia.bind(window)
      window.matchMedia = (q) => (q.includes('display-mode') ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } : real(q))
    })
    const installedPage = await installed.newPage()
    await installedPage.goto(SITE(), { waitUntil: 'load' })
    await openParentTab(installedPage, 'התקנה')
    const already = (await installedPage.locator('.parent-sync-state').first().textContent()) ?? ''
    check('an installed device is told it is installed', already.includes('כבר מותקן'), already.slice(0, 80))
    const hasButton = await installedPage.getByRole('button', { name: 'להתקין את הטירה' }).count()
    check('an installed device is not offered the button again', hasButton === 0)
    await installed.close()
  }
} catch (err) {
  check('the device test ran to the end', false, err instanceof Error ? err.stack ?? err.message : String(err))
} finally {
  await browser?.close()
  await site?.close()
  sync?.server.close()
}

// השורות כבר הודפסו תוך כדי ריצה. כאן רק הסיכום, ורשימת הכשלונות
// בסוף כדי שלא יצטרכו לגלול חזרה כדי למצוא אותם.
if (failures > 0) console.log('\n' + lines.filter((l) => l.startsWith('FAIL')).join('\n'))
console.log(failures === 0 ? `\nALL ${lines.length} DEVICE CHECKS PASSED` : `\n${failures} OF ${lines.length} DEVICE CHECKS FAILED`)
process.exit(failures === 0 ? 0 : 1)
