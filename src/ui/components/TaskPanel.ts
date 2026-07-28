/**
 * פאנל המשימה: החלון הגדול שנפתח מעל העולם התלת-ממדי.
 *
 * כל סוגי המשימות מוצגים כאן, וכולם חולקים את אותה מסגרת:
 * יציאה, התקדמות, יהלומים, הוראה בעברית, גוף המשימה, רמז ומשוב.
 * שום מסך לא דורש קריאה באנגלית.
 */

import { getArea } from '../../learning/areas'
import { sfxAreaComplete, sfxDiamondLost, sfxRetry, sfxStar, sfxSuccess } from '../../learning/audio'
import { getProgress } from '../../learning/progress'
import type { Task, TaskOption } from '../../learning/questions'
import type { AreaSession } from '../../learning/session'
import { isRecognitionSupported, listenOnce } from '../../learning/speech'
import { getWord } from '../../learning/vocabulary'
import { bigButton, clear, el } from '../dom'
import { DiamondBar } from './DiamondBar'
import { playWord, sayInstruction, speakerButton } from './SpeakerButton'

export interface TaskPanelDeps {
  onExit: () => void
  onCorrect: () => void
  onWrong: () => void
  onAreaComplete: (unlockedAreaId: string | undefined) => void
}

const FEEDBACK_MS = 3400

export class TaskPanel {
  readonly root: HTMLElement
  private panel: HTMLElement
  private topBar: HTMLElement
  private promptBox: HTMLElement
  private body: HTMLElement
  private hintBox: HTMLElement
  private diamonds = new DiamondBar()
  private progressFill: HTMLElement
  private progressText: HTMLElement

  private session: AreaSession | null = null
  private busy = false
  private advanceTimer: number | undefined
  private cancelListen: (() => void) | null = null
  private selectedPairWord: string | null = null

