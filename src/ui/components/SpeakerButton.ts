/** כפתור רמקול. מופיע ליד כל מילה במשחק, תמיד באותו מקום ובאותה צורה. */

import { duckMusic } from '../../learning/audio'
import { speakEnglish, speakHebrew } from '../../learning/speech'
import { el } from '../dom'

export function speakerButton(
  englishText: string,
  opts: { small?: boolean; label?: string; onPlay?: () => void } = {},
): HTMLButtonElement {
  const btn = el('button', {
    class: `speaker-btn ${opts.small ? 'small' : ''}`.trim(),
    type: 'button',
    text: '🔊',
    ariaLabel: opts.label ?? `להשמיע שוב את המילה ${englishText}`,
  })
  btn.addEventListener('click', () => {
    playWord(englishText, btn)
    opts.onPlay?.()
  })
  return btn
}

/** משמיע מילה באנגלית ומסמן את הכפתור בזמן ההשמעה. */
export function playWord(text: string, btn?: HTMLElement): void {
  btn?.classList.add('speaking')
  duckMusic(true)
  const done = () => {
    btn?.classList.remove('speaking')
    duckMusic(false)
  }
  const started = speakEnglish(text, { onEnd: done })
  if (!started) window.setTimeout(done, 400)
}

/** מקריא הוראה בעברית אם קיים קול עברי. הטקסט תמיד מוצג במקביל. */
export function sayInstruction(text: string): void {
  duckMusic(true)
  speakHebrew(text, { onEnd: () => duckMusic(false) })
}
