/**
 * הפרס.
 *
 * לא מספר שעולה, אלא **דבר שנשאר**. הפריט מוצג בגדול, נאמר מאיפה
 * הוא הגיע, והוא נכנס לאוסף שאפשר לחזור ולהסתכל עליו.
 *
 * המשפט "מאיפה הוא הגיע" הוא לא קישוט: פריט שמזכיר מה עשית שווה
 * הרבה יותר מפריט שסתם קיבלת, וזה ההבדל בין אוסף לבין מונה.
 */

import { getItem } from '../../learning/items'
import { bigButton, el } from '../dom'

export interface RewardDeps {
  itemId: string
  text: string
  onDone: () => void
}

export function buildRewardScreen(deps: RewardDeps): HTMLElement {
  const item = getItem(deps.itemId)
  const screen = el('div', { class: 'screen reward-screen' })

  const card = el('div', { class: 'card reward-card' })
  card.appendChild(el('p', { class: 'reward-eyebrow', text: 'קיבלת משהו!' }))
  card.appendChild(el('div', { class: 'reward-emoji', text: item.emoji }))
  card.appendChild(el('h1', { class: 'reward-name', text: item.name }))
  card.appendChild(el('p', { class: 'reward-from', text: item.from }))
  card.appendChild(el('p', { class: 'reward-text', text: deps.text }))
  card.appendChild(bigButton('יש!', () => deps.onDone(), { emoji: '🎉', variant: 'gold' }))

  screen.appendChild(card)
  window.setTimeout(() => card.querySelector<HTMLButtonElement>('.big-btn')?.focus({ preventScroll: true }), 80)
  return screen
}
