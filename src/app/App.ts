/**
 * מנהל המסכים ומחבר בין שלוש השכבות.
 *
 * העולם התלת-ממדי נבנה פעם אחת ונשאר חי מתחת למסכים, כך שחזרה
 * מהגדרות או ממסך המראה לא מאבדת את המיקום בטירה ולא דורשת טעינה מחדש.
 */

import { World } from '../game/World'
import { getArea } from '../learning/areas'
import { sfxGate, sfxStar, startMusic, stopMusic } from '../learning/audio'
import { advanceQuest, areaProgress, areaStage, collectItem, flushSave, getProgress, markSceneSeen } from '../learning/progress'
import { AreaSession } from '../learning/session'
import { PracticeSession, practiceAvailable } from '../learning/practiceSession'
import { Hud } from '../ui/components/Hud'
import { sayInstruction } from '../ui/components/SpeakerButton'
import { TaskPanel } from '../ui/components/TaskPanel'
import { toast } from '../ui/components/Toast'
import { clear, el } from '../ui/dom'
import { buildCharacterCreator } from '../ui/screens/CharacterCreator'
import { buildLearnIntro } from '../ui/screens/LearnIntro'
import { buildMapScreen } from '../ui/screens/MapScreen'
import { buildPauseMenu } from '../ui/screens/PauseMenu'
import { buildProgressScreen } from '../ui/screens/ProgressScreen'
import { buildSentenceLab } from '../ui/screens/SentenceLab'
import { buildParentScreen } from '../ui/screens/ParentScreen'
import { buildSettingsScreen } from '../ui/screens/SettingsScreen'
import { buildSceneScreen } from '../ui/screens/SceneScreen'
import { buildTitleScreen } from '../ui/screens/TitleScreen'
import { getScene } from '../learning/scenes'
import { getQuest, questStartBeat } from '../learning/quests'
import { buildAskScreen } from '../ui/screens/AskScreen'
import { buildSayScreen } from '../ui/screens/SayScreen'
import { buildRewardScreen } from '../ui/screens/RewardScreen'
import { buildRoomScreen } from '../ui/screens/RoomScreen'
import { buildStoriesScreen } from '../ui/screens/StoriesScreen'
import { buildChaseScreen } from '../ui/screens/ChaseScreen'
import { DEFAULT_AVATAR } from './avatarConfig'

type ScreenName = 'title' | 'creator' | 'world' | 'progress' | 'settings' | 'map' | 'learn' | 'lab' | 'parent' | 'scene' | 'quest' | 'room' | 'stories'

