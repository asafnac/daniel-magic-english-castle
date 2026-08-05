/** תפריט עצירה. נפתח מכפתור בפינה או ממקש Escape. */

import { bigButton, el } from '../dom'

export interface PauseDeps {
  onResume: () => void
  onMap: () => void
  onLab: () => void
  onCustomize: () => void
  onProgress: () => void
  onSettings: () => void
  onTitle: () => void
}

export function buildPauseMenu(deps: PauseDeps): HTMLElement {
  const overlay = el('div', { class: 'pause-overlay', role: 'dialog', ariaLabel: 'תפריט המשחק' })
  const card = el('div', { class: 'card pause-card' })
  card.appendChild(el('div', { class: 'pause-emoji', text: '🏰' }))
  card.appendChild(el('h2', { class: 'screen-title', text: 'הפסקה קטנה' }))

  const resume = bigButton('לחזור לשחק', deps.onResume, { emoji: '▶️', variant: 'gold' })
  card.appendChild(resume)
  card.appendChild(bigButton('מפת הטירה', deps.onMap, { emoji: '🗺️', variant: 'sky' }))
  card.appendChild(bigButton('מעבדת המשפטים', deps.onLab, { emoji: '🪄', variant: 'sky' }))
  card.appendChild(bigButton('להחליף מראה', deps.onCustomize, { emoji: '👗', variant: 'ghost' }))
  card.appendChild(bigButton('ההתקדמות שלי', deps.onProgress, { emoji: '📊', variant: 'ghost' }))
  card.appendChild(bigButton('הגדרות', deps.onSettings, { emoji: '⚙️', variant: 'ghost' }))
  card.appendChild(bigButton('למסך הפתיחה', deps.onTitle, { emoji: '🏠', variant: 'ghost small' }))

  overlay.appendChild(card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) deps.onResume()
  })
  window.setTimeout(() => resume.focus(), 60)
  return overlay
}
