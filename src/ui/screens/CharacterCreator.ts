/**
 * מסך יצירת הדמות.
 *
 * אפשר להגיע לכאן גם מהמסך הראשי וגם מתוך המשחק, בכל רגע,
 * כי דניאל ביקשה לשנות מראה גם באמצע. השינוי נשמר מיד ב-localStorage.
 */

import { AvatarPreview } from '../../game/AvatarPreview'
import { sfxClick, sfxStar } from '../../learning/audio'
import { getProgress, saveAvatar } from '../../learning/progress'
import {
  CARRY,
  CARRY_COLORS,
  DEFAULT_AVATAR,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  KINDS,
  OUTFITS,
  OUTFIT_COLORS,
  SHOES,
  SKIN_TONES,
  type AvatarConfig,
  type ChoiceOption,
} from '../../app/avatarConfig'
import { bigButton, el } from '../dom'

export interface CreatorDeps {
  /** נקרא בסיום, עם הדמות הסופית. */
  onDone: (avatar: AvatarConfig) => void
  onCancel?: () => void
  /** האם זו הכניסה הראשונה למשחק. משנה את הכותרת ואת כפתור הסיום. */
  firstTime: boolean
}

export function buildCharacterCreator(deps: CreatorDeps): { root: HTMLElement; dispose: () => void } {
  const config: AvatarConfig = { ...(getProgress().avatar ?? DEFAULT_AVATAR) }

  const screen = el('div', { class: 'screen creator-screen' })
  screen.appendChild(el('h1', { class: 'screen-title', text: deps.firstTime ? 'בואי נבחר איך את נראית' : 'המראה שלי' }))
  screen.appendChild(el('p', { class: 'screen-sub', text: 'אפשר לשנות הכל מתי שרוצים, גם באמצע המשחק' }))

  const layout = el('div', { class: 'creator-layout' })
  const previewBox = el('div', { class: 'creator-preview' })
  const optionsBox = el('div', { class: 'creator-options' })
  layout.appendChild(previewBox)
  layout.appendChild(optionsBox)
  screen.appendChild(layout)

  // התצוגה נבנית אחרי שהאלמנט נכנס ל-DOM, כדי שיהיו לו מידות
  let preview: AvatarPreview | null = null
  window.setTimeout(() => {
    preview = new AvatarPreview(previewBox, config)
  }, 0)

  const refresh = () => {
    preview?.update(config)
    saveAvatar(config)
  }

  const addRow = <K extends keyof AvatarConfig>(
    title: string,
    key: K,
    options: readonly ChoiceOption<AvatarConfig[K]>[],
    kind: 'chips' | 'colors',
  ) => {
    const row = el('div', { class: 'creator-row' })
    row.appendChild(el('h2', { class: 'creator-row-title', text: title }))
    const list = el('div', { class: `creator-choices ${kind}`, role: 'group', ariaLabel: title })

    const buttons: HTMLButtonElement[] = []
    options.forEach((opt) => {
      const btn = el('button', {
        class: `choice ${kind === 'colors' ? 'choice-color' : ''}`.trim(),
        type: 'button',
        ariaLabel: `${title}: ${opt.label}`,
      })
      if (kind === 'colors') {
        btn.appendChild(el('span', { class: 'choice-swatch', style: { background: String(opt.value) } }))
        btn.appendChild(el('span', { class: 'choice-label', text: opt.label }))
      } else {
        if (opt.emoji) btn.appendChild(el('span', { class: 'choice-emoji', text: opt.emoji }))
        btn.appendChild(el('span', { class: 'choice-label', text: opt.label }))
      }
      btn.addEventListener('click', () => {
        config[key] = opt.value
        sfxClick()
        for (const b of buttons) b.classList.remove('selected')
        btn.classList.add('selected')
        refresh()
      })
      if (config[key] === opt.value) btn.classList.add('selected')
      buttons.push(btn)
      list.appendChild(btn)
    })

    row.appendChild(list)
    optionsBox.appendChild(row)
  }

  addRow('סוג הדמות', 'kind', KINDS, 'chips')
  addRow('צבע עור', 'skin', SKIN_TONES, 'colors')
  addRow('תסרוקת', 'hairStyle', HAIR_STYLES, 'chips')
  addRow('צבע שיער', 'hairColor', HAIR_COLORS, 'colors')
  addRow('בגדים', 'outfit', OUTFITS, 'chips')
  addRow('צבע הבגדים', 'outfitColor', OUTFIT_COLORS, 'colors')
  addRow('נעליים', 'shoes', SHOES, 'chips')
  addRow('אביזר ראש', 'headwear', HEADWEAR, 'chips')
  addRow('תיק או גלימה', 'carry', CARRY, 'chips')
  addRow('צבע הגלימה או התיק', 'carryColor', CARRY_COLORS, 'colors')

  const actions = el('div', { class: 'row creator-actions' })
  const doneBtn = bigButton(deps.firstTime ? 'זאת אני! קדימה לטירה' : 'שמירה וחזרה', () => {
    saveAvatar(config)
    sfxStar()
    preview?.cheer()
    window.setTimeout(() => deps.onDone(config), 260)
  }, { emoji: '✨', variant: 'gold' })
  actions.appendChild(doneBtn)

  if (deps.onCancel) {
    actions.appendChild(bigButton('ביטול', () => deps.onCancel?.(), { emoji: '↩️', variant: 'ghost small' }))
  }
  screen.appendChild(actions)

  window.setTimeout(() => doneBtn.focus(), 120)

  return {
    root: screen,
    dispose: () => {
      preview?.dispose()
      preview = null
    },
  }
}
