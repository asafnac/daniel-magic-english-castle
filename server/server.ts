/**
 * שרת הסנכרון של הטירה הקסומה.
 *
 * שרת קטן בכוונה: ספרייה סטנדרטית של Node בלבד, בלי Express, בלי מסד
 * נתונים ובלי אף חבילה חיצונית. מסמך JSON אחד לכל קוד משפחה, על הדיסק.
 * למשפחה אחת זה נכון יותר מכל דבר מורכב יותר, וזה גם אומר שאין כאן
 * שרשרת אספקה שצריך לעדכן.
 *
 * מה שהשרת יודע: קוד אקראי, ומסמך התקדמות. מה שהוא לא יודע: מי משחקת,
 * בת כמה היא, איפה היא גרה, ואיך קוראים לה. אין חשבונות, אין אימייל
 * ואין סיסמאות, ולכן גם אין מה לדלוף מהם.
 *
 * הפעלה:
 *   node server/dist/server/server.js
 *
 * משתני סביבה:
 *   PORT          יציאה. ברירת מחדל 8787.
 *   DATA_DIR      איפה לשמור. ברירת מחדל ./data.
 *   ALLOW_ORIGIN  מאיזה מקור מותר לקרוא. ברירת מחדל *.
 *   HOST          כתובת האזנה. ברירת מחדל 127.0.0.1, כדי שהשרת
 *                 לא ייחשף לאינטרנט בלי proxy עם HTTPS לפניו.
 */

import { createHash } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mergeSaves } from '../src/learning/merge.js'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'
const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data')
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN ?? '*'

/** גבול גודל גוף הבקשה. שמירה אמיתית היא עשרות קילובייט. */
const MAX_BODY = 2 * 1024 * 1024

/** קוד משפחה תקין. אורך מינימלי כדי שלא יהיה אפשר לנחש אותו. */
const CODE_RE = /^[A-Z0-9-]{10,64}$/

// ------------------------------------------------------------ הגבלת קצב

/** חלון הגבלה פשוט בזיכרון. מספיק למשפחה, ומונע סריקת קודים. */
const hits = new Map<string, { count: number; until: number }>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 120

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.until) {
    hits.set(ip, { count: 1, until: now + RATE_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_MAX
}

// ------------------------------------------------------------ אחסון

/**
 * שם הקובץ הוא גיבוב של הקוד ולא הקוד עצמו.
 *
 * ככה הסוד לא יושב בשם קובץ, ולא מגיע לגיבויים, ללוגים של גיבוי
 * ולפלט של ls. מי שיש לו גישה לתיקייה רואה שיש משפחה, לא איזו.
 */
function fileFor(code: string): string {
  const hash = createHash('sha256').update(code).digest('hex').slice(0, 32)
  return join(DATA_DIR, `${hash}.json`)
}

async function readSave(code: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(fileFor(code), 'utf8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * כתיבה אטומית: קודם לקובץ זמני ואז שינוי שם.
 * בלי זה, הפסקת חשמל באמצע כתיבה משאירה קובץ חתוך, כלומר
 * מוחקת את כל ההתקדמות בדיוק ברגע הכי גרוע.
 */
async function writeSave(code: string, data: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  const target = fileFor(code)
  const temp = `${target}.${process.pid}.tmp`
  await writeFile(temp, JSON.stringify(data), 'utf8')
  await rename(temp, target)
}

// ------------------------------------------------------------ HTTP

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOW_ORIGIN,
    'access-control-allow-methods': 'GET, PUT, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw new Error('body too large')
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const server = createServer((req, res) => {
  void handle(req, res).catch((err) => {
    // אף פעם לא מחזירים את הודעת השגיאה המקורית ללקוח: היא עלולה
    // להכיל נתיבים מהשרת. ללוג היא כן הולכת.
    console.error('request failed:', err instanceof Error ? err.message : err)
    send(res, 500, { error: 'server error' })
  })
})

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET'
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (method === 'OPTIONS') {
    send(res, 204, null)
    return
  }

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) {
    send(res, 429, { error: 'too many requests' })
    return
  }

  if (url.pathname === '/health') {
    send(res, 200, { ok: true })
    return
  }

  const match = /^\/save\/([^/]+)$/.exec(url.pathname)
  if (!match) {
    send(res, 404, { error: 'not found' })
    return
  }

  const code = decodeURIComponent(match[1]).toUpperCase()
  if (!CODE_RE.test(code)) {
    send(res, 400, { error: 'bad code' })
    return
  }

  if (method === 'GET') {
    const save = await readSave(code)
    if (!save) {
      send(res, 404, { error: 'no save yet' })
      return
    }
    send(res, 200, save)
    return
  }

  // PUT ו-POST זהים כאן. sendBeacon של הדפדפן יודע לשלוח רק POST,
  // והוא בדיוק מה שמציל את הסבב האחרון כשסוגרים את הלשונית.
  if (method === 'PUT' || method === 'POST') {
    let incoming: Record<string, unknown>
    try {
      incoming = (await readBody(req)) as Record<string, unknown>
    } catch {
      send(res, 400, { error: 'bad json' })
      return
    }
    if (!incoming || typeof incoming !== 'object' || typeof incoming.version !== 'number') {
      send(res, 400, { error: 'not a save' })
      return
    }

    // השרת ממזג ולא דורס.
    //
    // זה נראה מיותר כי הלקוח כבר ממזג, אבל זה בדיוק המקום שבו נתונים
    // הולכים לאיבוד: אם ה-iPad והטלפון דוחפים בהפרש של שנייה, הדחיפה
    // השנייה מבוססת על תמונה ישנה. מיזוג כאן הופך את זה ללא נורא.
    const existing = await readSave(code)
    const merged = existing && existing.version === incoming.version
      ? (mergeSaves(incoming as never, existing as never) as unknown as Record<string, unknown>)
      : incoming

    // הגדרות הסנכרון של המכשיר לא נשמרות בשרת. אין שום סיבה שהשרת
    // יחזיק עותק של הקוד שלו בתוך המסמך.
    delete merged.sync

    await writeSave(code, merged)
    send(res, 200, merged)
    return
  }

  send(res, 405, { error: 'method not allowed' })
}

server.listen(PORT, HOST, () => {
  console.log(`castle sync listening on http://${HOST}:${PORT}, data in ${DATA_DIR}`)
  if (HOST === '0.0.0.0') {
    console.warn('HOST is 0.0.0.0: make sure an HTTPS proxy sits in front of this.')
  }
})