export class App {
  private worldHost: HTMLElement
  private screenHost: HTMLElement
  private world: World | null = null
  private hud: Hud | null = null
  private taskPanel: TaskPanel | null = null
  private session: AreaSession | null = null
  private pauseNode: HTMLElement | null = null
  /** לחצו "תרגול" לפני שהייתה דמות. הכוונה ממתינה ליצירת הדמות. */
  private pendingPractice = false
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
        onStory: () => this.showStories(),
        onPractice: () => this.startPracticeFromTitle(),
        onRoom: () => this.showRoom(),
        onCustomize: () => this.showCreator('title'),
        onProgress: () => this.showProgress('title'),
        onSettings: () => this.showSettings('title'),
        onParent: () => this.showParent('title'),
      }),
    )
  }

  /** רשימת הסיפורים. משם נכנסים לחדש, לאמצע, או לצפייה חוזרת. */
  private showStories(): void {
    this.current = 'stories'
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(
      buildStoriesScreen({
        onPick: (questId) => this.runQuest(questId, questStartBeat(questId)),
        onBack: () => this.showTitle(),
      }),
    )
  }

  /**
   * מריץ משימה מהפעימה שנמסרה.
   *
   * זו השרשרת: סצנה, בקשה באנגלית, שיחה, פרס. כל פעימה מצוירת על
   * ידי המסך שמתאים לה, וכשהיא נגמרת המיקום נשמר והבאה עולה.
   *
   * שמירת המיקום היא לא נוחות: ילדה בת שמונה יוצאת באמצע, וסיפור
   * שמתחיל מההתחלה בכל כניסה הוא סיפור שלא מסיימים לעולם.
   *
   * הפעימה מגיעה כפרמטר ולא נקראת כאן מהשמירה, וזה מה שמאפשר
   * צפייה חוזרת: המונה השמור הוא מקסימום בלבד, אז מעבר חוזר על
   * סיפור שהושלם לא דורס כלום - אבל רק אם הריצה זוכרת איפה היא,
   * במקום לשאול כל פעם מחדש ולקפוץ ישר לסוף.
   */
  private runQuest(questId: string, at: number): void {
    const quest = getQuest(questId)

    // הסיפור נגמר. חוזרים לרשימה, ושם כבר מחכה הבא.
    if (at >= quest.beats.length) {
      this.showStories()
      return
    }

    const beat = quest.beats[at]
    const next = (): void => {
      advanceQuest(questId, at + 1)
      this.runQuest(questId, at + 1)
    }
    const exit = (): void => this.showStories()

    this.current = 'quest'
    this.world?.stop()
    this.worldHost.classList.add('hidden')

    if (beat.kind === 'scene') {
      const view = buildSceneScreen({
        scene: getScene(beat.scene),
        onDone: () => {
          markSceneSeen(beat.scene)
          next()
        },
        onExit: exit,
      })
      this.setScreen(view.root, view.dispose)
      return
    }

    if (beat.kind === 'ask') {
      const view = buildAskScreen({ beat, onDone: next, onExit: exit })
      this.setScreen(view.root, view.dispose)
      return
    }

    if (beat.kind === 'say') {
      const view = buildSayScreen({ beat, onDone: next, onExit: exit })
      this.setScreen(view.root, view.dispose)
      return
    }

    if (beat.kind === 'play') {
      const view = buildChaseScreen({ onDone: next, onExit: exit })
      this.setScreen(view.root, view.dispose)
      return
    }

    collectItem(beat.item)
    this.setScreen(buildRewardScreen({ itemId: beat.item, text: beat.text, onDone: next }))
  }

  private showRoom(): void {
    this.current = 'room'
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(buildRoomScreen(() => this.showTitle()))
  }

  private startPlaying(): void {
    if (getProgress().avatar === null) this.showCreator('world', true)
    else this.showWorld()
  }

  /**
   * תרגול ישר ממסך הפתיחה.
   *
   * עד עכשיו התרגול היה קיים רק בתפריט שנפתח מתוך העולם התלת-ממדי,
   * כלומר אחרי שנכנסים, מוצאים כפתור בפינה, ובוחרים פריט שני מתוך
   * שמונה. ילדה בת שמונה שנכנסת ומסתובבת בעולם לא מגיעה לשם, וזה
   * בדיוק מה שקרה: היא טיילה בטירה שבוע ולא פתחה אף משימה.
   *
   * העולם עדיין נטען מאחור, כי משם ממשיכים אחרי הסבב - אבל היא לא
   * צריכה לנווט בו כדי להתחיל ללמוד.
   */
  private startPracticeFromTitle(): void {
    if (getProgress().avatar === null) {
      // אין עדיין דמות, אז יצירת הדמות באה קודם - אבל הכוונה נשמרת.
      // בלי זה הלחיצה על "תרגול" מסתיימת בטיול בעולם, כלומר בדיוק
      // במקום שממנו ניסינו לצאת.
      this.pendingPractice = true
      this.showCreator('world', true)
      return
    }
    this.showWorld()
    this.startPractice()
  }

  private showCreator(back: ScreenName, firstTime = false): void {
    this.current = 'creator'
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    const creator = buildCharacterCreator({
      firstTime,
      onDone: (avatar) => {
        this.world?.setAvatar(avatar)
        if (back === 'world') {
          this.showWorld()
          if (this.pendingPractice) {
            this.pendingPractice = false
            this.startPractice()
          }
        } else this.showTitle()
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

    // שער נעול חייב לספר מה מחכה מאחוריו. אחרת נראה שהטירה נגמרה כאן.
    world.onApproachLockedGate = (fromAreaId, toAreaId) => {
      const behind = getArea(toAreaId)
      const current = getArea(fromAreaId)
      const message = `מאחורי השער מחכה ${behind.emoji} ${behind.title}. צריך לסיים את ${current.title} כדי לפתוח אותו`
      toast(`🔒 ${message}`, 5200)
      sayInstruction(message)
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
    this.world?.refreshGuideMarkers()
  }

  private refreshHud(): void {
    const save = getProgress()
    this.hud?.setStars(save.stars)
  }

  // ------------------------------------------------------------ משימות

  private startArea(areaId: string): void {
    if (!this.world || !this.taskPanel) return
    if (this.taskPanel.isOpen) return
    if (this.current === 'learn') return
    const stage = areaStage(areaId)
    if (stage === 'locked') {
      toast('השער הזה עדיין נעול. בואי נסיים קודם את האזור הקודם 🔒')
      return
    }

    // אזור שסיימנו כבר לא עוצר אותה. הדמות המנחה עומדת בדיוק על
    // השביל שמוביל לשער, ולכן פתיחה אוטומטית כאן הייתה כלוב: כל
    // ניסיון להתקדם החזיר אותה למשימה שכבר עברה.
    if (stage === 'done') {
      const area = getArea(areaId)
      toast(`⭐ כבר סיימת את ${area.title}! הדרך קדימה פתוחה`, 3600)
      return
    }

    const ap = areaProgress(areaId)
    // בפעם הראשונה באזור עוברים קודם על המילים בלי שאלות ובלי יהלומים.
    // להיפגש עם מילה חדשה בתוך מבחן זה מתכון לתסכול.
    if (ap.completedTasks === 0) {
      this.showLearnIntro(areaId)
      return
    }
    this.openTasks(areaId)
  }

  private showLearnIntro(areaId: string): void {
    this.current = 'learn'
    this.world?.setInputEnabled(false)
    const area = getArea(areaId)
    this.hud?.setArea(area.title, area.emoji)
    this.setScreen(
      buildLearnIntro({
        areaId,
        onStart: () => {
          this.current = 'world'
          this.setScreen(null)
          this.openTasks(areaId)
        },
        onSkip: () => {
          this.current = 'world'
          this.setScreen(null)
          this.openTasks(areaId)
        },
      }),
    )
  }

  private openTasks(areaId: string): void {
    if (!this.world || !this.taskPanel) return
    const area = getArea(areaId)
    this.session = new AreaSession(areaId)
    this.world.setInputEnabled(false)
    this.hud?.setArea(area.title, area.emoji)
    this.taskPanel.open(this.session)
  }

  private showMap(): void {
    this.current = 'map'
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(
      buildMapScreen({
        onTravel: (areaId) => {
          this.showWorld()
          this.world?.teleportToArea(areaId)
          const area = getArea(areaId)
          this.hud?.setArea(area.title, area.emoji)
          toast(`${area.emoji} ${area.title}`)
        },
        onBack: () => this.showWorld(),
      }),
    )
  }

  /**
   * מעבדת המשפטים. אין בה משימה ואין בה יהלומים, ולכן היא לא עוברת
   * דרך AreaSession בכלל, אלא יושבת כמסך רגיל מעל העולם.
   */
  private showParent(back: ScreenName): void {
    this.current = 'parent'
    this.returnTo = back
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(buildParentScreen({ onBack: () => (this.returnTo === 'world' ? this.showWorld() : this.showTitle()) }))
  }

  /**
   * תרגול קסום: סבב קצר שנבנה ממה שדניאל צריכה עכשיו, ולא מרשימה
   * כתובה מראש. זה מה שגורם למשחק לא להיגמר אחרי שסיימו את הטירה.
   */
  private startPractice(): void {
    if (!this.world || !this.taskPanel) return
    if (this.taskPanel.isOpen) return
    if (practiceAvailable() === 0) {
      toast('עוד אין מה לתרגל. אחרי כמה משימות בטירה זה ייפתח ✨')
      return
    }
    const session = new PracticeSession()
    if (session.isEmpty) {
      toast('עוד אין מה לתרגל. אחרי כמה משימות בטירה זה ייפתח ✨')
      return
    }
    this.session = null
    this.current = 'world'
    this.setScreen(null)
    this.worldHost.classList.remove('hidden')
    this.world.setInputEnabled(false)
    this.world.start()
    this.hud?.setArea('תרגול קסום', '✨')
    this.taskPanel.open(session)
  }

  private showSentenceLab(): void {
    this.current = 'lab'
    this.world?.stop()
    this.worldHost.classList.add('hidden')
    this.setScreen(buildSentenceLab({ onBack: () => this.showWorld() }))
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
      this.world?.setGuideStage(areaId, 'done')
      this.world?.openGate(areaId)
      sfxGate()
    }

    if (unlockedAreaId) {
      const next = getArea(unlockedAreaId)
      this.world?.setGuideStage(unlockedAreaId, 'waiting')
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
      onMap: () => {
        this.closePause()
        this.showMap()
      },
      onLab: () => {
        this.closePause()
        this.showSentenceLab()
      },
      onPractice: () => {
        this.closePause()
        this.startPractice()
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
