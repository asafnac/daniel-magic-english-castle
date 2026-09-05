/**
 * העולם התלת-ממדי: רנדרר, סצנה, מצלמה ולולאת המשחק.
 *
 * המצלמה עוקבת מאחור בזווית קבועה ולא מסתובבת, כי בגיל שמונה
 * מצלמה שמסתובבת היא מקור התסכול הגדול ביותר. למעלה זה תמיד קדימה.
 */

import * as THREE from 'three'
import { Castle } from './Castle'
import { Controls } from './Controls'
import { Effects } from './Effects'
import { Player } from './Player'
import { BRIDGE_HALF, SPAWN, areaEntry, areaAt } from './layout'
import type { AvatarConfig } from '../app/avatarConfig'
import type { AreaStage } from '../learning/progress'

const CAMERA_OFFSET = new THREE.Vector3(0, 8, 11.5)
const CAMERA_LOOK_HEIGHT = 1.4
const GUIDE_ENTER_RADIUS = 3.4
const GUIDE_EXIT_RADIUS = 5.2
const MAX_DELTA = 0.05

export class World {
  readonly scene = new THREE.Scene()
  readonly castle = new Castle()
  readonly effects: Effects
  readonly player: Player
  readonly controls: Controls

  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private canvasHost: HTMLElement
  private clock = new THREE.Clock()
  private rafId = 0
  private running = false
  private nearGuideId: string | null = null
  private cameraPos = new THREE.Vector3()

  /** נקרא כשהשחקנית מגיעה לדמות מנחה, גם אם כבר סיימה איתה. */
  onReachGuide: ((areaId: string) => void) | null = null
  /** נקרא כשהשחקנית נכנסת לאזור חדש. null כשהיא בחצר או על גשר. */
  onEnterArea: ((areaId: string | null) => void) | null = null
  /**
   * נקרא כשהשחקנית מתקרבת לשער נעול. בלי זה השער פשוט חוסם בשקט,
   * והטירה נראית כאילו היא נגמרת שם.
   */
  onApproachLockedGate: ((fromAreaId: string, toAreaId: string) => void) | null = null

  private lastAreaId: string | null | undefined = undefined
  private nearGateFrom: string | null = null

  constructor(host: HTMLElement, avatar: AvatarConfig) {
    this.canvasHost = host

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight)
    this.renderer.setClearColor(0xbfe8ff)
    host.appendChild(this.renderer.domElement)
    this.renderer.domElement.classList.add('game-canvas')

