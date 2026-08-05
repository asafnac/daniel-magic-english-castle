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

/**
 * משמיע רצף צלילים בזה אחר זה, עם הפסקה ביניהם.
 *
 * זה מה שהופך "cat" ל-c... a... t, וזה כל ההבדל בין לשמוע מילה
 * לבין לשמוע ממה היא עשויה. ההפסקה מכוונת: בלעדיה הצלילים
 * נבלעים זה בזה וחוזרים להיות מילה שלמה.
 *
 * מחזיר פונקציית ביטול, כי הילדה יכולה לענות באמצע ההשמעה.
 */
export function playSounds(script: readonly string[], opts: { gapMs?: number; onDone?: () => void } = {}): () => void {
  const gap = opts.gapMs ?? 260
  let index = 0
  let cancelled = false
  let timer: number | undefined

  duckMusic(true)
  const finish = (): void => {
    duckMusic(false)
    if (!cancelled) opts.onDone?.()
  }

  const step = (): void => {
    if (cancelled) return
    if (index >= script.length) {
      finish()
      return
    }
    const sound = script[index]
    index += 1
    const started = speakEnglish(sound, { rate: 0.7, onEnd: () => {
      if (cancelled) return
      timer = window.setTimeout(step, gap)
    } })
    // בלי קריינות אין מה להשמיע, אבל הרצף עדיין חייב להסתיים
    if (!started) timer = window.setTimeout(step, gap)
  }

  step()

  return () => {
    cancelled = true
    if (timer !== undefined) window.clearTimeout(timer)
    duckMusic(false)
  }
}

/** מקריא הוראה בעברית אם קיים קול עברי. הטקסט תמיד מוצג במקביל. */
export function sayInstruction(text: string): void {
  duckMusic(true)
  speakHebrew(text, { onEnd: () => duckMusic(false) })
}