  constructor(
    host: HTMLElement,
    private readonly deps: TaskPanelDeps,
  ) {
    this.progressFill = el('i')
    this.progressText = el('span', { class: 'task-progress-text' })

    this.topBar = el('header', { class: 'task-top' }, [
      bigButton('יציאה', () => this.exit(), { emoji: '✖', variant: 'ghost small', ariaLabel: 'יציאה מהמשימה וחזרה לטירה' }),
      el('div', { class: 'task-progress' }, [el('span', { class: 'task-progress-bar' }, [this.progressFill]), this.progressText]),
      this.diamonds.root,
    ])

    this.promptBox = el('div', { class: 'task-prompt' })
    this.body = el('div', { class: 'task-body' })
    this.hintBox = el('div', { class: 'task-hint', role: 'status' })
    this.hintBox.hidden = true

    this.panel = el('div', { class: 'task-panel' }, [this.topBar, this.promptBox, this.body, this.hintBox])
    this.root = el('div', { class: 'task-overlay' }, [this.panel])
    this.root.hidden = true
    host.appendChild(this.root)

    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        this.exit()
      }
    })
  }

  get isOpen(): boolean {
    return !this.root.hidden
  }

  open(session: AreaSession): void {
    this.session = session
    this.root.hidden = false
    this.panel.style.setProperty('--accent', session.area.accent)
    this.render()
  }

  close(): void {
    this.clearTimers()
    this.session = null
    this.root.hidden = true
    clear(this.body)
  }

  private exit(): void {
    this.clearTimers()
    this.deps.onExit()
  }

  private clearTimers(): void {
    if (this.advanceTimer !== undefined) window.clearTimeout(this.advanceTimer)
    this.advanceTimer = undefined
    this.cancelListen?.()
    this.cancelListen = null
  }

  // ------------------------------------------------------------ רינדור

  private render(): void {
    const session = this.session
    if (!session) return
    this.busy = false
    this.selectedPairWord = null
    this.clearTimers()

    const task = session.task
    const pos = session.position
    this.diamonds.set(session.lives.value)
    const pct = Math.round((pos.done / Math.max(1, pos.total)) * 100)
    this.progressFill.style.width = `${pct}%`
    this.progressText.textContent = `${pos.done} מתוך ${pos.total}`

    // הוראה בעברית, מוצגת תמיד וגם מוקראת אם יש קול עברי
    clear(this.promptBox)
    const prompt = task.isPractice ? `בואי נזכיר את זה יחד. ${task.promptHe}` : task.promptHe
    this.promptBox.appendChild(
      el('button', {
        class: 'speaker-btn small he',
        type: 'button',
        text: '🔈',
        ariaLabel: 'להשמיע את ההוראה בעברית',
        onClick: () => sayInstruction(prompt),
      }),
    )
    this.promptBox.appendChild(el('p', { class: 'task-prompt-text', text: prompt }))

    this.hintBox.hidden = true
    this.hintBox.textContent = ''
    const carriedHint = session.currentHint()
    if (carriedHint && session.lives.restartCount > 0) this.showHint(carriedHint)

    clear(this.body)
    this.renderBody(task)

    // משמיעים את המילה רק אחרי שהמסך מצויר, כדי שהיא תתלווה לתמונה
    if (task.speakOnStart) {
      window.setTimeout(() => {
        if (this.session?.task.key === task.key) playWord(task.speakOnStart as string)
      }, 420)
    }

    this.applyHiddenDistractors(session.currentHideDistractors())
  }

  private renderBody(task: Task): void {
    if (task.stimulus) this.body.appendChild(this.buildStimulus(task))

    if (task.speakOnStart) {
      const replay = el('div', { class: 'task-replay' }, [
        speakerButton(task.speakOnStart, { label: 'להשמיע שוב את המילה' }),
        el('span', { class: 'task-replay-label', text: 'לחצי כדי לשמוע שוב' }),
      ])
      this.body.appendChild(replay)
    }

    switch (task.type) {
      case 'match-word-object':
        this.body.appendChild(this.buildMatch(task))
        break
      case 'say-it':
        this.body.appendChild(this.buildSayIt(task))
        break
      case 'two-words':
        this.body.appendChild(this.buildOptions(task, 'two-words-grid'))
        break
      case 'color-pick':
        this.body.appendChild(this.buildOptions(task, 'color-grid'))
        break
      case 'letter-sound':
        this.body.appendChild(this.buildOptions(task, 'letter-grid'))
        break
      default:
        this.body.appendChild(this.buildOptions(task, 'image-grid'))
        break
    }
  }

  private buildStimulus(task: Task): HTMLElement {
    const box = el('div', { class: 'task-stimulus' })
    const repeat = Math.max(1, task.stimulus?.repeat ?? 1)
    const emoji = task.stimulus?.emoji ?? ''
    if (repeat === 1) {
      box.appendChild(el('span', { class: 'stimulus-single', text: emoji }))
    } else {
      const grid = el('div', { class: 'stimulus-count' })
      for (let i = 0; i < repeat; i++) grid.appendChild(el('span', { class: 'stimulus-item', text: emoji }))
      box.appendChild(grid)
      box.appendChild(el('span', { class: 'visually-hidden', text: `יש כאן ${repeat} פריטים` }))
    }
    return box
  }

  // ------------------------------------------------------------ אפשרויות

  private buildOptions(task: Task, gridClass: string): HTMLElement {
    const grid = el('div', { class: `options ${gridClass}`, role: 'group', ariaLabel: 'אפשרויות תשובה' })
    const showEnglish = getProgress().settings.showEnglishText

    task.options.forEach((opt, i) => {
      const btn = el('button', {
        class: 'option',
        type: 'button',
        dataset: { id: opt.id },
        ariaLabel: optionAria(task, opt, i),
      })

      if (opt.color) {
        btn.appendChild(el('span', { class: `swatch shape-${opt.shape ?? 'circle'}`, style: { background: opt.color } }))
      } else if (opt.speak) {
        const badge = el('span', { class: 'option-badge', text: opt.badge ?? String(i + 1) })
        const spk = el('span', { class: 'option-speaker', text: '🔊' })
        btn.appendChild(badge)
        btn.appendChild(spk)
      } else if (opt.repeat && opt.repeat > 1) {
        const group = el('div', { class: 'option-count' })
        for (let k = 0; k < opt.repeat; k++) group.appendChild(el('span', { text: opt.emoji ?? '⭐' }))
        btn.appendChild(group)
      } else if (task.type === 'letter-sound') {
        btn.appendChild(el('span', { class: 'option-letter', text: opt.emoji ?? '' }))
      } else {
        btn.appendChild(el('span', { class: 'option-emoji', text: opt.emoji ?? '' }))
      }

      if (opt.color && opt.label) btn.appendChild(el('span', { class: 'option-label', text: opt.label }))
      if (showEnglish && opt.english) btn.appendChild(el('span', { class: 'option-english', text: opt.english }))

      btn.addEventListener('click', () => {
        if (opt.speak) {
          // באפשרות שמיעה הלחיצה הראשונה משמיעה, ורק לחיצה על "בוחרת" עונה
          playWord(opt.speak, btn)
          return
        }
        this.answer(opt.id, btn)
      })

      grid.appendChild(btn)

      if (opt.speak) {
        const choose = bigButton('בוחרת', () => this.answer(opt.id, btn), {
          variant: 'small sky',
          ariaLabel: `לבחור באפשרות ${opt.badge ?? i + 1}`,
        })
        choose.classList.add('option-choose')
        btn.after(choose)
      }
    })

    this.enableArrowNav(grid)
    return grid
  }

  private buildSayIt(task: Task): HTMLElement {
    const word = getWord(task.wordId)
    const box = el('div', { class: 'say-it' })
    box.appendChild(el('p', { class: 'say-it-word', text: word.hebrew }))

    // המשימה הזאת תמיד מצליחה. אסור להעביר אותה דרך answer,
    // כי אין לה רשימת אפשרויות ואז כל לחיצה הייתה נספרת כטעות.
    const done = bigButton('שמעתי ואמרתי', () => this.confirmSaid(), { emoji: '✅', variant: 'gold' })
    box.appendChild(done)
    box.appendChild(
      el('p', { class: 'say-it-note', text: 'המשחק לא מקשיב לך. פשוט תגידי את המילה בקול, ואז תלחצי על הכפתור.' }),
    )

    if (getProgress().settings.speechRecognition && isRecognitionSupported()) {
      const mic = bigButton('לנסות לומר למיקרופון', () => {
        mic.disabled = true
        mic.classList.add('listening')
        this.cancelListen = listenOnce(word.english, (heard) => {
          mic.disabled = false
          mic.classList.remove('listening')
          this.showHint(heard ? 'שמעתי אותך! מדהים 🌟' : 'לא הצלחתי לשמוע טוב, אבל זה בסדר גמור 💛')
        })
      }, { emoji: '🎤', variant: 'ghost' })
      box.appendChild(mic)
      box.appendChild(el('p', { class: 'say-it-note', text: 'המיקרופון הוא רק בשביל הכיף. הוא אף פעם לא מוריד יהלום.' }))
    }

    return box
  }

  private buildMatch(task: Task): HTMLElement {
    const box = el('div', { class: 'match-box' })
    const pairs = task.pairs ?? []
    const session = this.session

    const wordsCol = el('div', { class: 'match-col match-words' })
    const objectsCol = el('div', { class: 'match-col match-objects' })

    const wordButtons = new Map<string, HTMLElement>()

    for (const pair of pairs) {
      const wb = el('button', { class: 'match-card word', type: 'button', dataset: { id: pair.id }, ariaLabel: 'מילה להשמעה' }, [
        el('span', { class: 'option-speaker', text: '🔊' }),
      ])
      wb.addEventListener('click', () => {
        if (this.busy || wb.classList.contains('matched')) return
        playWord(pair.english, wb)
        this.selectedPairWord = pair.id
        for (const b of wordButtons.values()) b.classList.remove('selected')
        wb.classList.add('selected')
      })
      wordButtons.set(pair.id, wb)
      wordsCol.appendChild(wb)
    }

    for (const pair of shuffleArray(pairs)) {
      const ob = el('button', { class: 'match-card object', type: 'button', dataset: { id: pair.id }, ariaLabel: pair.hebrew })
      if (pair.color) ob.appendChild(el('span', { class: 'swatch shape-circle', style: { background: pair.color } }))
      else ob.appendChild(el('span', { class: 'option-emoji', text: pair.emoji }))
      ob.appendChild(el('span', { class: 'option-label', text: pair.hebrew }))

      ob.addEventListener('click', () => {
        if (this.busy || !session || ob.classList.contains('matched')) return
        if (!this.selectedPairWord) {
          this.showHint('קודם לחצי על רמקול כדי לשמוע מילה 👂')
          return
        }
        const chosenWord = this.selectedPairWord
        const result = session.answerPair(chosenWord, pair.id)
        if (result === null) {
          // זוג נכון, אבל עוד לא סיימנו את כולם
          sfxStar()
          wordButtons.get(chosenWord)?.classList.add('matched')
          ob.classList.add('matched')
          this.selectedPairWord = null
          for (const b of wordButtons.values()) b.classList.remove('selected')
          return
        }
        if (result.correct) {
          wordButtons.get(chosenWord)?.classList.add('matched')
          ob.classList.add('matched')
          this.onCorrectResult()
        } else {
          this.onWrongResult(result, ob)
        }
      })

      objectsCol.appendChild(ob)
    }

    box.appendChild(wordsCol)
    box.appendChild(objectsCol)
    return box
  }

  // ------------------------------------------------------------ תשובות

  /** אישור במשימת "שמעתי ואמרתי". אין כאן טעות אפשרית ואין מיקרופון. */
  private confirmSaid(): void {
    const session = this.session
    if (!session || this.busy) return
    session.confirmSaid()
    this.onCorrectResult()
  }

  private answer(optionId: string, btn?: HTMLElement): void {
    const session = this.session
    if (!session || this.busy) return
    const result = session.answer(optionId)
    if (result.correct) {
      btn?.classList.add('correct')
      this.onCorrectResult()
    } else {
      this.onWrongResult(result, btn)
    }
  }

  private onCorrectResult(): void {
    const session = this.session
    if (!session) return
    this.busy = true
    sfxSuccess()
    this.deps.onCorrect()
    this.showFeedback(session.task)
  }

  private onWrongResult(result: { diamonds: number; outOfDiamonds: boolean; hint?: string; hideDistractors: number }, btn?: HTMLElement): void {
    const session = this.session
    if (!session) return
    this.busy = true
    sfxRetry()
    sfxDiamondLost()
    this.deps.onWrong()
    this.diamonds.animateLoss(result.diamonds)

    if (btn) {
      btn.classList.add('wrong')
      btn.appendChild(el('span', { class: 'option-mark', text: '✗' }))
    }

    if (result.hint) this.showHint(result.hint)
    this.applyHiddenDistractors(result.hideDistractors)

    const task = session.task
    window.setTimeout(() => {
      if (this.session?.task.key !== task.key) return
      if (task.speakOnStart) playWord(task.speakOnStart)
      if (result.outOfDiamonds) {
        this.showOutOfDiamonds()
      } else {
        btn?.classList.remove('wrong')
        btn?.querySelector('.option-mark')?.remove()
        this.busy = false
      }
    }, 750)
  }

  private applyHiddenDistractors(count: number): void {
    if (count <= 0) return
    const wrongButtons = Array.from(this.body.querySelectorAll<HTMLButtonElement>('.option')).filter((b) => {
      const opt = this.session?.task.options.find((o) => o.id === b.dataset.id)
      return opt && !opt.correct && !b.classList.contains('hidden-option')
    })
    for (let i = 0; i < Math.min(count, wrongButtons.length); i++) {
      const b = wrongButtons[i]
      b.classList.add('hidden-option')
      b.disabled = true
      b.setAttribute('aria-hidden', 'true')
      // במשימת שתי מילים לכל אפשרות יש גם כפתור "בוחרת" שצריך להיעלם איתה
      const sibling = b.nextElementSibling
      if (sibling instanceof HTMLElement && sibling.classList.contains('option-choose')) {
        sibling.classList.add('hidden-option')
        if (sibling instanceof HTMLButtonElement) sibling.disabled = true
      }
    }
  }

  private showHint(text: string): void {
    this.hintBox.hidden = false
    clear(this.hintBox)
    this.hintBox.appendChild(el('span', { class: 'hint-icon', text: '💡' }))
    this.hintBox.appendChild(el('span', { text }))
  }

  // ------------------------------------------------------------ משוב

  private showFeedback(task: Task): void {
    const word = getWord(task.wordId)
    const overlay = el('div', { class: 'feedback', role: 'dialog', ariaLabel: 'כל הכבוד' })

    const emoji = task.type === 'letter-sound' ? (word.letterEmoji ?? word.emoji) : word.emoji
    overlay.appendChild(el('div', { class: 'feedback-emoji', text: emoji }))
    overlay.appendChild(el('div', { class: 'feedback-cheer', text: pickCheer() }))

    const wordRow = el('div', { class: 'feedback-word' })
    wordRow.appendChild(speakerButton(word.sentence ?? word.english, { label: `להשמיע שוב את ${word.english}` }))
    wordRow.appendChild(el('span', { class: 'feedback-en', text: word.english }))
    overlay.appendChild(wordRow)
    overlay.appendChild(el('div', { class: 'feedback-he', text: word.hebrew }))

    const next = bigButton('להמשיך', () => this.advance(), { emoji: '➜', variant: 'gold' })
    overlay.appendChild(next)

    this.panel.appendChild(overlay)
    window.setTimeout(() => next.focus(), 60)

    // משמיעים שוב את המילה, ואם זו אות גם את המשפט המלא
    window.setTimeout(() => {
      playWord(word.sentence ?? word.english)
      window.setTimeout(() => sfxStar(), 500)
    }, 260)

    this.advanceTimer = window.setTimeout(() => this.advance(), FEEDBACK_MS)
  }

  private advance(): void {
    const session = this.session
    if (!session) return
    this.clearTimers()
    this.panel.querySelector('.feedback')?.remove()

    const outcome = session.advance()
    if (!outcome.areaCompleted) {
      this.render()
      return
    }
    this.showAreaComplete(outcome.unlockedAreaId)
  }

  private showAreaComplete(unlockedAreaId: string | undefined): void {
    const session = this.session
    if (!session) return
    const area = getArea(session.area.id)
    sfxAreaComplete()

    clear(this.body)
    this.hintBox.hidden = true
    clear(this.promptBox)

    const card = el('div', { class: 'area-complete' })
    card.appendChild(el('div', { class: 'area-complete-emoji', text: area.emoji }))
    card.appendChild(el('h2', { class: 'area-complete-title', text: `סיימת את ${area.title}!` }))
    card.appendChild(el('p', { class: 'area-complete-text', text: area.done }))
    card.appendChild(el('div', { class: 'area-complete-stars', text: '⭐⭐⭐⭐⭐' }))
    card.appendChild(
      bigButton(unlockedAreaId ? 'קדימה, השער נפתח!' : 'חזרה לטירה', () => this.deps.onAreaComplete(unlockedAreaId), {
        emoji: unlockedAreaId ? '🚪' : '🏰',
        variant: 'gold',
      }),
    )
    this.body.appendChild(card)
    window.setTimeout(() => card.querySelector('button')?.focus(), 80)
  }

  private showOutOfDiamonds(): void {
    const session = this.session
    if (!session) return
    const overlay = el('div', { class: 'feedback gentle', role: 'dialog', ariaLabel: 'בואי ננסה שוב' })
    overlay.appendChild(el('div', { class: 'feedback-emoji', text: '🌟' }))
    overlay.appendChild(el('div', { class: 'feedback-cheer', text: 'בואי ננסה שוב יחד' }))
    overlay.appendChild(
      el('p', { class: 'feedback-he', text: 'קיבלת ארבעה יהלומים חדשים ורמז נוסף. אנחנו נשארות בדיוק באותה משימה.' }),
    )
    const btn = bigButton('אני מוכנה', () => {
      overlay.remove()
      session.restartCurrentTask()
      this.render()
    }, { emoji: '💪', variant: 'gold' })
    overlay.appendChild(btn)
    this.panel.appendChild(overlay)
    window.setTimeout(() => btn.focus(), 60)
  }

  // ------------------------------------------------------------ מקלדת

  private enableArrowNav(grid: HTMLElement): void {
    grid.addEventListener('keydown', (e) => {
      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']
      if (!keys.includes(e.key)) return
      const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      if (buttons.length === 0) return
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (current < 0) {
        buttons[0].focus()
        e.preventDefault()
        return
      }
      // בממשק ימין לשמאל, חץ שמאלה מתקדם קדימה
      const forward = e.key === 'ArrowLeft' || e.key === 'ArrowDown'
      const next = (current + (forward ? 1 : -1) + buttons.length) % buttons.length
      buttons[next].focus()
      e.preventDefault()
    })
  }
}

const CHEERS = ['כל הכבוד!', 'מדהים!', 'יש!', 'איזו אלופה!', 'בדיוק!', 'נהדר!', 'וואו!']

function pickCheer(): string {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)]
}

function optionAria(task: Task, opt: TaskOption, i: number): string {
  if (opt.color) return `הצבע ${opt.label ?? ''}`
  if (opt.speak) return `אפשרות ${opt.badge ?? i + 1}, לחצי כדי לשמוע`
  if (task.type === 'letter-sound') return `האות ${opt.emoji}`
  if (opt.repeat && opt.repeat > 1) return `קבוצה של ${opt.repeat}`
  return opt.label ?? `אפשרות ${i + 1}`
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
