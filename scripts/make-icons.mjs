/**
 * מייצר את אייקוני ההתקנה של המשחק.
 *
 * למה סקריפט ולא קובץ תמונה שמישהו צייר: לפרויקט הזה אין ולו נכס
 * חיצוני אחד. אין פונטים, אין תמונות ואין ספריות מלבד Three.js - הכל
 * נוצר בקוד. אייקון PNG שהיה נכנס לריפו כקובץ בינארי היה הדבר היחיד
 * שאי אפשר לקרוא, לשנות או להסביר. כאן הטירה מצוירת במלבנים, ואפשר
 * להזיז אותה בשורה.
 *
 * מריצים: node scripts/make-icons.mjs
 * התוצאה נכנסת ל-public/ ונדחפת לריפו, כדי שהבנייה לא תלויה בסקריפט.
 *
 * הקידוד הוא PNG מינימלי בעבודת יד - חתימה, IHDR, IDAT ו-IEND - כי
 * zlib של Node עושה את החלק הקשה, ומקודד PNG שלם הוא כאן ארבעים שורה.
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public')

// אותם צבעים של המשחק עצמו: הסגול של הכותרת והזהב של הכוכבים.
const PURPLE = [0x7b, 0x4b, 0xb7]
const DEEP = [0x4a, 0x2a, 0x77]
const GOLD = [0xf7, 0xc9, 0x48]
const WINDOW = [0x2b, 0x1a, 0x47]

// ---------------------------------------------------------------- ציור

function canvas(size, rgb) {
  const px = Buffer.alloc(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    px[i * 3] = rgb[0]
    px[i * 3 + 1] = rgb[1]
    px[i * 3 + 2] = rgb[2]
  }
  return px
}

/** מלבן ביחידות 0..1, כדי שאותו ציור יעבוד בכל גודל. */
function rect(px, size, x0, y0, x1, y1, rgb) {
  const a = Math.round(x0 * size)
  const b = Math.round(y0 * size)
  const c = Math.round(x1 * size)
  const d = Math.round(y1 * size)
  for (let y = Math.max(0, b); y < Math.min(size, d); y++) {
    for (let x = Math.max(0, a); x < Math.min(size, c); x++) {
      const i = (y * size + x) * 3
      px[i] = rgb[0]
      px[i + 1] = rgb[1]
      px[i + 2] = rgb[2]
    }
  }
}

function disc(px, size, cx, cy, r, rgb) {
  const x0 = Math.max(0, Math.floor((cx - r) * size))
  const x1 = Math.min(size, Math.ceil((cx + r) * size))
  const y0 = Math.max(0, Math.floor((cy - r) * size))
  const y1 = Math.min(size, Math.ceil((cy + r) * size))
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = (x + 0.5) / size - cx
      const dy = (y + 0.5) / size - cy
      if (dx * dx + dy * dy > r * r) continue
      const i = (y * size + x) * 3
      px[i] = rgb[0]
      px[i + 1] = rgb[1]
      px[i + 2] = rgb[2]
    }
  }
}

/**
 * הטירה.
 *
 * inset הוא כמה להכניס את הציור פנימה. אייקון maskable נחתך בעיגול על
 * ידי מערכת ההפעלה, ומה שיוצא מהאזור הבטוח פשוט נעלם - ולכן שם הטירה
 * קטנה יותר ויושבת במרכז.
 */
function drawCastle(px, size, inset) {
  const at = (v) => 0.5 + (v - 0.5) * (1 - inset * 2)
  const box = (x0, y0, x1, y1, rgb) => rect(px, size, at(x0), at(y0), at(x1), at(y1), rgb)

  // שלושה מגדלים וחומה ביניהם
  box(0.10, 0.36, 0.30, 0.86, GOLD)
  box(0.70, 0.36, 0.90, 0.86, GOLD)
  box(0.24, 0.52, 0.76, 0.86, GOLD)
  box(0.38, 0.22, 0.62, 0.86, GOLD)

  // שיני החומה: חיתוכים בצבע הרקע בראש כל מגדל
  const notches = [
    [0.10, 0.36, 0.30, 0.42],
    [0.70, 0.36, 0.90, 0.42],
    [0.24, 0.52, 0.76, 0.58],
    [0.38, 0.22, 0.62, 0.28],
  ]
  for (const [x0, y0, x1, y1] of notches) {
    const step = (x1 - x0) / 5
    for (let i = 1; i < 5; i += 2) {
      box(x0 + i * step, y0, x0 + (i + 1) * step, y1, PURPLE)
    }
  }

  // שער וחלונות
  box(0.41, 0.64, 0.59, 0.86, DEEP)
  disc(px, size, at(0.5), at(0.64), 0.09 * (1 - inset * 2), DEEP)
  box(0.16, 0.50, 0.24, 0.60, WINDOW)
  box(0.76, 0.50, 0.84, 0.60, WINDOW)
  box(0.46, 0.34, 0.54, 0.44, WINDOW)

  // קרקע
  box(0.04, 0.86, 0.96, 0.94, DEEP)
}

// ---------------------------------------------------------------- PNG

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // עומק ביט
  ihdr[9] = 2 // RGB, בלי שקיפות: אייקון אפליקציה תמיד יושב על רקע מלא
  // 10..12 נשארים אפס: דחיסה, סינון ושזירה סטנדרטיים

  // כל שורה מקבלת בית סינון 0. אין כאן צילום, אלא שטחים אחידים,
  // ו-zlib דוחס אותם מצוין גם בלי חוכמות סינון.
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------- הרצה

mkdirSync(OUT, { recursive: true })

for (const [name, size, inset] of [
  ['icon-192.png', 192, 0.04],
  ['icon-512.png', 512, 0.04],
  // האזור הבטוח של maskable הוא בערך 80% מהרוחב. 14% מכל צד משאירים
  // את הטירה שלמה גם כשהמערכת חותכת עיגול.
  ['icon-maskable-512.png', 512, 0.14],
]) {
  const px = canvas(size, PURPLE)
  drawCastle(px, size, inset)
  const file = join(OUT, name)
  writeFileSync(file, encodePng(px, size))
  console.log(`wrote ${file}`)
}
