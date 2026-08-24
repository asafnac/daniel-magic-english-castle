/**
 * החדר של דניאל.
 *
 * המקום שבו יושב כל מה שהיא אספה. הוא קיים משתי סיבות, ושתיהן
 * חשובות יותר משנדמה:
 *
 * **פרס שאי אפשר לחזור ולראות הוא לא פרס.** דרקון שקיבלת פעם אחת
 * ונעלם הוא הודעה, לא רכוש. חדר שאפשר להיכנס אליו הופך את הפריט
 * לדבר שיש לך.
 *
 * **זו הסיבה לחזור מחר.** לא "נשארו לך 4 מילים", אלא "יש לי חדר,
 * ויש בו מקומות ריקים". ריק שמסומן הוא הזמנה, ולכן מוצג גם מה
 * שעוד לא נאסף - כצללית, בלי שם, בלי לספר מה זה.
 */

import { ITEMS, KIND_LABEL, type ItemKind } from '../../learning/items'
import { getProgress } from '../../learning/progress'
import { bigButton, el } from '../dom'

export function buildRoomScreen(onBack: () => void): HTMLElement {
  const save = getProgress()
  const owned = new Set(save.collected)

  const screen = el('div', { class: 'screen room-screen' })
  screen.appendChild(el('h1', { class: 'screen-title', text: 'החדר שלי' }))

  if (owned.size === 0) {
    screen.appendChild(el('p', { class: 'screen-sub', text: 'עוד אין כאן כלום. תעזרי לדמויות בסיפור, והחדר יתמלא.' }))
  } else {
    screen.appendChild(el('p', { class: 'screen-sub', text: `אספת ${owned.size} מתוך ${ITEMS.length}` }))
  }

  const card = el('div', { class: 'card room-card' })

  const kinds: ItemKind[] = ['pet', 'outfit', 'crown', 'thing']
  for (const kind of kinds) {
    const items = ITEMS.filter((i) => i.kind === kind)
    if (items.length === 0) continue

    card.appendChild(el('h2', { class: 'room-kind', text: KIND_LABEL[kind] }))
    const grid = el('div', { class: 'room-grid' })
    for (const item of items) {
      const has = owned.has(item.id)
      const slot = el('div', { class: `room-slot ${has ? 'has' : 'empty'}`.trim() })
      slot.appendChild(el('span', { class: 'room-slot-emoji', text: has ? item.emoji : '❔' }))
      slot.appendChild(el('span', { class: 'room-slot-name', text: has ? item.name : 'עוד לא' }))
      if (has) slot.appendChild(el('span', { class: 'room-slot-from', text: item.from }))
      grid.appendChild(slot)
    }
    card.appendChild(grid)
  }

  screen.appendChild(card)
  const back = bigButton('חזרה', onBack, { emoji: '↩️', variant: 'gold' })
  screen.appendChild(el('div', { class: 'row screen-actions' }, [back]))
  window.setTimeout(() => back.focus({ preventScroll: true }), 80)
  return screen
}
