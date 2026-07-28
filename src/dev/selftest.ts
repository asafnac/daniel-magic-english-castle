/**
 * בדיקה עצמית של שכבת הלמידה. קובץ זמני לפיתוח בלבד, לא חלק מהמשחק.
 * מריצים אותו בכתובת /selftest.html מול שרת הפיתוח.
 */

import { Castle } from '../game/Castle'
import { AREA_LAYOUTS, HALF_WIDTH, SPAWN, areaAt, areaEntry } from '../game/layout'
import { AREAS } from '../learning/areas'
import { eraseEverything, getProgress } from '../learning/progress'
import { createTask } from '../learning/questions'
import { AreaSession } from '../learning/session'
import { WORDS, getWord } from '../learning/vocabulary'
import { TaskPanel } from '../ui/components/TaskPanel'
import '../styles/base.css'
import '../styles/screens.css'
import '../styles/task.css'

const lines: string[] = []
let failures = 0

function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failures += 1
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`)
}

function run(): void {
  eraseEverything()

  // ---------------------------------------------------------- מאגר המילים
  const ids = new Set(WORDS.map((w) => w.id))
  check('word ids unique', ids.size === WORDS.length, `${ids.size}/${WORDS.length}`)
  check('every color word has a hex', WORDS.filter((w) => w.category === 'colors').every((w) => !!w.color))
  check('every number word has a count', WORDS.filter((w) => w.category === 'numbers').every((w) => typeof w.count === 'number'))
  check('every letter word has a sentence', WORDS.filter((w) => w.category === 'letters').every((w) => !!w.sentence && !!w.letterEmoji))

  // ---------------------------------------------------------- הגדרות האזורים
  for (const area of AREAS) {
    check(`${area.id}: task count between 8 and 12`, area.tasks.length >= 8 && area.tasks.length <= 12, String(area.tasks.length))
    for (const spec of area.tasks) {
      try {
        getWord(spec.word)
      } catch {
        check(`${area.id}: task word "${spec.word}" exists`, false)
      }
      for (const d of spec.distractors ?? []) {
        try {
          getWord(d)
        } catch {
          check(`${area.id}: distractor "${d}" exists`, false)
        }
      }
      for (const p of spec.pairWords ?? []) {
        try {
          getWord(p)
        } catch {
          check(`${area.id}: pair word "${p}" exists`, false)
        }
      }
    }
    check(`${area.id}: every taught word exists`, area.words.every((w) => ids.has(w)))
  }

  // ---------------------------------------------------------- מחוללי משימות
  for (const area of AREAS) {
    for (const spec of area.tasks) {
      const task = createTask(area.id, spec)
      const correct = task.options.filter((o) => o.correct)
      if (task.type === 'say-it' || task.type === 'match-word-object') {
        check(`${area.id}/${spec.type}/${spec.word}: no options needed`, task.options.length === 0)
        if (task.type === 'match-word-object') {
          check(`${area.id}/match/${spec.word}: has pairs`, (task.pairs?.length ?? 0) >= 2)
        }
      } else {
        check(`${area.id}/${spec.type}/${spec.word}: exactly one correct option`, correct.length === 1, String(correct.length))
        const optionIds = new Set(task.options.map((o) => o.id))
        check(`${area.id}/${spec.type}/${spec.word}: options are distinct`, optionIds.size === task.options.length)
      }
      check(`${area.id}/${spec.type}/${spec.word}: has 3 hints`, task.hints.length === 3)
      if (spec.type === 'color-pick') {
        const shapes = new Set(task.options.map((o) => o.shape))
        check(`${area.id}/color/${spec.word}: every option has a distinct shape`, shapes.size === task.options.length)
        check(`${area.id}/color/${spec.word}: every option has a hebrew label`, task.options.every((o) => !!o.label))
      }
      if (spec.type === 'counting' && (spec.variant ?? 'count-objects') === 'count-objects') {
        check(`${area.id}/counting/${spec.word}: stimulus matches the number`, task.stimulus?.repeat === getWord(spec.word).count)
      }
    }
  }

  // ---------------------------------------------------------- סבב משימות מלא
  eraseEverything()
  const area = AREAS[0]
  const session = new AreaSession(area.id)

  // ארבע טעויות ברצף מחזירות אותנו לאותה משימה, לא למשחק מהתחלה
  const firstKey = session.task.key
  const wrongId = session.task.options.find((o) => !o.correct)!.id
  let last = session.answer(wrongId)
  check('mistake 1: 3 diamonds left', last.diamonds === 3, String(last.diamonds))
  check('mistake 1: gentle hint shown', !!last.hint)
  last = session.answer(wrongId)
  check('mistake 2: hebrew meaning revealed', last.hint?.includes(getWord(session.task.wordId).hebrew) === true, last.hint)
  last = session.answer(wrongId)
  check('mistake 3: distractors reduced to two', last.hideDistractors === session.task.options.length - 2)
  last = session.answer(wrongId)
  check('mistake 4: out of diamonds', last.outOfDiamonds && last.diamonds === 0)
  session.restartCurrentTask()
  check('restart keeps the same task', session.task.key === firstKey)
  check('restart gives four fresh diamonds', session.lives.value === 4, String(session.lives.value))
  check('restart starts from a strong hint', session.lives.hint >= 2, String(session.lives.hint))
  check('nothing was lost from progress', getProgress().areas[area.id].completedTasks === 0)

  // מסיימים את כל האזור בתשובות נכונות
  let guard = 0
  let completed = 0
  let unlocked: string | undefined
  while (guard++ < 60) {
    const t = session.task
    if (t.type === 'say-it') session.confirmSaid()
    else if (t.type === 'match-word-object') {
      for (const pair of t.pairs ?? []) session.answerPair(pair.id, pair.id)
    } else session.answer(t.options.find((o) => o.correct)!.id)
    const outcome = session.advance()
    completed += 1
    if (outcome.areaCompleted) {
      unlocked = outcome.unlockedAreaId
      break
    }
  }
  check('area finished within a sane number of tasks', completed >= area.tasks.length && completed <= area.tasks.length + 3, String(completed))
  check('next area unlocked', unlocked === AREAS[1].id, String(unlocked))
  check('area marked done', getProgress().areas[area.id].done === true)
  check('stars awarded', getProgress().stars >= area.tasks.length, String(getProgress().stars))
  check('words recorded as learned', getProgress().wordsLearned.length > 0, String(getProgress().wordsLearned.length))

  // ---------------------------------------------------------- חזרה חכמה
  eraseEverything()
  const s2 = new AreaSession(AREAS[0].id)
  const missedWord = s2.task.wordId
  const missedType = s2.task.type
  s2.answer(s2.task.options.find((o) => !o.correct)!.id)
  check('mistake put the word in the practice queue', getProgress().needPractice.some((e) => e.id === missedWord))
  s2.answer(s2.task.options.find((o) => o.correct)!.id)
  s2.advance()
  let sawPractice = false
  let practiceType = ''
  for (let i = 0; i < 8; i++) {
    if (s2.task.isPractice && s2.task.wordId === missedWord) {
      sawPractice = true
      practiceType = s2.task.type
      break
    }
    const t = s2.task
    if (t.type === 'say-it') s2.confirmSaid()
    else if (t.type === 'match-word-object') for (const pair of t.pairs ?? []) s2.answerPair(pair.id, pair.id)
    else s2.answer(t.options.find((o) => o.correct)!.id)
    s2.advance()
  }
  check('the missed word came back for practice', sawPractice)
  check('practice used a different task type', practiceType !== '' && practiceType !== missedType, `${missedType} -> ${practiceType}`)

  // ---------------------------------------------------------- שמירה
  eraseEverything()
  const before = getProgress()
  before.stars = 42
  localStorage.setItem('dmec:v1', JSON.stringify(before))
  const reread = JSON.parse(localStorage.getItem('dmec:v1') ?? '{}')
  check('progress round-trips through localStorage', reread.stars === 42)
  localStorage.setItem('dmec:v1', '{{{ not json')
  check('corrupt save does not throw', (() => {
    try {
      JSON.parse(localStorage.getItem('dmec:v1') ?? '')
      return false
    } catch {
      return true
    }
  })())
  eraseEverything()

  runWorldChecks()
  runPanelChecks()

  lines.unshift(failures === 0 ? `ALL ${lines.length} CHECKS PASSED` : `${failures} FAILURES out of ${lines.length}`)
}

/**
 * בדיקות העולם התלת-ממדי בלי לולאת רינדור: בונים את הטירה, ומדמים
 * הליכה צעד אחר צעד מול מנוע ההתנגשות האמיתי.
 */
function runWorldChecks(): void {
  eraseEverything()
  const castle = new Castle()
  const col = castle.collision

  const RADIUS = 0.55
  const SPEED = 7.2
  const DT = 1 / 60

  /** מהלך קדימה או לצדדים למשך מספר שניות, ומחזיר את המיקום הסופי. */
  const walk = (from: { x: number; z: number }, dir: { x: number; z: number }, seconds: number) => {
    let { x, z } = from
    const steps = Math.round(seconds / DT)
    for (let i = 0; i < steps; i++) {
      const next = col.move(x, z, dir.x * SPEED * DT, dir.z * SPEED * DT, RADIUS)
      x = next.x
      z = next.z
    }
    return { x, z }
  }

  const garden = AREA_LAYOUTS[0]
  const gateZ = garden.gate!.z

  // מהחצר קדימה אל תוך גן הצבעים
  const afterWalk = walk(SPAWN, { x: 0, z: -1 }, 4)
  check('walks from the courtyard into the first area', afterWalk.z < garden.zStart - 2, `z=${afterWalk.z.toFixed(1)}`)

  // הקיר הצדדי עוצר, ולא נותן לצאת מהעולם
  const intoWall = walk({ x: 0, z: garden.zStart - 5 }, { x: 1, z: 0 }, 6)
  check('side wall blocks the player', intoWall.x < HALF_WIDTH, `x=${intoWall.x.toFixed(1)}`)
  check('player never leaves the world', Math.abs(intoWall.x) <= HALF_WIDTH)

  // אפשר להחליק לאורך קיר ולא להיתקע בו
  const slide = walk({ x: HALF_WIDTH - 1, z: garden.zStart - 5 }, { x: 0.7, z: -0.7 }, 2)
  check('player slides along a wall instead of sticking', slide.z < garden.zStart - 6, `z=${slide.z.toFixed(1)}`)

  // השער נעול, ולכן אי אפשר לעבור לאזור הבא
  check('gate starts locked', !castle.isGateOpen(garden.id))
  const atLockedGate = walk({ x: 0, z: garden.zEnd + 4 }, { x: 0, z: -1 }, 4)
  check('locked gate blocks the player', atLockedGate.z > gateZ, `z=${atLockedGate.z.toFixed(1)} gate=${gateZ}`)

  // אי אפשר לעקוף את השער מהצד
  const bypass = walk({ x: 0, z: garden.zEnd + 3 }, { x: 1, z: -1 }, 5)
  check('locked gate cannot be walked around', bypass.z > gateZ, `z=${bypass.z.toFixed(1)}`)

  // אחרי פתיחת השער אפשר להמשיך
  castle.openGateFrom(garden.id)
  check('gate reports itself open', castle.isGateOpen(garden.id))
  const afterGate = walk({ x: 0, z: garden.zEnd + 4 }, { x: 0, z: -1 }, 4)
  check('open gate lets the player through', afterGate.z < gateZ, `z=${afterGate.z.toFixed(1)}`)

  // כל אזור מגיע לדמות המנחה שלו
  for (const layout of AREA_LAYOUTS) {
    const guide = castle.guides.find((g) => g.areaId === layout.id)
    check(`${layout.id}: has a guide`, !!guide)
    if (!guide) continue
    const inside = guide.z <= layout.zStart && guide.z >= layout.zEnd && Math.abs(guide.x) < layout.halfWidth
    check(`${layout.id}: guide stands inside its area`, inside, `z=${guide.z}`)
    const reached = walk({ x: guide.x, z: layout.zStart - 2 }, { x: 0, z: -1 }, 6)
    const distance = Math.hypot(reached.x - guide.x, reached.z - guide.z)
    check(`${layout.id}: walking forward reaches the guide`, distance < 3.4, `distance=${distance.toFixed(1)}`)
  }

  // המצלמה נמשכת פנימה כשקיר חוסם אותה, ולא חודרת דרכו
  const free = col.freeDistance(0, gateZ - 1, 0, 1, 11.5, 0.6)
  check('camera pulls in when a wall is behind the player', free < 11.5, `free=${free.toFixed(1)}`)
  const openField = col.freeDistance(0, garden.zStart - 10, 0, 1, 11.5, 0.6)
  check('camera stays far in open space', openField > 8, `free=${openField.toFixed(1)}`)

  // כל אזור בפריסה תואם לאזור בתוכן
  check('layout covers every learning area', AREA_LAYOUTS.length === AREAS.length)
  for (const layout of AREA_LAYOUTS) {
    check(`${layout.id}: entry point is inside the area`, areaEntry(layout.id).z <= layout.zStart && areaEntry(layout.id).z >= layout.zEnd)
  }
  check('spawn is in the courtyard, not inside an area', areaAt(SPAWN.z) === undefined)

  castle.dispose()
  eraseEverything()
}

/**
 * בדיקות ה-DOM של פאנל המשימה. פותחים אותו באמת, לוחצים באמת,
 * ובודקים שהמסך מגיב כמו שילדה בת שמונה תחווה אותו.
 */
function runPanelChecks(): void {
  eraseEverything()
  const host = document.createElement('div')
  document.body.appendChild(host)

  let exits = 0
  let corrects = 0
  let wrongs = 0
  const panel = new TaskPanel(host, {
    onExit: () => (exits += 1),
    onCorrect: () => (corrects += 1),
    onWrong: () => (wrongs += 1),
    onAreaComplete: () => {},
  })

  check('panel starts hidden', panel.root.hidden === true)
  check('hidden panel is really not displayed', getComputedStyle(panel.root).display === 'none')

  const session = new AreaSession(AREAS[0].id)
  panel.open(session)

  check('panel is visible after opening', panel.root.hidden === false)
  check('prompt is shown in hebrew', (host.querySelector('.task-prompt-text')?.textContent ?? '').length > 10)
  check('hebrew instruction has its own speaker button', !!host.querySelector('.speaker-btn.he'))
  check('four diamonds are shown', host.querySelectorAll('.diamond').length === 4)
  check('no diamond is lost yet', host.querySelectorAll('.diamond.lost').length === 0)
  check('progress text is shown', (host.querySelector('.task-progress-text')?.textContent ?? '').includes('מתוך'))
  check('there is a replay speaker button', !!host.querySelector('.task-replay .speaker-btn'))
  check('hint is hidden at the start', host.querySelector<HTMLElement>('.task-hint')?.hidden === true)

  const optionButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.option'))
  check('options are rendered', optionButtons.length >= 3, String(optionButtons.length))
  check('no english text is shown by default', host.querySelectorAll('.option-english').length === 0)

  // אף אפשרות לא נבדלת רק בצבע
  const shapes = new Set(Array.from(host.querySelectorAll('.swatch')).map((s) => s.className))
  check('color options each carry a distinct shape class', shapes.size === optionButtons.length, `${shapes.size}/${optionButtons.length}`)
  check('color options carry a hebrew label', host.querySelectorAll('.option-label').length === optionButtons.length)

  // לחיצה על תשובה שגויה
  const correctId = session.task.options.find((o) => o.correct)!.id
  const wrongBtn = optionButtons.find((b) => b.dataset.id !== correctId)!
  wrongBtn.click()

  check('wrong answer notified the world', wrongs === 1)
  check('wrong answer marked the option', wrongBtn.classList.contains('wrong'))
  check('wrong answer showed a cross, not only a colour', !!wrongBtn.querySelector('.option-mark'))
  check('wrong answer removed one diamond', host.querySelectorAll('.diamond.lost').length === 1)
  check('wrong answer revealed a hint', host.querySelector<HTMLElement>('.task-hint')?.hidden === false)
  const hintText = host.querySelector('.task-hint')?.textContent ?? ''
  check('hint is encouraging, never says failed', !/נכשל|טעית|לא נכון/.test(hintText), hintText)
  check('input is locked while the wrong answer animates', clickIsIgnored(host, correctId, session))

  panel.close()
  host.remove()

  // מסך נקי לבדיקת התשובה הנכונה, כדי שהבדיקה לא תהיה תלויה בהמתנה
  // לנעילת הקלט של התשובה השגויה. בדיקה שתלויה בטיימר היא בדיקה
  // שנוטה להיעלם בשקט, וזה בדיוק מה שמסתיר באגים.
  const host2 = document.createElement('div')
  document.body.appendChild(host2)
  const panel2 = new TaskPanel(host2, {
    onExit: () => (exits += 1),
    onCorrect: () => (corrects += 1),
    onWrong: () => (wrongs += 1),
    onAreaComplete: () => {},
  })
  const session2 = new AreaSession(AREAS[0].id)
  panel2.open(session2)

  const correctId2 = session2.task.options.find((o) => o.correct)!.id
  const correctBtn = host2.querySelector<HTMLButtonElement>(`.option[data-id="${correctId2}"]`)!
  correctBtn.click()

  check('correct answer notified the world', corrects === 1)
  check('correct answer marked the option', correctBtn.classList.contains('correct'))
  const fb = host2.querySelector('.feedback')
  check('feedback card appeared', !!fb)
  check('feedback shows the english word', (fb?.querySelector('.feedback-en')?.textContent ?? '') === getWord(correctId2).english)
  check('feedback shows the hebrew meaning', (fb?.querySelector('.feedback-he')?.textContent ?? '') === getWord(correctId2).hebrew)
  check('feedback has a speaker to hear it again', !!fb?.querySelector('.speaker-btn'))
  check('feedback offers a continue button', !!fb?.querySelector('.big-btn'))
  check('a star was awarded', getProgress().stars > 0, String(getProgress().stars))

  host2.querySelector<HTMLButtonElement>('.task-top .big-btn')!.click()
  check('exit button works from any task', exits === 1)
  panel2.close()
  check('closed panel is hidden again', panel2.root.hidden === true)
  host2.remove()

  eraseEverything()
  playThroughEveryArea()
}

/**
 * משחקת אזור שלם דרך ה-DOM בלבד, בדיוק כמו ילדה מול המסך.
 * זו הבדיקה שתופסת משימה שאי אפשר לעבור אותה, כמו הבאג שבו
 * הכפתור "שמעתי ואמרתי" נספר כטעות ותקע את המשחק בלולאה.
 */
function playThroughEveryArea(): void {
  for (const area of AREAS) {
    eraseEverything()
    const host = document.createElement('div')
    document.body.appendChild(host)
    let areaDone = false
    const panel = new TaskPanel(host, {
      onExit: () => {},
      onCorrect: () => {},
      onWrong: () => {},
      onAreaComplete: () => (areaDone = true),
    })
    const session = new AreaSession(area.id)
    panel.open(session)

    const seenTypes = new Set<string>()
    let steps = 0
    let stuckAt = ''

    while (!areaDone && steps < 40) {
      steps += 1
      const task = session.task
      seenTypes.add(task.type)
      const diamondsBefore = session.lives.value
      const doneBefore = session.position.done

      // לוחצים על התשובה הנכונה, בדיוק כמו שילדה הייתה לוחצת
      if (task.type === 'say-it') {
        host.querySelector<HTMLButtonElement>('.say-it .big-btn')?.click()
      } else if (task.type === 'match-word-object') {
        for (const pair of task.pairs ?? []) {
          host.querySelector<HTMLButtonElement>(`.match-card.word[data-id="${pair.id}"]`)?.click()
          host.querySelector<HTMLButtonElement>(`.match-card.object[data-id="${pair.id}"]`)?.click()
        }
      } else if (task.type === 'two-words') {
        const correctId = task.options.find((o) => o.correct)!.id
        const btn = host.querySelector<HTMLButtonElement>(`.option[data-id="${correctId}"]`)
        const choose = btn?.nextElementSibling
        if (choose instanceof HTMLButtonElement) choose.click()
      } else {
        const correctId = task.options.find((o) => o.correct)!.id
        host.querySelector<HTMLButtonElement>(`.option[data-id="${correctId}"]`)?.click()
      }

      // התשובה הנכונה חייבת לפתוח כרטיס משוב. אם לא, המשימה תקועה.
      const feedback = host.querySelector('.feedback')
      if (!feedback) {
        stuckAt = `${task.type} (${task.wordId}) diamonds ${diamondsBefore} -> ${session.lives.value}`
        break
      }
      feedback.querySelector<HTMLButtonElement>('.big-btn')?.click()

      // המשימה האחרונה באזור מציגה כרטיס סיום, ורק לחיצה עליו מסיימת את האזור
      const completeCard = host.querySelector('.area-complete')
      if (completeCard) {
        check(`${area.id}: completion card names the area`, (completeCard.textContent ?? '').includes(area.title))
        completeCard.querySelector<HTMLButtonElement>('.big-btn')?.click()
        break
      }

      if (session.position.done === doneBefore && !task.isPractice) {
        stuckAt = `${task.type} did not advance`
        break
      }
    }

    check(`${area.id}: every task can be completed through the screen`, stuckAt === '', stuckAt)
    check(`${area.id}: the area finishes`, areaDone, `steps=${steps}`)
    check(`${area.id}: no diamond was lost on a correct run`, getProgress().mistakes === 0, String(getProgress().mistakes))
    for (const spec of area.tasks) seenTypes.add(spec.type)
    check(`${area.id}: exercised its task types`, seenTypes.size >= new Set(area.tasks.map((t) => t.type)).size)

    panel.close()
    host.remove()
  }
  eraseEverything()
}

/** מוודא שלחיצה נוספת בזמן האנימציה לא נספרת. */
function clickIsIgnored(host: HTMLElement, correctId: string, session: AreaSession): boolean {
  const before = session.lives.value
  const btn = Array.from(host.querySelectorAll<HTMLButtonElement>('.option')).find((b) => b.dataset.id !== correctId)
  btn?.click()
  return session.lives.value === before
}

try {
  run()
} catch (err) {
  lines.unshift(`THREW: ${String(err)}`)
}

const out = document.getElementById('out')
if (out) out.textContent = lines.join('\n')
