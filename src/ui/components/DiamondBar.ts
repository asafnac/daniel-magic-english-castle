/** שורת יהלומי החיים. ארבעה יהלומים, ואף פעם לא מספר שנראה כמו ציון. */

import { MAX_DIAMONDS } from '../../learning/lives'
import { el } from '../dom'

export class DiamondBar {
  readonly root: HTMLElement
  private gems: HTMLElement[] = []

  constructor() {
    this.root = el('div', { class: 'diamond-bar', role: 'status', ariaLabel: 'יהלומי חיים' })
    for (let i = 0; i < MAX_DIAMONDS; i++) {
      const gem = el('span', { class: 'diamond', text: '💎' })
      this.gems.push(gem)
      this.root.appendChild(gem)
    }
  }

  set(value: number): void {
    this.gems.forEach((gem, i) => {
      const alive = i < value
      gem.classList.toggle('lost', !alive)
    })
    this.root.setAttribute('aria-label', `נשארו ${value} יהלומים מתוך ${MAX_DIAMONDS}`)
  }

  /** אנימציית ניצוץ ליהלום שיורד. */
  animateLoss(value: number): void {
    const idx = value
    const gem = this.gems[idx]
    if (gem) {
      gem.classList.add('losing')
      window.setTimeout(() => gem.classList.remove('losing'), 500)
    }
    this.set(value)
  }
}
