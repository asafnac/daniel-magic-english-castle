/** כפתור רמקול. מופיע ליד כל מילה במשחק, תמיד באותו מקום ובאותה צורה. */

import { duckMusic, playRecording } from '../../learning/audio'
import { speakEnglish, speakHebrew } from '../../learning/speech'
import { findWord } from '../../learning/vocabulary'
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

/**
 * משמיע מילה באנגלית ומסמן את הכפתור בזמן ההשמעה.
 * אם קיימת הקלטה אמיתית למילה, היא מנוצחת על הקריינות הסינתטית.
 * `wordId` הוא אופציונלי, ומשמש רק כדי למצוא את ההקלטה.
 */
export function playWord(text: string, btn?: HTMLElement, wordId?: string): void {
  btn?.classList.add('speaking')
  duckMusic(true)
  const done = () => {
    btn?.classList.remove('speaking')
    duckMusic(false)
  }

  const audioKey = wordId ? findWord(wordId)?.audioKey : undefined
  if (playRecording(audioKey, done)) return

  const started = speakEnglish(text, { onEnd: done })
  if (!started) window.setTimeout(done, 400)
}

/** מקריא הוראה בעברית אם קיים קול עברי. הטקסט תמיד מוצג במקביל. */
export function sayInstruction(text: string): void {
  duckMusic(true)
  speakHebrew(text, { onEnd: () => duckMusic(false) })
}
