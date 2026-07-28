/** הודעה קצרה שצפה למעלה. משמשת רק למידע נעים, אף פעם לא לשגיאות מלחיצות. */

import { el } from '../dom'

let node: HTMLElement | null = null
let timer: number | undefined

export function toast(message: string, ms = 2600): void {
  if (!node) {
    node = el('div', { class: 'toast', role: 'status' })
    document.body.appendChild(node)
  }
  node.textContent = message
  // מאלץ reflow כדי שהאנימציה תרוץ גם בהודעות רצופות
  void node.offsetWidth
  node.classList.add('show')
  if (timer !== undefined) window.clearTimeout(timer)
  timer = window.setTimeout(() => node?.classList.remove('show'), ms)
}
