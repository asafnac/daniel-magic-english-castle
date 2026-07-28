/**
 * מנהל המסכים ומחבר בין שלוש השכבות.
 *
 * העולם התלת-ממדי נבנה פעם אחת ונשאר חי מתחת למסכים, כך שחזרה
 * מהגדרות או ממסך המראה לא מאבדת את המיקום בטירה ולא דורשת טעינה מחדש.
 */

import { World } from '../game/World'
import { getArea } from '../learning/areas'
import { sfxGate, sfxStar, startMusic, stopMusic } from '../learning/audio'
import { areaProgress, flushSave, getProgress } from '../learning/progress'
import { AreaSession } from '../learning/session'
import { Hud } from '../ui/components/Hud'
import { TaskPanel } from '../ui/components/TaskPanel'
import { toast } from '../ui/components/Toast'
import { clear, el } from '../ui/dom'
import { buildCharacterCreator } from '../ui/screens/CharacterCreator'
import { buildPauseMenu } from '../ui/screens/PauseMenu'
import { buildProgressScreen } from '../ui/screens/ProgressScreen'
import { buildSettingsScreen } from '../ui/screens/SettingsScreen'
import { buildTitleScreen } from '../ui/screens/TitleScreen'
import { DEFAULT_AVATAR } from './avatarConfig'

type ScreenName = 'title' | 'creator' | 'world' | 'progress' | 'settings'

export class App {
  private worldHost: HTMLElement
  private screenHost: HTMLElement
  private world: World | null = null
  private hud: Hud | null = null
  private taskPanel: TaskPanel | null = null
  private session: AreaSession | null = null
  private pauseNode: HTMLElement | null = null
  private disposeScreen: (() => void) | null = null
  private current: ScreenName = 'title'
  /** לאן לחזור אחרי מסך משני. */
  private returnTo: ScreenName = 'title'

