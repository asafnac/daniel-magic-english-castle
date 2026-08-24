/**
 * נגן הסצנות.
 *
 * המסך היחיד במשחק שבו אי אפשר לטעות, כי אין בו מה לענות. דניאל
 * צופה בדמויות מדברות, שומעת אנגלית, וקוראת כתובית בעברית.
 *
 * ארבע החלטות שקבעו את הצורה:
 *
 * **שורה אחת על המסך בכל רגע.** לא בועות שנערמות. ילדה שקוראת
 * לאט צריכה שהמשפט יעמוד במקום ולא יברח למעלה, וגם ככה עומס של
 * ארבע בועות הופך סצנה קצרה למסך טקסט.
 *
 * **ההמשך תמיד ביד שלה.** הסצנה לא מתקדמת לבד. גם אם הקול נגמר,
 * המשפט נשאר עד שהיא לוחצת. אין שום סיבה למהר ילדה שקוראת.
 *
 * **אפשר לדלג, וזה לא חטא.** סצנה שכבר ראתה ואי אפשר לעבור היא
 * הדרך המהירה ביותר לגרום לה לא לפתוח את המשחק. הכפתור שם מההתחלה.
 *
 * **הקול הוא רשות ולא תנאי.** אם אין קריינות בדפדפן, או שהיא כיבתה
 * אותה, הסצנה עובדת בדיוק אותו דבר. הטקסט הוא המקור.
 */

import { getCharacter, PLAYER_CHARACTER, type Character } from '../../learning/characters'
import type { Scene, SceneLine } from '../../learning/scenes'
import { speakEnglish, stopSpeaking } from '../../learning/speech'
import { bigButton, clear, el } from '../dom'

export interface SceneDeps {
  scene: Scene
  /** נקרא כשהסצנה הסתיימה או שדילגו עליה. */
  onDone: () => void
  /** נקרא כשיוצאים באמצע. אם לא סופק, אין כפתור יציאה. */
  onExit?: () => void
}

export function buildSceneScreen(deps: SceneDeps): { root: HTMLElement; dispose: () => void } {
  const { scene } = deps
  let index = 0
  let finished = false

  const screen = el('div', { class: 'screen scene-screen' })

  // שורת הדמויות למעלה: כולן נוכחות תמיד, והמדברת גדלה ומוארת.
  // כך ברור מי מדבר גם בלי לקרוא שם, וגם מי עוד נמצא בסצנה.
  const castRow = el('div', { class: 'scene-cast', ariaHidden: true })
  const castOrder = Array.from(new Set(scene.lines.map((l) => l.who)))
  const castNodes = new Map<string, HTMLElement>()
  for (const id of castOrder) {
    const character = getCharacter(id)
    const node = el('div', { class: 'scene-face', dataset: { who: id } })
    node.style.setProperty('--who', character.color)
    node.appendChild(el('span', { class: 'scene-face-emoji', text: character.emoji }))
    node.appendChild(el('span', { class: 'scene-face-name', text: character.hebrewName }))
    castRow.appendChild(node)
    castNodes.set(id, node)
  }

  const bubble = el('div', { class: 'scene-bubble', role: 'status' })
  const speaker = el('p', { class: 'scene-speaker' })
  const english = el('p', { class: 'scene-en', dir: 'ltr' })
  const hebrew = el('p', { class: 'scene-he' })
  bubble.appendChild(speaker)
  bubble.appendChild(english)
  bubble.appendChild(hebrew)

  const replay = bigButton('לשמוע שוב', () => speakLine(current()), { emoji: '🔊', variant: 'ghost small' })
  const next = bigButton('הלאה', () => advance(), { emoji: '▶️', variant: 'gold' })

  const dots = el('div', { class: 'scene-dots', ariaHidden: true })

  const actions = el('div', { class: 'row scene-actions' }, [replay, next])

  const top = el('div', { class: 'scene-top' })
  if (deps.onExit) {
    top.appendChild(bigButton('יציאה', () => leave(), { emoji: '✖', variant: 'ghost small', ariaLabel: 'לצאת מהסיפור' }))
  }
  top.appendChild(el('span', { class: 'scene-title', text: scene.title }))
  top.appendChild(bigButton('לדלג', () => finish(), { emoji: '⏭️', variant: 'ghost small', ariaLabel: 'לדלג על הסיפור' }))

  screen.appendChild(top)
  screen.appendChild(castRow)
  screen.appendChild(bubble)
  screen.appendChild(dots)
  screen.appendChild(actions)

  function current(): SceneLine {
    return scene.lines[Math.min(index, scene.lines.length - 1)]
  }

  function speakLine(line: SceneLine): void {
    const character = getCharacter(line.who)
    speakEnglish(line.en, { rate: character.rate, pitch: character.pitch })
  }

  /**
   * מצייר את השורה הנוכחית ומשמיע אותה.
   *
   * השורה של דניאל עצמה נאמרת גם היא בקול, וזו החלטה: היא לא מדברת
   * מול המסך, ולכן השמיעה של "מה שאני אומרת" היא ההזדמנות היחידה
   * שלה לשמוע איך זה נשמע.
   */
  function render(): void {
    const line = current()
    const character = getCharacter(line.who)

    for (const [id, node] of castNodes) node.classList.toggle('talking', id === line.who)

    speaker.textContent = line.who === PLAYER_CHARACTER ? `${character.hebrewName} (את)` : character.hebrewName
    bubble.style.setProperty('--who', character.color)
    english.textContent = line.en
    hebrew.textContent = line.he

    clear(dots)
    for (let i = 0; i < scene.lines.length; i++) {
      dots.appendChild(el('span', { class: `scene-dot ${i <= index ? 'on' : ''}`.trim() }))
    }

    const last = index === scene.lines.length - 1
    next.querySelector('.big-btn-label')!.textContent = last ? 'יאללה, קדימה' : 'הלאה'

    speakLine(line)
  }

  function advance(): void {
    if (finished) return
    if (index >= scene.lines.length - 1) {
      finish()
      return
    }
    index += 1
    render()
  }

  function finish(): void {
    if (finished) return
    finished = true
    stopSpeaking()
    deps.onDone()
  }

  function leave(): void {
    if (finished) return
    finished = true
    stopSpeaking()
    deps.onExit?.()
  }

  // מקש רווח או Enter מתקדמים, כמו בכל סצנה במשחק. חץ לאחור לא
  // קיים בכוונה: אפשר תמיד לשמוע שוב, ואחורה רק מבלבל.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === ' ' || e.key === 'Enter') {
      const active = document.activeElement
      if (active instanceof HTMLButtonElement) return
      e.preventDefault()
      advance()
    }
  }
  window.addEventListener('keydown', onKey)

  render()
  window.setTimeout(() => next.focus({ preventScroll: true }), 80)

  return {
    root: screen,
    dispose: () => {
      window.removeEventListener('keydown', onKey)
      stopSpeaking()
    },
  }
}

/** מוצג בעת בניית שורת הדמויות. מיוצא לבדיקות. */
export function castOf(scene: Scene): Character[] {
  return Array.from(new Set(scene.lines.map((l) => l.who))).map(getCharacter)
}
