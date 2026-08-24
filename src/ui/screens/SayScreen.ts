/**
 * Role Play: דניאל בוחרת מה לומר.
 *
 * דמות שואלת אותה משהו, והיא בוחרת את התשובה מתוך שתיים. **שתיהן
 * נכונות** - זו שיחה ולא מבחן, ואין כאן מה למדוד. מה שהיא מקבלת
 * בתמורה הוא שהדמות עונה לה, וככה נוצרת שיחה קצרה שהיא ניהלה.
 *
 * למה בחירה ולא דיבור: דניאל לא מדברת בקול מול המסך. זיהוי דיבור
 * היה הופך את הפעימה הזאת לחומה - הוא לא אמין בעברית-אנגלית של
 * ילדה בת שמונה, וכישלון שלו נראה כמו כישלון שלה. הבחירה נותנת את
 * אותה חוויה של "אמרתי משפט שלם" בלי אף אחד מהסיכונים, והמשפט
 * מושמע בקול כדי שהיא תשמע איך זה נשמע.
 */

import { getCharacter, PLAYER_CHARACTER } from '../../learning/characters'
import type { SayBeat } from '../../learning/quests'
import { speakEnglish, stopSpeaking } from '../../learning/speech'
import { bigButton, clear, el } from '../dom'

export interface SayDeps {
  beat: SayBeat
  onDone: () => void
  onExit?: () => void
}

export function buildSayScreen(deps: SayDeps): { root: HTMLElement; dispose: () => void } {
  const { beat } = deps
  const asker = getCharacter(beat.character)
  const me = getCharacter(PLAYER_CHARACTER)
  let answered = false

  const screen = el('div', { class: 'screen scene-screen say-screen' })

  const top = el('div', { class: 'scene-top' })
  if (deps.onExit) {
    top.appendChild(bigButton('יציאה', () => leave(), { emoji: '✖', variant: 'ghost small', ariaLabel: 'לצאת' }))
  }
  top.appendChild(el('span', { class: 'scene-title', text: 'מה את עונה?' }))
  screen.appendChild(top)

  const face = el('div', { class: 'scene-face talking ask-face' })
  face.style.setProperty('--who', asker.color)
  face.appendChild(el('span', { class: 'scene-face-emoji', text: asker.emoji }))
  screen.appendChild(face)

  const bubble = el('div', { class: 'scene-bubble', role: 'status' })
  bubble.style.setProperty('--who', asker.color)
  const english = el('p', { class: 'scene-en', dir: 'ltr', text: beat.ask })
  const hebrew = el('p', { class: 'scene-he', text: beat.askHe })
  bubble.appendChild(english)
  bubble.appendChild(hebrew)
  screen.appendChild(bubble)

  const choices = el('div', { class: 'say-choices', role: 'group', ariaLabel: 'מה לומר' })
  screen.appendChild(choices)

  const actions = el('div', { class: 'row scene-actions' })
  screen.appendChild(actions)

  for (const choice of beat.choices) {
    const btn = el('button', { class: 'say-choice', type: 'button', ariaLabel: choice.he })
    btn.style.setProperty('--who', me.color)
    btn.appendChild(el('span', { class: 'say-choice-en', dir: 'ltr', text: choice.en }))
    btn.appendChild(el('span', { class: 'say-choice-he', text: choice.he }))
    btn.addEventListener('click', () => choose(choice.en, btn))
    choices.appendChild(btn)
  }

  function choose(text: string, btn: HTMLElement): void {
    if (answered) return
    answered = true

    for (const other of choices.querySelectorAll('.say-choice')) {
      if (other !== btn) other.classList.add('ask-faded')
    }
    btn.classList.add('say-chosen')

    // קודם נשמע מה שהיא אמרה, ורק אחר כך התשובה. זה סדר של שיחה.
    speakEnglish(text, { rate: me.rate, pitch: me.pitch, onEnd: () => {
      english.textContent = beat.reply
      hebrew.textContent = beat.replyHe
      speakEnglish(beat.reply, { rate: asker.rate, pitch: asker.pitch, interrupt: false })
    } })

    clear(actions)
    actions.appendChild(bigButton('הלאה', () => finish(), { emoji: '▶️', variant: 'gold' }))
  }

  function finish(): void {
    stopSpeaking()
    deps.onDone()
  }

  function leave(): void {
    stopSpeaking()
    deps.onExit?.()
  }

  window.setTimeout(() => speakEnglish(beat.ask, { rate: asker.rate, pitch: asker.pitch }), 350)

  return { root: screen, dispose: () => stopSpeaking() }
}
