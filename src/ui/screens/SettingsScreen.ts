/**
 * מסך ההגדרות: מוזיקה, קול, קצב דיבור, טקסט באנגלית, מיקרופון ואיפוס.
 */

import { setMusicEnabled, sfxClick, sfxStar } from '../../learning/audio'
import { getProgress, isStorageAvailable, resetProgress, saveSettings } from '../../learning/progress'
import { hasHebrewVoice, isRecognitionSupported, isSpeechSupported } from '../../learning/speech'
import { bigButton, el } from '../dom'
import { playWord } from '../components/SpeakerButton'
import { toast } from '../components/Toast'

export function buildSettingsScreen(onBack: () => void): HTMLElement {
  const screen = el('div', { class: 'screen settings-screen' })
  screen.appendChild(el('h1', { class: 'screen-title', text: 'הגדרות' }))

  const card = el('div', { class: 'card settings-card' })

  // ---------------------------------------------------------------- קול
  card.appendChild(sectionTitle('צלילים'))

  card.appendChild(
    toggleRow('מוזיקה וצלילים', '🎵', () => getProgress().settings.music, (on) => {
      saveSettings({ music: on })
      setMusicEnabled(on)
      if (on) sfxClick()
    }),
  )

  card.appendChild(
    toggleRow('קריינות המילים', '🔊', () => getProgress().settings.voice, (on) => {
      saveSettings({ voice: on })
      if (on) playWord('hello')
    }),
  )

  // קצב הדיבור
  const rateRow = el('div', { class: 'settings-row' })
  rateRow.appendChild(el('span', { class: 'settings-emoji', text: '🐢' }))
  rateRow.appendChild(el('span', { class: 'settings-label', text: 'מהירות הדיבור באנגלית' }))
  const slider = el('input', { class: 'settings-slider' })
  slider.type = 'range'
  slider.min = '0.5'
  slider.max = '1.1'
  slider.step = '0.05'
  slider.value = String(getProgress().settings.speechRate)
  slider.setAttribute('aria-label', 'מהירות הדיבור באנגלית')
  const rateValue = el('span', { class: 'settings-value', text: rateLabel(getProgress().settings.speechRate) })
  slider.addEventListener('input', () => {
    const v = Number(slider.value)
    saveSettings({ speechRate: v })
    rateValue.textContent = rateLabel(v)
  })
  slider.addEventListener('change', () => playWord('apple'))
  rateRow.appendChild(slider)
  rateRow.appendChild(rateValue)
  card.appendChild(rateRow)

  if (!isSpeechSupported()) {
    card.appendChild(note('בדפדפן הזה אין קריינות. המשחק עובד במלואו, אבל לא תשמעי את המילים. כדאי לפתוח ב-Chrome או ב-Edge.'))
  } else if (!hasHebrewVoice()) {
    card.appendChild(note('לא נמצא קול עברי במחשב הזה, ולכן ההוראות בעברית מוצגות בכתב בלבד. המילים באנגלית נשמעות כרגיל.'))
  }

  // ---------------------------------------------------------------- למידה
  card.appendChild(sectionTitle('למידה'))

  card.appendChild(
    toggleRow('להציג גם את המילה באנגלית בכתב', '🔤', () => getProgress().settings.showEnglishText, (on) => {
      saveSettings({ showEnglishText: on })
    }, 'דניאל עדיין לומדת לקרוא. אפשר להדליק את זה בהמשך.'),
  )

  if (isRecognitionSupported()) {
    card.appendChild(
      toggleRow('כפתור מיקרופון במשימות דיבור', '🎤', () => getProgress().settings.speechRecognition, (on) => {
        saveSettings({ speechRecognition: on })
      }, 'תוספת לכיף בלבד. המיקרופון אף פעם לא מוריד יהלום ולא חוסם התקדמות.'),
    )
  }

  // ---------------------------------------------------------------- שמירה
  card.appendChild(sectionTitle('השמירה שלי'))
  card.appendChild(
    note(
      isStorageAvailable()
        ? 'ההתקדמות נשמרת במחשב הזה בלבד, בלי חשבון ובלי אינטרנט.'
        : 'הדפדפן חוסם שמירה, ולכן ההתקדמות תישמר רק עד סגירת החלון.',
    ),
  )

  const resetBtn = bigButton('להתחיל את הלימוד מהתחלה', () => {
    if (resetBtn.dataset.armed === 'yes') {
      resetProgress()
      sfxStar()
      toast('הכל התאפס. הדמות שלך נשארה בדיוק כמו שהיא 💛')
      resetBtn.dataset.armed = 'no'
      resetBtn.querySelector('.big-btn-label')!.textContent = 'להתחיל את הלימוד מהתחלה'
    } else {
      resetBtn.dataset.armed = 'yes'
      resetBtn.querySelector('.big-btn-label')!.textContent = 'בטוח? לחצי שוב כדי לאפס'
      window.setTimeout(() => {
        if (resetBtn.dataset.armed === 'yes') {
          resetBtn.dataset.armed = 'no'
          resetBtn.querySelector('.big-btn-label')!.textContent = 'להתחיל את הלימוד מהתחלה'
        }
      }, 4000)
    }
  }, { emoji: '🔄', variant: 'ghost small' })
  card.appendChild(el('div', { class: 'row' }, [resetBtn]))

  screen.appendChild(card)

  const back = bigButton('חזרה', onBack, { emoji: '↩️', variant: 'gold' })
  screen.appendChild(el('div', { class: 'row screen-actions' }, [back]))
  window.setTimeout(() => back.focus({ preventScroll: true }), 80)
  return screen
}

function sectionTitle(text: string): HTMLElement {
  return el('h2', { class: 'settings-section', text })
}

function note(text: string): HTMLElement {
  return el('p', { class: 'settings-note', text })
}

function rateLabel(v: number): string {
  if (v <= 0.62) return 'איטי מאוד'
  if (v <= 0.8) return 'איטי'
  if (v <= 0.95) return 'רגיל'
  return 'מהיר'
}

function toggleRow(
  label: string,
  emoji: string,
  get: () => boolean,
  set: (on: boolean) => void,
  hint?: string,
): HTMLElement {
  const row = el('div', { class: 'settings-row' })
  row.appendChild(el('span', { class: 'settings-emoji', text: emoji }))

  const labelBox = el('span', { class: 'settings-label-box' }, [el('span', { class: 'settings-label', text: label })])
  if (hint) labelBox.appendChild(el('span', { class: 'settings-hint', text: hint }))
  row.appendChild(labelBox)

  const btn = el('button', { class: 'toggle', type: 'button' })
  const render = () => {
    const on = get()
    btn.classList.toggle('on', on)
    btn.setAttribute('aria-pressed', String(on))
    btn.setAttribute('aria-label', `${label}: ${on ? 'פועל' : 'כבוי'}`)
    btn.textContent = on ? 'פועל' : 'כבוי'
  }
  btn.addEventListener('click', () => {
    set(!get())
    render()
  })
  render()
  row.appendChild(btn)
  return row
}
