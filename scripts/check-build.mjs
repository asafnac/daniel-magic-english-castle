/**
 * בודק שמה שנבנה באמת יעבוד בלי רשת.
 *
 * הכשלון שהבדיקה הזאת מחפשת הוא היחיד בפרויקט שנראה מצוין בכל בדיקה
 * אחרת: קובץ שנוסף לדף אבל לא לרשימת ה-service worker עובד מושלם
 * אונליין, ופשוט חסר באוטו. אין לו סימפטום עד לרגע הכי גרוע.
 *
 * ארבע טענות:
 * 1. נוצר service worker, ואין בו סמן שלא הוחלף.
 * 2. כל קובץ שנכתב ל-dist נמצא ברשימת המעטפת שלו.
 * 3. כל <script src> ו-<link href> ב-index.html נמצא באותה רשימה.
 * 4. יש manifest עם אייקונים, וכל אייקון שהוא מבטיח קיים באמת.
 *
 * מריצים: node scripts/check-build.mjs   (אחרי npm run build)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const DIST = resolve('dist')
const problems = []
const ok = (name) => console.log(`PASS  ${name}`)
const fail = (name, detail) => {
  problems.push(`${name}${detail ? ' :: ' + detail : ''}`)
  console.log(`FAIL  ${name}${detail ? ' :: ' + detail : ''}`)
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(relative(DIST, full).split('\\').join('/'))
  }
  return out
}

let files
try {
  files = walk(DIST)
} catch {
  console.log('FAIL  dist exists :: run npm run build first')
  process.exit(1)
}
ok(`dist has ${files.length} files`)

// ---------------------------------------------------------------- 1
let sw = ''
try {
  sw = readFileSync(join(DIST, 'sw.js'), 'utf8')
  ok('a service worker was written')
} catch {
  fail('a service worker was written')
}

const leftover = sw.match(/__[A-Z]+__/)
if (leftover) fail('no placeholder survived the build', leftover[0])
else ok('no placeholder survived the build')

const listed = (() => {
  const match = sw.match(/const SHELL = (\[[\s\S]*?\n\])/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
})()

if (!listed) {
  fail('the shell list can be read')
  process.exit(1)
}
ok(`the shell list holds ${listed.length} entries`)

const base = listed[0]
const shell = new Set(listed)

// ---------------------------------------------------------------- 2
const missing = files.filter((f) => f !== 'sw.js' && !f.endsWith('.map')).filter((f) => !shell.has(base + f))
if (missing.length > 0) fail('every built file is in the shell list', missing.join(', '))
else ok('every built file is in the shell list')

// ---------------------------------------------------------------- 3
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  // data: הוא האייקון המוטבע בדף, ואין מה לשמור אותו בקאש.
  .filter((u) => !u.startsWith('data:') && !u.startsWith('http'))
  .map((u) => (u.startsWith('/') ? u : base + u))
const unlisted = refs.filter((u) => !shell.has(u))
if (unlisted.length > 0) fail('every file the page asks for is in the shell list', unlisted.join(', '))
else ok(`every file the page asks for is in the shell list (${refs.length})`)

// ---------------------------------------------------------------- 4
try {
  const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'))
  const icons = manifest.icons ?? []
  const sizes = new Set(icons.map((i) => i.sizes))
  if (!sizes.has('192x192') || !sizes.has('512x512')) fail('the manifest offers 192 and 512 icons', [...sizes].join(', '))
  else ok('the manifest offers 192 and 512 icons')

  if (!icons.some((i) => String(i.purpose ?? '').includes('maskable'))) fail('one icon is maskable')
  else ok('one icon is maskable')

  const absent = icons.map((i) => i.src).filter((src) => !files.includes(src))
  if (absent.length > 0) fail('every icon the manifest names exists', absent.join(', '))
  else ok('every icon the manifest names exists')

  if (!manifest.start_url) fail('the manifest has a start_url')
  else ok('the manifest has a start_url')
} catch (err) {
  fail('the manifest can be read', err.message)
}

console.log(problems.length === 0 ? '\nBUILD OK' : `\n${problems.length} PROBLEM(S)`)
process.exit(problems.length === 0 ? 0 : 1)
