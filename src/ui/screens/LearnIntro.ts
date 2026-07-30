/**
 * שלב ההיכרות, לפני המשימות של אזור.
 *
 * כאן אין שאלות, אין יהלומים ואין דרך לטעות. דניאל פשוט פוגשת את
 * המילים החדשות: רואה את התמונה, שומעת את המילה, ורואה את התרגום.
 * זה המקום היחיד במשחק שבו המילה באנגלית מוצגת בכתב תמיד, כי כאן זו
 * חשיפה לצורת המילה ולא דרישה לקרוא אותה.
 */

import { getArea } from '../../learning/areas'
import { sfxClick, sfxStar } from '../../learning/audio'
import { getWord } from '../../learning/vocabulary'
import { bigButton, el } from '../dom'
import { playWord, sayInstruction } from '../components/SpeakerButton'

export interface LearnIntroDeps {
  areaId: string
  onStart: () => void
  onSkip: () => void
}

export function buildLearnIntro(deps: LearnIntroDeps): HTMLElement {
  const area = getArea(deps.areaId)
  const words = area.words.map(getWord)

  const screen = el('div', { class: 'screen learn-screen' })
  screen.style.setProperty('--accent', area.accent)

  const header = el('div', { class: 'card learn-header' })
  header.appendChild(el('div', { class: 'learn-emoji', text: area.emoji }))
  header.appendChild(el('h1', { class: 'screen-title', text: area.title }))

  const introRow = el('div', { class: 'learn-intro-row' })
  introRow.appendChild(
    el('button', {
      class: 'speaker-btn small he',
      type: 'button',
      text: '🔈',
      ariaLabel: 'להשמיע את מה שהדמות אומרת',
      onClick: () => sayInstruction(area.intro),
    }),
  )
  introRow.appendChild(el('p', { class: 'learn-intro-text', text: `${area.guide.emoji} ${area.intro}` }))
  header.appendChild(introRow)
  header.appendChild(el('p', { class: 'screen-sub', text: 'לחצי על כל מילה כדי לשמוע אותה. אין כאן שאלות.' }))
  screen.appendChild(header)

  const grid = el('div', { class: 'learn-grid' })
  for (const word of words) {
    const card = el('button', {
      class: 'learn-card',
      type: 'button',
      ariaLabel: `${word.english}, בעברית ${word.hebrew}. לחצי כדי לשמוע`,
    })

    const glyph = el('span', { class: 'learn-card-emoji', text: word.emoji })
    // מילות גודל מוצגות בקנה המידה שלהן, אחרת "גדול" ו"קטן" נראים זהים
    if (word.sizeHint) glyph.style.fontSize = word.sizeHint === 'small' ? '2rem' : '4.4rem'
    card.appendChild(glyph)

    card.appendChild(el('span', { class: 'learn-card-en', text: word.english }))
    card.appendChild(el('span', { class: 'learn-card-he', text: word.hebrew }))
    card.appendChild(el('span', { class: 'learn-card-speaker', text: '🔊' }))

    card.addEventListener('click', () => {
      sfxClick()
      playWord(word.sentence ?? word.english, card)
      card.classList.remove('heard')
      void card.offsetWidth
      card.classList.add('heard')
    })

    grid.appendChild(card)
  }
  screen.appendChild(grid)

  const actions = el('div', { class: 'row screen-actions' })
  const start = bigButton('בואי נתחיל!', () => {
    sfxStar()
    deps.onStart()
  }, { emoji: '🌟', variant: 'gold' })
  actions.appendChild(start)
  actions.appendChild(bigButton('דלגי', () => deps.onSkip(), { emoji: '⏭️', variant: 'ghost small' }))
  screen.appendChild(actions)

  window.setTimeout(() => start.focus(), 100)
  return screen
}
