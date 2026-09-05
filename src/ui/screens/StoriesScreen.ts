/**
 * מסך הסיפורים.
 *
 * עד עכשיו היה כפתור אחד שנכנס לסיפור אחד, וברגע שהסיפור נגמר
 * הכפתור הפסיק לעשות משהו. ילדה שאהבה את הסיפור ורצתה לשמוע אותו
 * שוב לחצה, המסך נטען מחדש, וזהו. זו התשובה הגרועה ביותר שאפשר
 * לתת לבקשה "עוד".
 *
 * המסך הזה הוא התשובה: רשימה שאפשר לחזור אליה. סיפור שנגמר נשאר
 * ברשימה ואפשר לראות אותו שוב מההתחלה, סיפור שבאמצע ממשיך מאיפה
 * שעצרו, והסיפור הבא עומד שם ומראה שיש המשך - גם לפני שהוא נפתח.
 *
 * הנעילה מוצגת ולא מוסתרת בכוונה: לדעת שיש עוד סיפור זו הסיבה
 * לסיים את הנוכחי.
 */

import { sfxClick } from '../../learning/audio'
import { QUESTS, getQuest, questStage, type QuestStage } from '../../learning/quests'
import { bigButton, el } from '../dom'

export interface StoriesDeps {
  onPick: (questId: string) => void
  onBack: () => void
}

const NOTE: Record<QuestStage, string> = {
  new: 'סיפור חדש!',
  middle: 'ממשיכים מאיפה שעצרת',
  done: 'לראות שוב מההתחלה',
  locked: '',
}

export function buildStoriesScreen(deps: StoriesDeps): HTMLElement {
  const screen = el('div', { class: 'screen stories-screen' })
  screen.appendChild(el('h1', { class: 'screen-title', text: 'הסיפורים שלי' }))
  screen.appendChild(el('p', { class: 'screen-sub', text: 'לחצי על סיפור כדי להיכנס אליו' }))

  const grid = el('div', { class: 'stories-grid' })

  for (const quest of QUESTS) {
    const stage = questStage(quest.id)
    const locked = stage === 'locked'
    const needs = quest.requires ? getQuest(quest.requires).title : ''
    const note = locked ? `אחרי ${needs}` : NOTE[stage]

    const card = el('button', {
      class: `story-card ${locked ? 'locked' : ''} ${stage === 'done' ? 'done' : ''}`.trim(),
      type: 'button',
      ariaLabel: locked ? `${quest.title}, נעול. ייפתח אחרי ${needs}` : `${quest.title}. ${note}`,
    })

    card.appendChild(el('span', { class: 'story-card-emoji', text: locked ? '🔒' : quest.emoji }))
    card.appendChild(el('span', { class: 'story-card-title', text: quest.title }))
    card.appendChild(el('span', { class: 'story-card-blurb', text: locked ? 'עוד לא נפתח' : quest.blurb }))
    card.appendChild(el('span', { class: `story-card-note ${stage}`, text: note }))

    if (locked) card.disabled = true
    else
      card.addEventListener('click', () => {
        sfxClick()
        deps.onPick(quest.id)
      })

    grid.appendChild(card)
  }

  screen.appendChild(grid)

  const back = bigButton('חזרה', deps.onBack, { emoji: '↩️', variant: 'gold' })
  screen.appendChild(el('div', { class: 'row screen-actions' }, [back]))
  window.setTimeout(() => back.focus({ preventScroll: true }), 80)
  return screen
}
