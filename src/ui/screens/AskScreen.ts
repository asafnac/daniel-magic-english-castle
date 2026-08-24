/**
 * הפעימה שבה דניאל עושה משהו באנגלית.
 *
 * דמות מבקשת משהו במשפט שלם, ודניאל נותנת לה אותו. זה נראה כמו
 * בחירה מתוך שלוש תמונות, אבל ההבדל מהשאלון הישן הוא מהותי:
 *
 *   **אין שאלה.** אין "מה זה apple". יש דמות שרוצה תפוח.
 *   **המשפט שלם.** לא מילה בודדת - <span dir=ltr>Can you give me the red apple?</span>
 *   **הצלחה היא עזרה לדמות**, לא תשובה נכונה.
 *
 * ומה שקורה כשטועים הוא העיקר: אין ❌, אין "לא נכון", ואין יהלום
 * שנעלם. הדמות עוזרת - "Almost! I need the RED apple" - והתמונה
 * הנכונה מקבלת הילה עדינה. בטעות שנייה ההילה מתחזקת. אי אפשר
 * להיתקע ואי אפשר להיכשל, כי המטרה היא שהיא תעזור לזיגי, לא שנמדוד
 * אותה.
 */

import { getCharacter } from '../../learning/characters'
import type { AskBeat } from '../../learning/quests'
import { speakEnglish, stopSpeaking } from '../../learning/speech'
import { getWord } from '../../learning/vocabulary'
import { bigButton, clear, el } from '../dom'

export interface AskDeps {
  beat: AskBeat
  onDone: () => void
  onExit?: () => void
}

export function buildAskScreen(deps: AskDeps): { root: HTMLElement; dispose: () => void } {
  const { beat } = deps
  const character = getCharacter(beat.character)
  let wrongs = 0
  let solved = false

  const screen = el('div', { class: 'screen scene-screen ask-screen' })

  const top = el('div', { class: 'scene-top' })
  if (deps.onExit) {
    top.appendChild(bigButton('יציאה', () => leave(), { emoji: '✖', variant: 'ghost small', ariaLabel: 'לצאת' }))
  }
  top.appendChild(el('span', { class: 'scene-title', text: 'עוזרים ל' + character.hebrewName }))
  screen.appendChild(top)

  const face = el('div', { class: 'scene-face talking ask-face' })
  face.style.setProperty('--who', character.color)
  face.appendChild(el('span', { class: 'scene-face-emoji', text: character.emoji }))
  screen.appendChild(face)

  const bubble = el('div', { class: 'scene-bubble', role: 'status' })
  bubble.style.setProperty('--who', character.color)
  const english = el('p', { class: 'scene-en', dir: 'ltr', text: beat.say })
  const hebrew = el('p', { class: 'scene-he', text: beat.he })
  bubble.appendChild(english)
  bubble.appendChild(hebrew)
  screen.appendChild(bubble)

  const replay = bigButton('לשמוע שוב', () => say(beat.say), { emoji: '🔊', variant: 'ghost small' })
  screen.appendChild(el('div', { class: 'row' }, [replay]))

  const grid = el('div', { class: 'ask-options', role: 'group', ariaLabel: 'מה לתת' })
  screen.appendChild(grid)

  // סדר קבוע לפי ההגדרה ולא אקראי: אותה בקשה תמיד נראית אותו דבר,
  // וילדה שחוזרת לפעימה אחרי הפסקה מזהה איפה היא הייתה.
  for (const wordId of beat.options) {
    const word = getWord(wordId)
    const btn = el('button', {
      class: 'ask-option',
      type: 'button',
      dataset: { id: wordId },
      ariaLabel: word.hebrew,
    })
    btn.appendChild(el('span', { class: 'ask-option-emoji', text: word.emoji }))
    btn.appendChild(el('span', { class: 'ask-option-label', text: word.hebrew }))
    btn.addEventListener('click', () => pick(wordId, btn))
    grid.appendChild(btn)
  }

  function say(text: string): void {
    speakEnglish(text, { rate: character.rate, pitch: character.pitch })
  }

  function pick(wordId: string, btn: HTMLElement): void {
    if (solved) return
    if (wordId !== beat.answer) {
      wrongs += 1
      btn.classList.add('ask-nope')
      window.setTimeout(() => btn.classList.remove('ask-nope'), 500)

      // הדמות עוזרת. הבקשה מנוסחת מחדש, ולא נאמר שנכשלנו.
      english.textContent = beat.help
      hebrew.textContent = beat.helpHe
      say(beat.help)

      // מהטעות הראשונה התשובה הנכונה מקבלת הילה, ובשנייה היא גם
      // מתנועעת. המטרה היא שהיא תצליח, לא שנמדוד כמה ניסיונות לקח.
      const right = grid.querySelector<HTMLElement>(`[data-id="${beat.answer}"]`)
      right?.classList.add('ask-hint')
      if (wrongs >= 2) right?.classList.add('ask-hint-strong')
      return
    }

    solved = true
    btn.classList.add('ask-yes')
    english.textContent = beat.thanks
    hebrew.textContent = beat.thanksHe
    say(beat.thanks)
    for (const other of grid.querySelectorAll('.ask-option')) {
      if (other !== btn) other.classList.add('ask-faded')
    }

    clear(actions)
    actions.appendChild(bigButton('הלאה', () => finish(), { emoji: '▶️', variant: 'gold' }))
    window.setTimeout(() => actions.querySelector<HTMLButtonElement>('.big-btn')?.focus({ preventScroll: true }), 60)
  }

  const actions = el('div', { class: 'row scene-actions' })
  screen.appendChild(actions)

  function finish(): void {
    stopSpeaking()
    deps.onDone()
  }

  function leave(): void {
    stopSpeaking()
    deps.onExit?.()
  }

  window.setTimeout(() => say(beat.say), 350)

  return { root: screen, dispose: () => stopSpeaking() }
}
