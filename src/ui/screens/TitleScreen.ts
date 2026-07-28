/**
 * מסך הפתיחה.
 *
 * זהו המקום היחיד שבו הקול והמוזיקה משתחררים, כי דפדפנים מרשים
 * להשמיע קול רק אחרי לחיצה אמיתית של המשתמש.
 */

import { startMusic, unlockAudio } from '../../learning/audio'
import { getProgress } from '../../learning/progress'
import { isSpeechSupported, unlockSpeech } from '../../learning/speech'
import { bigButton, el } from '../dom'

export interface TitleScreenDeps {
  onStart: () => void
  onCustomize: () => void
  onProgress: () => void
  onSettings: () => void
}

export function buildTitleScreen(deps: TitleScreenDeps): HTMLElement {
  const save = getProgress()
  const hasProgress = save.avatar !== null && save.stars > 0

  const screen = el('div', { class: 'screen title-screen' })

  const stars = el('div', { class: 'title-sparkles', ariaLabel: '' })
  for (let i = 0; i < 12; i++) {
    const s = el('span', { class: 'title-sparkle', text: i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '💎' })
    s.style.left = `${5 + Math.random() * 90}%`
    s.style.top = `${5 + Math.random() * 80}%`
    s.style.animationDelay = `${Math.random() * 3}s`
    s.style.fontSize = `${16 + Math.random() * 20}px`
    stars.appendChild(s)
  }
  screen.appendChild(stars)

  const card = el('div', { class: 'card title-card' })
  card.appendChild(el('div', { class: 'title-castle', text: '🏰' }))
  card.appendChild(el('h1', { class: 'title-he', text: 'הטירה הקסומה של דניאל' }))
  card.appendChild(el('p', { class: 'title-en', text: "Daniel's Magic English Castle" }))
  card.appendChild(el('p', { class: 'screen-sub', text: 'הרפתקה קסומה שבה לומדים אנגלית באוזניים, בלי לקרוא' }))

  const startBtn = bigButton(hasProgress ? 'להמשיך לשחק' : 'בואי נתחיל', () => {
    // חייב לקרות בתוך הלחיצה עצמה
    unlockAudio()
    unlockSpeech()
    startMusic()
    deps.onStart()
  }, { emoji: '🌟', variant: 'gold' })
  card.appendChild(startBtn)

  const row = el('div', { class: 'row title-row' }, [
    bigButton('הדמות שלי', () => {
      unlockAudio()
      unlockSpeech()
      deps.onCustomize()
    }, { emoji: '👗', variant: 'ghost small' }),
    bigButton('ההתקדמות שלי', () => deps.onProgress(), { emoji: '📊', variant: 'ghost small' }),
    bigButton('הגדרות', () => deps.onSettings(), { emoji: '⚙️', variant: 'ghost small' }),
  ])
  card.appendChild(row)

  if (hasProgress) {
    card.appendChild(el('p', { class: 'title-note', text: `אספת עד עכשיו ${save.stars} כוכבים ⭐` }))
  }

  if (!isSpeechSupported()) {
    card.appendChild(
      el('p', {
        class: 'title-warning',
        text: 'בדפדפן הזה אין קריינות. המשחק עובד, אבל כדאי לפתוח אותו ב-Chrome או ב-Edge כדי לשמוע את המילים.',
      }),
    )
  }

  screen.appendChild(card)
  window.setTimeout(() => startBtn.focus(), 80)
  return screen
}
