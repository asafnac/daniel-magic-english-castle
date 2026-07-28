/** שורת מידע קטנה מעל העולם: כוכבים, שם האזור וכפתור תפריט. */

import { el } from '../dom'

export class Hud {
  readonly root: HTMLElement
  private starsValue: HTMLElement
  private areaLabel: HTMLElement

  constructor(onPause: () => void) {
    this.starsValue = el('span', { class: 'hud-stars-value', text: '0' })
    this.areaLabel = el('span', { class: 'hud-area', text: '' })

    this.root = el('div', { class: 'hud' }, [
      el('button', {
        class: 'hud-btn',
        type: 'button',
        text: '☰',
        ariaLabel: 'תפריט המשחק',
        onClick: onPause,
      }),
      this.areaLabel,
      el('div', { class: 'hud-stars', ariaLabel: 'כוכבים שנאספו' }, [el('span', { text: '⭐' }), this.starsValue]),
    ])
  }

  setStars(n: number): void {
    this.starsValue.textContent = String(n)
  }

  setArea(title: string, emoji: string): void {
    this.areaLabel.textContent = `${emoji} ${title}`
  }

  /** אנימציית כוכב נוסף. */
  pulseStars(): void {
    this.starsValue.classList.remove('pop')
    void this.starsValue.offsetWidth
    this.starsValue.classList.add('pop')
  }
}
