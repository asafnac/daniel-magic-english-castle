/**
 * מפת הטירה, עם קפיצה ישירה לאזור.
 *
 * עם תשעה אזורים הדרך מהכניסה לאזור האחרון היא הליכה ארוכה, וזה בדיוק
 * הדבר שגורם לילדה לוותר לפני שהיא מגיעה למשימה. מכאן היא קופצת ישר
 * לכל אזור שכבר נפתח.
 */

import { AREAS } from '../../learning/areas'
import { sfxClick } from '../../learning/audio'
import { getProgress } from '../../learning/progress'
import { bigButton, el } from '../dom'

export interface MapDeps {
  onTravel: (areaId: string) => void
  onBack: () => void
}

export function buildMapScreen(deps: MapDeps): HTMLElement {
  const save = getProgress()
  const screen = el('div', { class: 'screen map-screen' })
  screen.appendChild(el('h1', { class: 'screen-title', text: 'מפת הטירה' }))
  screen.appendChild(el('p', { class: 'screen-sub', text: 'לחצי על אזור שנפתח כדי לקפוץ אליו ישר' }))

  const grid = el('div', { class: 'map-grid' })

  for (const area of AREAS) {
    const ap = save.areas[area.id]
    const unlocked = ap?.unlocked ?? false
    const total = area.tasks.length
    const done = Math.min(ap?.completedTasks ?? 0, total)
    const previous = AREAS.find((a) => a.order === area.order - 1)

    const card = el('button', {
      class: `map-card ${unlocked ? '' : 'locked'}`.trim(),
      type: 'button',
      ariaLabel: unlocked
        ? `${area.title}, ${done} מתוך ${total} משימות. לחצי כדי לקפוץ לכאן`
        : `${area.title}, נעול. ייפתח אחרי ${previous?.title ?? ''}`,
    })
    card.style.setProperty('--accent', area.accent)

    card.appendChild(el('span', { class: 'map-card-order', text: String(area.order) }))
    card.appendChild(el('span', { class: 'map-card-emoji', text: unlocked ? area.emoji : '🔒' }))
    card.appendChild(el('span', { class: 'map-card-title', text: area.title }))

    if (unlocked) {
      card.appendChild(
        el('span', { class: 'map-card-bar' }, [el('i', { style: { width: `${(done / total) * 100}%` } })]),
      )
      card.appendChild(
        el('span', { class: 'map-card-note', text: ap?.done ? 'סיימת 🎉' : `${done} מתוך ${total}` }),
      )
      card.addEventListener('click', () => {
        sfxClick()
        deps.onTravel(area.id)
      })
    } else {
      card.disabled = true
      card.appendChild(el('span', { class: 'map-card-note', text: `אחרי ${previous?.title ?? ''}` }))
    }

    grid.appendChild(card)
  }

  screen.appendChild(grid)

  const back = bigButton('חזרה', deps.onBack, { emoji: '↩️', variant: 'gold' })
  screen.appendChild(el('div', { class: 'row screen-actions' }, [back]))
  window.setTimeout(() => back.focus(), 80)
  return screen
}