  constructor(private readonly root: HTMLElement) {
    this.worldHost = el('div', { class: 'world-host' })
    this.screenHost = el('div', { class: 'screen-host' })
    this.root.appendChild(this.worldHost)
    this.root.appendChild(this.screenHost)

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      if (this.current !== 'world') return
      if (this.taskPanel?.isOpen) return
      e.preventDefault()
      if (this.pauseNode) this.closePause()
      else this.openPause()
    })

    this.showTitle()
  }

  // ------------------------------------------------------------ מסכים

  private setScreen(node: HTMLElement | null, dispose?: () => void): void {
    this.disposeScreen?.()
    this.disposeScreen = dispose ?? null
    clear(this.screenHost)
    if (node) this.screenHost.appendChild(node)
    this.screenHost.classList.toggle('empty', node === null)
  }

  showTitle(): void {
    this.current = 'title'
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(
      buildTitleScreen({
        onStart: () => this.startPlaying(),
        onCustomize: () => this.showCreator('title'),
        onProgress: () => this.showProgress('title'),
        onSettings: () => this.showSettings('title'),
      }),
    )
  }

  private startPlaying(): void {
    if (getProgress().avatar === null) this.showCreator('world', true)
    else this.showWorld()
  }

  private showCreator(back: ScreenName, firstTime = false): void {
    this.current = 'creator'
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    const creator = buildCharacterCreator({
      firstTime,
      onDone: (avatar) => {
        this.world?.setAvatar(avatar)
        if (back === 'world') this.showWorld()
        else this.showTitle()
      },
      onCancel: firstTime ? undefined : () => (back === 'world' ? this.showWorld() : this.showTitle()),
    })
    this.setScreen(creator.root, creator.dispose)
  }

  private showProgress(back: ScreenName): void {
    this.current = 'progress'
    this.returnTo = back
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(buildProgressScreen(() => (this.returnTo === 'world' ? this.showWorld() : this.showTitle())))
  }

  private showSettings(back: ScreenName): void {
    this.current = 'settings'
    this.returnTo = back
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(buildSettingsScreen(() => (this.returnTo === 'world' ? this.showWorld() : this.showTitle())))
  }

  // ------------------------------------------------------------ העולם

  private showWorld(): void {
    this.current = 'world'
    this.setScreen(null)
    this.worldHost.classList.remove('hidden')
    this.closePause()

    if (!this.world) this.buildWorld()
    this.world?.setInputEnabled(true)
    this.world?.start()
    this.refreshHud()
    if (getProgress().settings.music) startMusic()
  }

  private buildWorld(): void {
    const avatar = getProgress().avatar ?? DEFAULT_AVATAR
    const world = new World(this.worldHost, avatar)
    this.world = world

    world.onReachGuide = (areaId) => this.startArea(areaId)
    world.onEnterArea = (areaId) => {
      if (!areaId) {
        this.hud?.setArea('חצר הכניסה', '🏰')
        return
      }
      const area = getArea(areaId)
      this.hud?.setArea(area.title, area.emoji)
    }

    this.hud = new Hud(() => this.openPause())
    this.worldHost.appendChild(this.hud.root)

    this.taskPanel = new TaskPanel(this.worldHost, {
      onExit: () => this.closeTask(),
      onCorrect: () => {
        world.celebrate()
        this.refreshHud()
        this.hud?.pulseStars()
      },
      onWrong: () => world.sparkleAtPlayer('💎'),
      onAreaComplete: (unlockedAreaId) => this.finishArea(unlockedAreaId),
    })

    this.syncGuideMarkers()
  }

  /** דמות שכל המשימות שלה הושלמו כבר לא מקפיצה משימה בכל מעבר לידה. */
  private syncGuideMarkers(): void {
    if (!this.world) return
    for (const guide of this.world.castle.guides) {
      const ap = areaProgress(guide.areaId)
      this.world.setGuideActive(guide.areaId, ap.unlocked)
    }
  }

  private refreshHud(): void {
    const save = getProgress()
    this.hud?.setStars(save.stars)
  }

  // ------------------------------------------------------------ משימות

  private startArea(areaId: string): void {
    if (!this.world || !this.taskPanel) return
    if (this.taskPanel.isOpen) return
    const ap = areaProgress(areaId)
    if (!ap.unlocked) {
      toast('השער הזה עדיין נעול. בואי נסיים קודם את האזור הקודם 🔒')
      return
    }

    const area = getArea(areaId)
    this.session = new AreaSession(areaId)
    this.world.setInputEnabled(false)
    this.hud?.setArea(area.title, area.emoji)
    this.taskPanel.open(this.session)
  }

  private closeTask(): void {
    this.taskPanel?.close()
    this.session = null
    this.world?.releaseGuideLock()
    this.world?.setInputEnabled(true)
    // מרחיקים מעט מהדמות, כדי שהמשימה לא תיפתח מיד שוב
    const pos = this.world?.playerPosition
    if (pos) this.world?.player.setPosition(pos.x, pos.z + 5)
  }

  private finishArea(unlockedAreaId: string | undefined): void {
    const areaId = this.session?.area.id
    this.taskPanel?.close()
    this.session = null
    this.world?.setInputEnabled(true)
    this.world?.releaseGuideLock()
    this.refreshHud()
    flushSave()

    if (areaId) {
      this.world?.setGuideActive(areaId, false)
      this.world?.openGate(areaId)
      sfxGate()
    }

    if (unlockedAreaId) {
      const next = getArea(unlockedAreaId)
      this.world?.setGuideActive(unlockedAreaId, true)
      toast(`השער נפתח! ${next.emoji} ${next.title} מחכה לך`)
      sfxStar()
    } else {
      toast('סיימת את כל הטירה! את אלופה 🏆')
    }

    const pos = this.world?.playerPosition
    if (pos) this.world?.player.setPosition(pos.x, pos.z + 5)
  }

  // ------------------------------------------------------------ תפריט עצירה

  private openPause(): void {
    if (this.pauseNode || !this.world) return
    this.world.setInputEnabled(false)
    this.pauseNode = buildPauseMenu({
      onResume: () => {
        this.closePause()
        this.world?.setInputEnabled(true)
      },
      onCustomize: () => {
        this.closePause()
        this.showCreator('world')
      },
      onProgress: () => {
        this.closePause()
        this.showProgress('world')
      },
      onSettings: () => {
        this.closePause()
        this.showSettings('world')
      },
      onTitle: () => {
        this.closePause()
        stopMusic()
        this.showTitle()
      },
    })
    this.worldHost.appendChild(this.pauseNode)
  }

  private closePause(): void {
    this.pauseNode?.remove()
    this.pauseNode = null
  }
}
