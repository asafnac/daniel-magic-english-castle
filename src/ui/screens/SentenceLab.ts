/**
 * מעבדת המשפטים.
 *
 * זה החלק היחיד במשחק שאין בו שאלה, אין בו תשובה נכונה ואין בו יהלומים.
 * בוחרים מילה בכל משבצת, והתמונה משתנה מיד. אפשר לשבת כאן ולשחק
 * בלי שאף אחד בודק כלום.
 *
 * זה לא נספח. כל עוד כל מסך במשחק הוא מבחן, אין שום מקום שבו מותר
 * לנסות דברים ולראות מה קורה, וזה בדיוק מה שגורם לילדה לרצות לחזור.
 * טעות כאן לא קיימת: כל צירוף חוקי, כל צירוף מייצר משהו, וכל צירוף
 * נאמר בקול נכון.
 */

import { sfxClick, sfxStar } from '../../learning/audio'
import { FRAMES, buildSentence, combinationCount, defaultPicks, type Frame } from '../../learning/sentences'
import { getWord } from '../../learning/vocabulary'
import { bigButton, clear, el } from '../dom'
import { playWord, sayInstruction } from '../components/SpeakerButton'

export interface SentenceLabDeps {
  onBack: () => void
}

export function buildSentenceLab(deps: SentenceLabDeps): HTMLElement {
  const screen = el('div', { class: 'screen sentence-lab' })
  screen.appendChild(el('h1', { class: 'screen-title', text: 'מעבדת המשפטים' }))
  screen.appendChild(
    el('p', { class: 'screen-sub', text: 'כאן אין שאלות ואין טעויות. בחרי מילים, ותראי מה יוצא' }),
  )

  let frame: Frame = FRAMES[0]
  let picks: string[] = defaultPicks(frame)

  const stage = el('div', { class: 'lab-stage' })
  const sentenceRow = el('div', { class: 'lab-sentence', role: 'status' })
  const hebrewRow = el('div', { class: 'lab-hebrew' })
  const slotsBox = el('div', { class: 'lab-slots' })
  const frameRow = el('div', { class: 'lab-frames', role: 'group', ariaLabel: 'סוגי משפטים' })

  /** מצייר מחדש את הסצנה ואת המשפט, בלי לבנות את הכפתורים שוב. */
  const refreshStage = (): void => {
    const built = buildSentence(frame.id, picks)
    clear(stage)
    const box = el('div', { class: 'lab-scene' })
    if (built.scene.color) box.style.background = built.scene.color
    const glyph = el('span', { class: 'lab-scene-emoji', text: built.scene.emoji })
    // em ולא rem: הבסיס מוגדר ב-CSS ומתכווץ במסך נמוך, אבל היחס
    // בין big לבין small נשמר, וזה כל מה שהמילה הזאת מלמדת.
    glyph.style.fontSize = `${built.scene.scale * 3}em`
    box.appendChild(glyph)
    stage.appendChild(box)

    clear(sentenceRow)
    for (const id of picks) {
      sentenceRow.appendChild(el('span', { class: 'lab-word', text: getWord(id).english }))
    }
    hebrewRow.textContent = built.hebrew
    sentenceRow.setAttribute('aria-label', `${built.english}. בעברית: ${built.hebrew}`)
  }

  const speak = (): void => {
    playWord(buildSentence(frame.id, picks).english)
  }

  /** בונה את שורות הבחירה של המסגרת הנוכחית. */
  const buildSlots = (): void => {
    clear(slotsBox)
    frame.slots.forEach((slot, i) => {
      if (slot.fixed) return
      const row = el('div', { class: 'lab-slot-row' })
      row.appendChild(el('span', { class: 'lab-slot-label', text: labelFor(slot.role) }))
      const choices = el('div', { class: 'lab-choices', role: 'group', ariaLabel: labelFor(slot.role) })
      for (const id of slot.choices ?? []) {
        const w = getWord(id)
        const btn = el('button', {
          class: `lab-choice ${picks[i] === id ? 'on' : ''}`.trim(),
          type: 'button',
          text: w.english,
          ariaLabel: `${w.english}, ${w.hebrew}`,
          dataset: { slot: String(i), id },
        })
        if (w.color) btn.style.setProperty('--chip', w.color)
        btn.addEventListener('click', () => {
          picks = picks.slice()
          picks[i] = id
          sfxClick()
          for (const other of choices.querySelectorAll('.lab-choice')) other.classList.remove('on')
          btn.classList.add('on')
          refreshStage()
          speak()
        })
        choices.appendChild(btn)
      }
      row.appendChild(choices)
      slotsBox.appendChild(row)
    })
  }

  for (const f of FRAMES) {
    const btn = el('button', {
      class: `lab-frame ${f.id === frame.id ? 'on' : ''}`.trim(),
      type: 'button',
      ariaLabel: `${f.title}, ${combinationCount(f)} משפטים אפשריים`,
    })
    btn.appendChild(el('span', { class: 'lab-frame-title', text: f.title }))
    btn.appendChild(el('span', { class: 'lab-frame-count', text: `${combinationCount(f)} משפטים` }))
    btn.addEventListener('click', () => {
      frame = f
      picks = defaultPicks(f)
      sfxClick()
      for (const other of frameRow.querySelectorAll('.lab-frame')) other.classList.remove('on')
      btn.classList.add('on')
      buildSlots()
      refreshStage()
      sayInstruction(f.title)
    })
    frameRow.appendChild(btn)
  }

  const say = bigButton('להגיד את המשפט', () => {
    sfxStar()
    speak()
  }, { emoji: '🔊', variant: 'sky' })

  screen.appendChild(frameRow)
  screen.appendChild(stage)
  screen.appendChild(sentenceRow)
  screen.appendChild(hebrewRow)
  screen.appendChild(slotsBox)
  screen.appendChild(el('div', { class: 'row screen-actions' }, [say, bigButton('חזרה', deps.onBack, { emoji: '↩️', variant: 'gold' })]))

  buildSlots()
  refreshStage()
  // preventScroll קריטי כאן: הכפתור נמצא אחרי כל הבחירות, ומיקוד רגיל
  // היה גולל את כותרת המסך מעבר לקצה העליון ברגע הפתיחה.
  window.setTimeout(() => say.focus({ preventScroll: true }), 80)
  return screen
}

function labelFor(role: string): string {
  switch (role) {
    case 'size':
      return 'איך הוא'
    case 'colour':
      return 'איזה צבע'
    case 'noun':
      return 'מה'
    default:
      return 'בחרי'
  }
}
