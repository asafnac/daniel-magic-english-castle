/**
 * קלט תנועה: חצים, WASD, וכפתורי מגע על המסך.
 *
 * שלושת אמצעי הקלט מזינים את אותו וקטור כיוון, כך שאין שום הבדל
 * בהתנהגות המשחק בין מקלדת למגע.
 */

import { el } from '../ui/dom'

const KEY_MAP: Record<string, { x: number; z: number }> = {
  ArrowUp: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 },
  ArrowLeft: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  KeyW: { x: 0, z: -1 },
  KeyS: { x: 0, z: 1 },
  KeyA: { x: -1, z: 0 },
  KeyD: { x: 1, z: 0 },
}

export class Controls {
  private pressed = new Set<string>()
  private touch = { x: 0, z: 0 }
  private enabled = true
  private cleanups: (() => void)[] = []
  readonly pad: HTMLElement

  /** נקרא כשלוחצים על מקש האינטראקציה. */
  onInteract: (() => void) | null = null

  constructor(container: HTMLElement) {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.enabled) return
      if (e.code === 'Space' || e.code === 'Enter') {
        // רווח ואנטר לא אמורים לגלול או להפעיל כפתור ברקע
        if (document.activeElement === document.body) {
          e.preventDefault()
          this.onInteract?.()
        }
        return
      }
      if (KEY_MAP[e.code]) {
        e.preventDefault()
        this.pressed.add(e.code)
        this.pad.classList.add('dim')
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      this.pressed.delete(e.code)
    }
    const onBlur = () => this.pressed.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    this.cleanups.push(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    })

    this.pad = this.buildPad()
    container.appendChild(this.pad)
  }

  private buildPad(): HTMLElement {
    const pad = el('div', { class: 'touch-pad', role: 'group', ariaLabel: 'כפתורי תנועה' })

    const makeBtn = (label: string, dir: { x: number; z: number }, cls: string, aria: string) => {
      const b = el('button', { class: `pad-btn ${cls}`, type: 'button', text: label, ariaLabel: aria })
      const press = (e: PointerEvent) => {
        e.preventDefault()
        pad.classList.remove('dim')
        this.touch = dir
        b.setPointerCapture(e.pointerId)
        b.classList.add('active')
      }
      const release = () => {
        this.touch = { x: 0, z: 0 }
        b.classList.remove('active')
      }
      b.addEventListener('pointerdown', press)
      b.addEventListener('pointerup', release)
      b.addEventListener('pointercancel', release)
      b.addEventListener('pointerleave', release)
      // גם מקלדת: מחזיקים רווח על הכפתור
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') this.touch = dir
      })
      b.addEventListener('keyup', release)
      b.addEventListener('blur', release)
      return b
    }

    pad.appendChild(makeBtn('▲', { x: 0, z: -1 }, 'up', 'קדימה'))
    pad.appendChild(makeBtn('◀', { x: -1, z: 0 }, 'left', 'שמאלה'))
    pad.appendChild(makeBtn('▶', { x: 1, z: 0 }, 'right', 'ימינה'))
    pad.appendChild(makeBtn('▼', { x: 0, z: 1 }, 'down', 'אחורה'))
    return pad
  }

  /** כיוון התנועה המבוקש, מנורמל. */
  direction(): { x: number; z: number } {
    if (!this.enabled) return { x: 0, z: 0 }
    let x = this.touch.x
    let z = this.touch.z
    for (const code of this.pressed) {
      const d = KEY_MAP[code]
      if (d) {
        x += d.x
        z += d.z
      }
    }
    const len = Math.hypot(x, z)
    if (len < 0.001) return { x: 0, z: 0 }
    return { x: x / len, z: z / len }
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    this.pressed.clear()
    this.touch = { x: 0, z: 0 }
    this.pad.classList.toggle('hidden', !on)
  }

  dispose(): void {
    for (const c of this.cleanups) c()
    this.cleanups = []
    this.pad.remove()
  }
}
