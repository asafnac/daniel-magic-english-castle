/**
 * מסך "ההתקדמות שלי".
 *
 * מציג רק דברים מעודדים: מה כבר נלמד, כמה כוכבים נאספו, אילו אזורים פתוחים,
 * ואילו מילים כדאי לתרגל שוב. אין כאן אחוזי הצלחה, אין ציונים,
 * ואין שום מספר שאפשר לפרש כישלון.
 */

import { AREAS } from '../../learning/areas'
import { getProgress } from '../../learning/progress'
import { wordsToPractice } from '../../learning/practice'
import { findWord } from '../../learning/vocabulary'
import { bigButton, el } from '../dom'
import { playWord } from '../components/SpeakerButton'

const CATEGORY_TITLES: Record<string, string> = {
  colors: 'צבעים',
  animals: 'חיות',
  food: 'אוכל',
  numbers: 'מספרים',
  letters: 'אותיות',
  objects: 'חפצים',
}

export function buildProgressScreen(onBack: () => void): HTMLElement {
  const save = getProgress()
  const screen = el('div', { class: 'screen progress-screen' })

  screen.appendChild(el('h1', { class: 'screen-title', text: 'ההתקדמות שלי' }))

  // ---------------------------------------------------------- כותרת מספרים
  const stats = el('div', { class: 'stat-row' }, [
    statCard('⭐', String(save.stars), 'כוכבים'),
    statCard('📚', String(save.wordsLearned.length), 'מילים שלמדתי'),
    statCard('🏰', String(AREAS.filter((a) => save.areas[a.id]?.unlocked).length), 'אזורים פתוחים'),
  ])
  screen.appendChild(stats)

  // ---------------------------------------------------------- אזורים
  const areasCard = el('div', { class: 'card progress-card' })
  areasCard.appendChild(el('h2', { class: 'progress-card-title', text: `הטירה שלי, ${AREAS.length} עולמות` }))
  areasCard.appendChild(
    el('p', { class: 'progress-empty', text: 'כל עולם נפתח כשמסיימים את זה שלפניו. השער נפתח לבד ואפשר להמשיך ללכת קדימה.' }),
  )
  const areaList = el('div', { class: 'area-list' })
  for (const area of AREAS) {
    const ap = save.areas[area.id]
    const total = area.tasks.length
    const done = Math.min(ap?.completedTasks ?? 0, total)
    const unlocked = ap?.unlocked ?? false
    const item = el('div', { class: `area-item ${unlocked ? '' : 'locked'}`.trim() })
    item.appendChild(el('span', { class: 'area-item-emoji', text: unlocked ? area.emoji : '🔒' }))
    const info = el('div', { class: 'area-item-info' })
    info.appendChild(el('span', { class: 'area-item-title', text: area.title }))
    const bar = el('span', { class: 'area-item-bar' }, [el('i', { style: { width: `${(done / total) * 100}%` } })])
    info.appendChild(bar)
    // באזור נעול מציינים במפורש מה פותח אותו, כדי שיהיה ברור שיש המשך
    const previous = AREAS.find((a) => a.order === area.order - 1)
    info.appendChild(
      el('span', {
        class: 'area-item-note',
        text: unlocked
          ? ap?.done
            ? 'סיימת! כל הכבוד 🎉'
            : `${done} מתוך ${total} משימות`
          : previous
            ? `ייפתח אחרי ${previous.title}`
            : 'ייפתח בקרוב',
      }),
    )
    item.appendChild(info)
    areaList.appendChild(item)
  }
  areasCard.appendChild(areaList)
  screen.appendChild(areasCard)

  // ---------------------------------------------------------- מילים שנלמדו
  const learned = save.wordsLearned.map(findWord).filter((w): w is NonNullable<typeof w> => !!w)
  const wordsCard = el('div', { class: 'card progress-card' })
  wordsCard.appendChild(el('h2', { class: 'progress-card-title', text: 'המילים שלמדתי' }))

  if (learned.length === 0) {
    wordsCard.appendChild(el('p', { class: 'progress-empty', text: 'עוד לא התחלנו. כל מילה שתלמדי תופיע כאן 💛' }))
  } else {
    const byCategory = new Map<string, typeof learned>()
    for (const w of learned) {
      const list = byCategory.get(w.category) ?? []
      list.push(w)
      byCategory.set(w.category, list)
    }
    for (const [category, words] of byCategory) {
      wordsCard.appendChild(el('h3', { class: 'progress-subtitle', text: CATEGORY_TITLES[category] ?? category }))
      const grid = el('div', { class: 'word-grid' })
      for (const w of words) {
        const chip = el('button', {
          class: 'word-chip',
          type: 'button',
          ariaLabel: `להשמיע את המילה ${w.english}, בעברית ${w.hebrew}`,
        })
        chip.appendChild(el('span', { class: 'word-chip-emoji', text: w.category === 'letters' ? w.emoji : w.emoji }))
        chip.appendChild(el('span', { class: 'word-chip-he', text: w.hebrew }))
        chip.appendChild(el('span', { class: 'word-chip-speaker', text: '🔊' }))
        chip.addEventListener('click', () => playWord(w.sentence ?? w.english, chip))
        grid.appendChild(chip)
      }
      wordsCard.appendChild(grid)
    }
  }
  screen.appendChild(wordsCard)

  // ---------------------------------------------------------- לתרגל שוב
  const practice = wordsToPractice()
    .map(findWord)
    .filter((w): w is NonNullable<typeof w> => !!w)

  if (practice.length > 0) {
    const practiceCard = el('div', { class: 'card progress-card practice-card' })
    practiceCard.appendChild(el('h2', { class: 'progress-card-title', text: 'מילים שכיף לתרגל שוב' }))
    practiceCard.appendChild(el('p', { class: 'progress-empty', text: 'המשחק יחזיר לך אותן לבד, אז אין מה לדאוג 💪' }))
    const grid = el('div', { class: 'word-grid' })
    for (const w of practice) {
      const chip = el('button', { class: 'word-chip', type: 'button', ariaLabel: `להשמיע את המילה ${w.english}` })
      chip.appendChild(el('span', { class: 'word-chip-emoji', text: w.emoji }))
      chip.appendChild(el('span', { class: 'word-chip-he', text: w.hebrew }))
      chip.appendChild(el('span', { class: 'word-chip-speaker', text: '🔊' }))
      chip.addEventListener('click', () => playWord(w.sentence ?? w.english, chip))
      grid.appendChild(chip)
    }
    practiceCard.appendChild(grid)
    screen.appendChild(practiceCard)
  }

  const back = bigButton('חזרה', onBack, { emoji: '↩️', variant: 'ghost' })
  screen.appendChild(el('div', { class: 'row screen-actions' }, [back]))
  window.setTimeout(() => back.focus(), 80)
  return screen
}

function statCard(emoji: string, value: string, label: string): HTMLElement {
  return el('div', { class: 'stat-card' }, [
    el('span', { class: 'stat-emoji', text: emoji }),
    el('span', { class: 'stat-value', text: value }),
    el('span', { class: 'stat-label', text: label }),
  ])
}
