/**
 * המסך של המרדף.
 *
 * שכבה דקה מעל ChaseGame: אצבע נכנסת, ציור יוצא. כל הלוגיקה שם,
 * וכאן רק מה שבאמת שייך למסך.
 *
 * הבקרה היא **האצבע ישירות**, בלי ג'ויסטיק ובלי חצים. על טאבלט זו
 * הדרך הכי מיידית שיש, ולילדה בת שמונה אין מה ללמוד לפני שמתחילים -
 * שמים אצבע, והנסיכה באה.
 *
 * הכל מצויר ב-canvas מצורות ומאמוג'י, כמו כל שאר המשחק. אין כאן
 * אף קובץ חיצוני.
 */

import { ChaseGame } from '../../game/chase'
import { sfxStar, sfxSuccess } from '../../learning/audio'
import { bigButton, el } from '../dom'

export interface ChaseDeps {
  onDone: () => void
  onExit?: () => void
}

export function buildChaseScreen(deps: ChaseDeps): { root: HTMLElement; dispose: () => void } {
  const game = new ChaseGame()
  let raf = 0
  let last = 0
  let finished = false
  let sparkles: { x: number; y: number; life: number; emoji: string }[] = []

  const screen = el('div', { class: 'screen chase-screen' })

  const top = el('div', { class: 'chase-top' })
  if (deps.onExit) {
    top.appendChild(bigButton('יציאה', () => leave(), { emoji: '✖', variant: 'ghost small', ariaLabel: 'לצאת מהמרדף' }))
  }
  const status = el('span', { class: 'chase-status', role: 'status', text: 'תפסי את פיפ! 🐉' })
  top.appendChild(status)
  const apples = el('span', { class: 'chase-apples', ariaLabel: 'תפוחים שנשארו' })
  top.appendChild(apples)
  screen.appendChild(top)

  const canvas = el('canvas', { class: 'chase-canvas' }) as HTMLCanvasElement
  canvas.setAttribute('aria-label', 'מגרש המרדף. גררי את האצבע כדי להזיז את הנסיכה')
  screen.appendChild(canvas)

  const hint = el('p', { class: 'chase-hint', text: 'שימי אצבע על המסך והנסיכה תלך לשם' })
  screen.appendChild(hint)

  const actions = el('div', { class: 'row chase-actions' })
  screen.appendChild(actions)

  // ---------------------------------------------------------- אצבע

  const aim = (e: PointerEvent): void => {
    const box = canvas.getBoundingClientRect()
    const size = Math.min(box.width, box.height)
    const left = box.left + (box.width - size) / 2
    const top2 = box.top + (box.height - size) / 2
    game.target = { x: (e.clientX - left) / size, y: (e.clientY - top2) / size }
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId)
    hint.classList.add('faded')
    aim(e)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (e.pressure > 0 || e.buttons > 0 || e.pointerType === 'touch') aim(e)
  })

  // מקלדת, לשלמות: מי שמשחקת במחשב לא צריכה עכבר דווקא.
  screen.addEventListener('keydown', (e) => {
    const step = 0.08
    if (e.key === 'ArrowUp') game.target = { ...game.target, y: game.target.y - step }
    else if (e.key === 'ArrowDown') game.target = { ...game.target, y: game.target.y + step }
    else if (e.key === 'ArrowLeft') game.target = { ...game.target, x: game.target.x - step }
    else if (e.key === 'ArrowRight') game.target = { ...game.target, x: game.target.x + step }
    else return
    e.preventDefault()
  })

  // ---------------------------------------------------------- ציור

  function draw(): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const box = canvas.getBoundingClientRect()
    if (canvas.width !== Math.round(box.width * dpr) || canvas.height !== Math.round(box.height * dpr)) {
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, box.width, box.height)

    const size = Math.min(box.width, box.height)
    const ox = (box.width - size) / 2
    const oy = (box.height - size) / 2
    const px = (v: number): number => ox + v * size
    const py = (v: number): number => oy + v * size

    // הדשא
    const grass = ctx.createLinearGradient(0, oy, 0, oy + size)
    grass.addColorStop(0, '#8fd48b')
    grass.addColorStop(1, '#63b96a')
    ctx.fillStyle = grass
    roundRect(ctx, ox, oy, size, size, size * 0.05)
    ctx.fill()

    // פרחים קבועים, כדי שהגינה תיראה כמו מקום ולא כמו מגרש ריק
    ctx.font = `${size * 0.045}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const f of FLOWERS) ctx.fillText(f.e, px(f.x), py(f.y))

    // תפוחים
    ctx.font = `${size * 0.062}px system-ui`
    for (const apple of game.state.apples) {
      if (apple.eaten) continue
      ctx.fillText('🍎', px(apple.pos.x), py(apple.pos.y))
    }

    // ניצוצות
    ctx.font = `${size * 0.05}px system-ui`
    for (const s of sparkles) {
      ctx.globalAlpha = Math.max(0, s.life)
      ctx.fillText(s.emoji, px(s.x), py(s.y) - (1 - s.life) * size * 0.08)
    }
    ctx.globalAlpha = 1

    // פיפ. כשהוא אוכל הוא מתנדנד, כדי שיהיה ברור שזה הרגע.
    const eating = game.state.eating > 0
    const wob = eating ? Math.sin(game.state.time * 18) * 0.12 : 0
    ctx.save()
    ctx.translate(px(game.state.pip.x), py(game.state.pip.y))
    ctx.rotate(wob)
    ctx.font = `${size * (eating ? 0.115 : 0.1)}px system-ui`
    ctx.fillText('🐉', 0, 0)
    ctx.restore()

    // הנסיכה
    ctx.font = `${size * 0.1}px system-ui`
    ctx.fillText('👸', px(game.state.princess.x), py(game.state.princess.y))

    // קרובה מאוד: טבעת רכה סביבה
    if (game.state.close && !game.state.caught) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = size * 0.012
      ctx.beginPath()
      ctx.arc(px(game.state.princess.x), py(game.state.princess.y), size * 0.09, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // ---------------------------------------------------------- לולאה

  let eatenBefore = 0

  function frame(now: number): void {
    const dt = last ? (now - last) / 1000 : 0
    last = now
    game.step(dt)

    // תפוח שנאכל: ניצוץ קטן במקום, ורמז שזה הרגע לתפוס
    if (game.eatenApples !== eatenBefore) {
      eatenBefore = game.eatenApples
      sparkles.push({ x: game.state.pip.x, y: game.state.pip.y, life: 1, emoji: '✨' })
      status.textContent = 'עכשיו! הוא עצר לאכול 🍎'
      sfxStar()
    } else if (!game.state.caught && game.state.eating === 0 && status.textContent?.startsWith('עכשיו')) {
      status.textContent = 'תפסי את פיפ! 🐉'
    }

    sparkles = sparkles.filter((s) => (s.life -= dt * 1.4) > 0)
    apples.textContent = '🍎'.repeat(game.state.apples.filter((a) => !a.eaten).length)

    draw()

    if (game.state.caught && !finished) {
      finished = true
      status.textContent = 'תפסת אותו! 🎉'
      hint.textContent = 'פיפ צוחק. הוא בכלל רצה שתשחקי איתו.'
      sfxSuccess()
      actions.appendChild(bigButton('הלאה', () => finish(), { emoji: '▶️', variant: 'gold' }))
      window.setTimeout(() => actions.querySelector<HTMLButtonElement>('.big-btn')?.focus({ preventScroll: true }), 60)
    }

    raf = window.requestAnimationFrame(frame)
  }

  function finish(): void {
    stop()
    deps.onDone()
  }

  function leave(): void {
    stop()
    deps.onExit?.()
  }

  function stop(): void {
    if (raf) window.cancelAnimationFrame(raf)
    raf = 0
  }

  raf = window.requestAnimationFrame(frame)
  window.setTimeout(() => screen.focus({ preventScroll: true }), 60)
  screen.tabIndex = -1

  return { root: screen, dispose: stop }
}

/** פרחים דקורטיביים. קבועים, כדי שהגינה תיראה אותו דבר בכל כניסה. */
const FLOWERS = [
  { x: 0.1, y: 0.12, e: '🌼' },
  { x: 0.9, y: 0.14, e: '🌷' },
  { x: 0.07, y: 0.5, e: '🌸' },
  { x: 0.93, y: 0.55, e: '🌼' },
  { x: 0.3, y: 0.93, e: '🌷' },
  { x: 0.72, y: 0.9, e: '🌸' },
  { x: 0.5, y: 0.06, e: '🌳' },
  { x: 0.12, y: 0.85, e: '🌳' },
  { x: 0.88, y: 0.82, e: '🌳' },
]