    this.scene.background = new THREE.Color(0xbfe8ff)
    this.scene.fog = new THREE.Fog(0xbfe8ff, 55, 135)

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400)
    this.scene.add(this.camera)

    // תאורה רכה, בלי צללים. חוסך פריימים ונשאר עליז.
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9fd6a8, 1.05)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xfff3d6, 0.75)
    sun.position.set(12, 22, 8)
    this.scene.add(sun)

    this.scene.add(this.castle.root)

    this.player = new Player(avatar)
    this.player.setPosition(SPAWN.x, SPAWN.z)
    this.scene.add(this.player.group)

    this.effects = new Effects(this.scene)
    this.controls = new Controls(host)

    // הדמויות המנחות כבר מיושרות מול ההתקדמות בבנאי של Castle.
    this.resize()
    window.addEventListener('resize', this.resize)
  }

  // ------------------------------------------------------------ לולאה

  start(): void {
    if (this.running) return
    this.running = true
    this.clock.getDelta()
    this.loop()
  }

  stop(): void {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private loop = (): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)
    // הגבלת דלתא, כדי שחזרה מטאב ברקע לא תקפיץ את השחקנית דרך קיר
    const dt = Math.min(this.clock.getDelta(), MAX_DELTA)
    this.tick(dt)
    this.renderer.render(this.scene, this.camera)
  }

  private tick(dt: number): void {
    const dir = this.controls.direction()
    this.player.update(dt, dir, this.castle.collision)
    this.castle.update(dt)
    this.effects.update(dt)
    this.updateCamera(dt)
    this.checkGuides()
    this.checkArea()
    this.checkLockedGates()
  }

  private checkLockedGates(): void {
    const p = this.player.position
    let near: string | null = null
    let target = ''
    for (const gate of this.castle.gates) {
      if (gate.open) continue
      if (Math.abs(p.z - gate.z) < 8 && Math.abs(p.x) < BRIDGE_HALF + 3) {
        near = gate.fromAreaId
        target = gate.toAreaId
        break
      }
    }
    if (near && near !== this.nearGateFrom) {
      this.nearGateFrom = near
      this.onApproachLockedGate?.(near, target)
    } else if (!near) {
      this.nearGateFrom = null
    }
  }

  private updateCamera(dt: number): void {
    const p = this.player.position
    const desired = new THREE.Vector3(p.x + CAMERA_OFFSET.x, CAMERA_OFFSET.y, p.z + CAMERA_OFFSET.z)

    // אם קיר חוסם את המצלמה, מושכים אותה פנימה במקום לחדור דרכו
    const dx = desired.x - p.x
    const dz = desired.z - p.z
    const horizontal = Math.hypot(dx, dz)
    if (horizontal > 0.01) {
      const free = this.castle.collision.freeDistance(p.x, p.z, dx / horizontal, dz / horizontal, horizontal, 0.6)
      const clamped = Math.max(4.5, free)
      const scale = clamped / horizontal
      desired.x = p.x + dx * scale
      desired.z = p.z + dz * scale
      desired.y = Math.max(4.5, CAMERA_OFFSET.y * scale)
    }

    if (this.cameraPos.lengthSq() === 0) this.cameraPos.copy(desired)
    this.cameraPos.lerp(desired, Math.min(1, dt * 6))
    this.camera.position.copy(this.cameraPos)
    this.camera.lookAt(p.x, p.y + CAMERA_LOOK_HEIGHT, p.z)
  }

  private checkGuides(): void {
    const p = this.player.position
    let inside: string | null = null
    for (const guide of this.castle.guides) {
      // גם דמות שסיימנו איתה מדווחת. מה קורה אז זו החלטה של App,
      // והיא בהחלט לא "לפתוח שוב את המשימה".
      const d = Math.hypot(p.x - guide.x, p.z - guide.z)
      const radius = this.nearGuideId === guide.areaId ? GUIDE_EXIT_RADIUS : GUIDE_ENTER_RADIUS
      if (d < radius) {
        inside = guide.areaId
        break
      }
    }
    if (inside && inside !== this.nearGuideId) {
      this.nearGuideId = inside
      this.onReachGuide?.(inside)
    } else if (!inside) {
      this.nearGuideId = null
    }
  }

  private checkArea(): void {
    const id = areaAt(this.player.position.z)?.id ?? null
    if (id !== this.lastAreaId) {
      this.lastAreaId = id
      this.onEnterArea?.(id)
    }
  }

  // ------------------------------------------------------------ פעולות

  /** מסמן מחדש איזו דמות עדיין מחכה, לפי ההתקדמות השמורה. */
  refreshGuideMarkers(): void {
    this.castle.refreshGuides()
  }

  setGuideStage(areaId: string, stage: AreaStage): void {
    this.castle.setGuideStage(areaId, stage)
    if (stage !== 'waiting' && this.nearGuideId === areaId) this.nearGuideId = null
  }

  /** משחרר את הזיהוי, כדי שיציאה ממשימה לא תפתח אותה מיד שוב. */
  releaseGuideLock(): void {
    this.nearGuideId = null
  }

  openGate(areaId: string): void {
    this.castle.openGateFrom(areaId)
  }

  teleportToArea(areaId: string): void {
    const entry = areaEntry(areaId)
    this.player.setPosition(entry.x, entry.z)
    this.cameraPos.set(0, 0, 0)
    this.nearGuideId = null
    this.lastAreaId = undefined
  }

  setAvatar(cfg: AvatarConfig): void {
    this.player.setAvatar(cfg)
  }

  celebrate(): void {
    this.player.cheer()
    this.effects.burst(this.player.position, 18)
  }

  sparkleAtPlayer(emoji: string): void {
    this.effects.sparkle(this.player.position, emoji)
  }

  setInputEnabled(on: boolean): void {
    this.controls.setEnabled(on)
  }

  get playerPosition(): { x: number; z: number } {
    return { x: this.player.position.x, z: this.player.position.z }
  }

  // ------------------------------------------------------------ תשתית

  private resize = (): void => {
    const w = this.canvasHost.clientWidth || window.innerWidth
    const h = this.canvasHost.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(1, h)
    this.camera.updateProjectionMatrix()
  }

  dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.resize)
    this.controls.dispose()
    this.effects.clear()
    this.player.dispose()
    this.castle.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
