/**
 * בניית הטירה: חצר הכניסה, חמישה אזורים, גשרים, שערים ודמויות מנחות.
 *
 * הקובץ הזה מייצר גם את הגאומטריה וגם את מלבני ההתנגשות מאותה פריסה,
 * כך שאי אפשר שהחומה תיראה במקום אחד ותחסום במקום אחר.
 */

import * as THREE from 'three'
import { AREAS, getArea } from '../learning/areas'
import { areaProgress } from '../learning/progress'
import { Collision } from './Collision'
import {
  AREA_LAYOUTS,
  BRIDGE_HALF,
  COURTYARD,
  HALF_WIDTH,
  type AreaLayout,
} from './layout'
import { Res, archway, castleFacade, cloud, emojiSprite, flowerPatch, placeAt, propPost, tower, tree } from './props'

const WALL_HEIGHT = 4.5
const WALL_THICK = 1.2

export interface Gate {
  /** האזור שסיומו פותח את השער. */
  fromAreaId: string
  toAreaId: string
  group: THREE.Group
  doorL: THREE.Group
  doorR: THREE.Group
  lock: THREE.Sprite
  z: number
  open: boolean
  /** התקדמות אנימציית הפתיחה, 0 עד 1. */
  anim: number
}

export interface Guide {
  areaId: string
  group: THREE.Group
  marker: THREE.Sprite
  x: number
  z: number
}

/** אימוג'ים מקשטים לכל נושא. */
const THEME_PROPS: Record<AreaLayout['theme'], string[]> = {
  garden: ['🌷', '🌻', '⭐', '🌸', '🦋', '🌈'],
  animals: ['🐱', '🐶', '🐦', '🐟', '🐴', '🐰', '🦁', '🐵'],
  kitchen: ['🍎', '🍌', '🍊', '🥛', '🍞', '🍰', '🥚', '💧'],
  numbers: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '💎', '⭐', '🔟'],
  library: ['📕', '📗', '📘', '🕯️', '🦉', '📜'],
  friends: ['👋', '🙋', '✅', '❌', '🏷️', '🎈'],
  home: ['🏠', '👩', '👨', '👶', '🛋️', '🪟'],
  opposites: ['🎭', '😊', '😢', '🔵', '🔹', '🔁'],
  classroom: ['🎒', '✏️', '🖊️', '📖', '🪑', '🍎'],
  sounds: ['🔮', '📌', '🍳', '🐜', '🚰', '🌀'],
  spells: ['📜', '🗺️', '🍲', '🐷', '🧢', '⛏️'],
  runes: ['👑', '🛏️', '🚌', '🐔', '🥁', '🚩'],
  bridge: ['🌉', '🐶', '🐱', '🐟', '😊', '😢'],
  wordyard: ['🪄', '🎒', '🖊️', '📕', '🔵', '🔴'],
  echo: ['👂', '🦉', '🚢', '🐑', '🦺', '🧭'],
}

export class Castle {
  readonly root = new THREE.Group()
  readonly collision = new Collision()
  readonly gates: Gate[] = []
  readonly guides: Guide[] = []
  private readonly res = new Res()
  private readonly clouds: THREE.Group[] = []
  private time = 0

  constructor() {
    this.buildCourtyard()
    for (const layout of AREA_LAYOUTS) this.buildArea(layout)
    this.buildClouds()
  }

  // ------------------------------------------------------------ חצר הכניסה

  private buildCourtyard(): void {
    this.addGround(COURTYARD.zStart, COURTYARD.zEnd, HALF_WIDTH, 0xc7e8b0)

    const facade = castleFacade(this.res)
    facade.position.set(0, 0, COURTYARD.zStart + 1.5)
    facade.rotation.y = Math.PI
    this.root.add(facade)

    // חומה מאחור, כדי שלא אפשר יהיה לצאת מהעולם
    this.addWall(-HALF_WIDTH - 1, HALF_WIDTH + 1, COURTYARD.zStart, COURTYARD.zStart + WALL_THICK, 0xf3d9ea)

    this.addSideWalls(COURTYARD.zStart, COURTYARD.zEnd, 0xf3d9ea)

    // מגדלים בפינות
    this.root.add(placeAt(tower(this.res, 0xf7e3f0, 0xf487c0, 8, 1.8), -HALF_WIDTH + 2, 0, COURTYARD.zEnd + 3))
    this.root.add(placeAt(tower(this.res, 0xf7e3f0, 0x59c9e8, 8, 1.8), HALF_WIDTH - 2, 0, COURTYARD.zEnd + 3))

    // שביל אבן שמוביל קדימה, רמז ויזואלי לאן ללכת
    const pathMat = this.res.mat(0xf1e6d0)
    const pathGeo = this.res.track(new THREE.BoxGeometry(3.4, 0.08, 2.4))
    for (let z = COURTYARD.zStart - 3; z > COURTYARD.zEnd; z -= 3.2) {
      const stone = new THREE.Mesh(pathGeo, pathMat)
      stone.position.set(0, 0.05, z)
      this.root.add(stone)
    }

    // שלט ברוכה הבאה
    const sign = propPost(this.res, '🏰', 0xb98a6b, 2.2, 2.6)
    sign.position.set(-5.5, 0, COURTYARD.zStart - 6)
    this.root.add(sign)
    const heart = propPost(this.res, '💖', 0xb98a6b, 2.0, 2.2)
    heart.position.set(5.5, 0, COURTYARD.zStart - 6)
    this.root.add(heart)
  }

  // ------------------------------------------------------------ אזור

  private buildArea(layout: AreaLayout): void {
    const area = getArea(layout.id)
    this.addGround(layout.zStart, layout.zEnd, layout.halfWidth, layout.ground)
    this.addSideWalls(layout.zStart, layout.zEnd, layout.wallColor)

    // שער כניסה מעוצב בקצה הקרוב של האזור
    const entryArch = archway(this.res, layout.accent, BRIDGE_HALF * 2 + 1, 5.5)
    entryArch.position.set(0, 0, layout.zStart - 0.5)
    this.root.add(entryArch)

    // שלט האזור
    const sign = propPost(this.res, area.emoji, layout.accent, 2.4, 2.8)
    sign.position.set(-BRIDGE_HALF - 2.5, 0, layout.zStart - 2)
    this.root.add(sign)

    this.decorate(layout)
    this.buildGuide(layout)
    if (layout.gate) this.buildGate(layout)
  }

  private decorate(layout: AreaLayout): void {
    const props = THEME_PROPS[layout.theme]
    const zMid = (layout.zStart + layout.zEnd) / 2

    // עצים לאורך הקירות, נותנים עומק בלי להעמיס את המרכז
    const leaf = layout.theme === 'library' ? 0x7c68a8 : layout.theme === 'kitchen' ? 0x7fae4a : 0x4aa85e
    for (let i = 0; i < 6; i++) {
      const z = layout.zStart - 3 - i * 3.8
      if (z < layout.zEnd + 2) break
      this.root.add(placeAt(tree(this.res, leaf), -layout.halfWidth + 3, 0, z))
      this.root.add(placeAt(tree(this.res, leaf), layout.halfWidth - 3, 0, z))
    }

    // עמודי נושא משני צידי השביל
    props.forEach((emoji, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const z = layout.zStart - 5 - Math.floor(i / 2) * 5
      if (z < layout.zEnd + 3) return
      const post = propPost(this.res, emoji, layout.accent, 1.5 + (i % 3) * 0.25, 2.1)
      post.position.set(side * (6 + (i % 2) * 1.5), 0, z)
      this.root.add(post)
    })

    // פרחים צבעוניים בגן הצבעים, שמדגישים את הנושא
    if (layout.theme === 'garden') {
      const colors = [0xe8443a, 0x2f7fe0, 0x3fae5a, 0xf3c623, 0xf487c0, 0x9b5de5, 0xf4913a]
      colors.forEach((c, i) => {
        const patch = flowerPatch(this.res, c)
        patch.position.set(i % 2 === 0 ? -11 : 11, 0, layout.zStart - 4 - i * 2.6)
        this.root.add(patch)
      })
    }

    // מגדל גבוה במרכז מגדל המספרים
    if (layout.theme === 'numbers') {
      this.root.add(placeAt(tower(this.res, 0xdfeeff, layout.accent, 13, 3), -10, 0, zMid))
      this.root.add(placeAt(tower(this.res, 0xdfeeff, layout.accent, 10, 2.4), 10, 0, zMid + 4))
    }

    // אגף הבית: בתים קטנים לאורך הדרך, כדי שיהיה ברור שזו שכונה
    if (layout.theme === 'home') {
      for (let i = 0; i < 3; i++) {
        const z = layout.zStart - 6 - i * 6
        if (z < layout.zEnd + 4) break
        for (const side of [-1, 1]) {
          const walls = new THREE.Mesh(this.res.track(new THREE.BoxGeometry(4, 3, 4)), this.res.mat(0xfff1e0))
          walls.position.set(side * (layout.halfWidth - 5), 1.5, z)
          const roof = new THREE.Mesh(this.res.track(new THREE.ConeGeometry(3.4, 2.2, 4)), this.res.mat(layout.accent))
          roof.position.set(side * (layout.halfWidth - 5), 4.1, z)
          roof.rotation.y = Math.PI / 4
          this.root.add(walls, roof)
        }
      }
    }

    // כיתת הקסם: שולחנות בשורות, כמו כיתה אמיתית
    if (layout.theme === 'classroom') {
      const deskGeo = this.res.track(new THREE.BoxGeometry(2.4, 0.25, 1.2))
      const legGeo = this.res.track(new THREE.BoxGeometry(0.18, 0.8, 0.18))
      const woodMat = this.res.mat(0xc89b6a)
      for (let row = 0; row < 3; row++) {
        const z = layout.zStart - 7 - row * 4.5
        if (z < layout.zEnd + 5) break
        for (const side of [-1, 1]) {
          const x = side * 7
          const top = new THREE.Mesh(deskGeo, woodMat)
          top.position.set(x, 0.9, z)
          this.root.add(top)
          for (const [lx, lz] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) {
            const leg = new THREE.Mesh(legGeo, woodMat)
            leg.position.set(x + lx, 0.4, z + lz)
            this.root.add(leg)
          }
        }
      }
    }

    // מדפי ספרים בספרייה
    if (layout.theme === 'library') {
      const shelfGeo = this.res.track(new THREE.BoxGeometry(4, 3.2, 0.8))
      const shelfMat = this.res.mat(0x8a5a3b)
      for (let i = 0; i < 4; i++) {
        const z = layout.zStart - 6 - i * 4.5
        if (z < layout.zEnd + 3) break
        const l = new THREE.Mesh(shelfGeo, shelfMat)
        l.position.set(-layout.halfWidth + 2.2, 1.6, z)
        const r = new THREE.Mesh(shelfGeo, shelfMat)
        r.position.set(layout.halfWidth - 2.2, 1.6, z)
        this.root.add(l, r)
      }
    }
  }

  // ------------------------------------------------------------ דמות מנחה

  private buildGuide(layout: AreaLayout): void {
    const area = getArea(layout.id)
    const g = new THREE.Group()

    // גוף רך וידידותי, בלי שום קווים מאיימים
    const body = new THREE.Mesh(this.res.track(new THREE.ConeGeometry(0.9, 1.8, 14)), this.res.mat(layout.accent))
    body.position.y = 0.9
    g.add(body)
    const belly = new THREE.Mesh(this.res.track(new THREE.SphereGeometry(0.62, 14, 10)), this.res.mat(0xfff6fb))
    belly.position.set(0, 0.75, 0.5)
    belly.scale.set(1, 1.1, 0.5)
    g.add(belly)

    const face = emojiSprite(area.guide.emoji, 1.9)
    face.position.y = 2.5
    g.add(face)

    // טבעת אור מתחת לדמות, מסמנת שאפשר לגשת אליה
    const ring = new THREE.Mesh(
      this.res.track(new THREE.RingGeometry(1.5, 2.1, 24)),
      this.res.track(new THREE.MeshBasicMaterial({ color: layout.accent, transparent: true, opacity: 0.45, side: THREE.DoubleSide })),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.06
    g.add(ring)

    const marker = emojiSprite('❗', 1.3)
    marker.position.y = 4
    g.add(marker)

    g.position.set(layout.guide.x, 0, layout.guide.z)
    this.root.add(g)

    // הדמות עצמה חוסמת מעבר דרכה, אז אפשר להיתקל בה ולא לעבור דרכה
    this.collision.add({
      minX: layout.guide.x - 1,
      maxX: layout.guide.x + 1,
      minZ: layout.guide.z - 1,
      maxZ: layout.guide.z + 1,
    })

    this.guides.push({ areaId: layout.id, group: g, marker, x: layout.guide.x, z: layout.guide.z })
  }

  // ------------------------------------------------------------ גשר ושער

  private buildGate(layout: AreaLayout): void {
    const gate = layout.gate
    if (!gate) return
    const nextLayout = AREA_LAYOUTS[layout.index + 1]
    if (!nextLayout) return

    // רצפת הגשר, צרה יותר מהאזור, עם מעקות בשני הצדדים
    this.addGround(gate.zStart, gate.zEnd, BRIDGE_HALF, 0xd9c9a8)
    const railGeo = this.res.track(new THREE.BoxGeometry(0.4, 1.1, Math.abs(gate.zStart - gate.zEnd)))
    const railMat = this.res.mat(0xb98a6b)
    const railL = new THREE.Mesh(railGeo, railMat)
    railL.position.set(-BRIDGE_HALF + 0.2, 0.75, (gate.zStart + gate.zEnd) / 2)
    const railR = new THREE.Mesh(railGeo, railMat)
    railR.position.set(BRIDGE_HALF - 0.2, 0.75, (gate.zStart + gate.zEnd) / 2)
    this.root.add(railL, railR)

    // קירות שמונעים לעקוף את השער מהצדדים
    this.addWall(-HALF_WIDTH - 1, -BRIDGE_HALF, gate.zEnd, gate.zStart, layout.wallColor)
    this.addWall(BRIDGE_HALF, HALF_WIDTH + 1, gate.zEnd, gate.zStart, layout.wallColor)

    const group = new THREE.Group()
    group.position.set(0, 0, gate.z)

    const arch = archway(this.res, layout.accent, BRIDGE_HALF * 2 + 1, 6)
    group.add(arch)

    const doorMat = this.res.mat(0x9c6b45)
    const doorGeo = this.res.track(new THREE.BoxGeometry(BRIDGE_HALF, 5, 0.4))

    const doorL = new THREE.Group()
    const meshL = new THREE.Mesh(doorGeo, doorMat)
    meshL.position.set(BRIDGE_HALF / 2, 2.5, 0)
    doorL.add(meshL)
    doorL.position.set(-BRIDGE_HALF, 0, 0)

    const doorR = new THREE.Group()
    const meshR = new THREE.Mesh(doorGeo, doorMat)
    meshR.position.set(-BRIDGE_HALF / 2, 2.5, 0)
    doorR.add(meshR)
    doorR.position.set(BRIDGE_HALF, 0, 0)

    group.add(doorL, doorR)

    const lock = emojiSprite('🔒', 1.6)
    lock.position.set(0, 3.2, 0.6)
    group.add(lock)

    this.root.add(group)

    const alreadyOpen = areaProgress(nextLayout.id).unlocked
    const gateObj: Gate = {
      fromAreaId: layout.id,
      toAreaId: nextLayout.id,
      group,
      doorL,
      doorR,
      lock,
      z: gate.z,
      open: alreadyOpen,
      anim: alreadyOpen ? 1 : 0,
    }
    this.gates.push(gateObj)

    if (alreadyOpen) {
      this.applyGateAnim(gateObj)
    } else {
      this.collision.add({
        minX: -BRIDGE_HALF,
        maxX: BRIDGE_HALF,
        minZ: gate.z - 0.6,
        maxZ: gate.z + 0.6,
        id: gateKey(layout.id),
      })
    }
  }

  // ------------------------------------------------------------ עזרי בנייה

  private addGround(zStart: number, zEnd: number, halfWidth: number, color: number): void {
    const length = Math.abs(zStart - zEnd)
    const mesh = new THREE.Mesh(this.res.track(new THREE.BoxGeometry(halfWidth * 2, 0.4, length)), this.res.mat(color))
    mesh.position.set(0, -0.2, (zStart + zEnd) / 2)
    this.root.add(mesh)
  }

  private addSideWalls(zStart: number, zEnd: number, color: number): void {
    this.addWall(-HALF_WIDTH - WALL_THICK, -HALF_WIDTH, zEnd, zStart, color)
    this.addWall(HALF_WIDTH, HALF_WIDTH + WALL_THICK, zEnd, zStart, color)
  }

  private addWall(minX: number, maxX: number, minZ: number, maxZ: number, color: number): void {
    const w = Math.abs(maxX - minX)
    const d = Math.abs(maxZ - minZ)
    if (w < 0.01 || d < 0.01) return
    const mesh = new THREE.Mesh(this.res.track(new THREE.BoxGeometry(w, WALL_HEIGHT, d)), this.res.mat(color))
    mesh.position.set((minX + maxX) / 2, WALL_HEIGHT / 2, (minZ + maxZ) / 2)
    this.root.add(mesh)

    // כתר משונן על החומה, נותן תחושת טירה
    const merlonGeo = this.res.track(new THREE.BoxGeometry(Math.min(w, 0.9), 0.7, Math.min(d, 0.9)))
    const merlonMat = this.res.mat(color)
    const along = d > w
    const count = Math.floor((along ? d : w) / 2.4)
    for (let i = 0; i <= count; i++) {
      const t = count === 0 ? 0.5 : i / count
      const m = new THREE.Mesh(merlonGeo, merlonMat)
      m.position.set(
        along ? (minX + maxX) / 2 : minX + t * w,
        WALL_HEIGHT + 0.35,
        along ? minZ + t * d : (minZ + maxZ) / 2,
      )
      this.root.add(m)
    }

    this.collision.add({ minX, maxX, minZ, maxZ })
  }

  private buildClouds(): void {
    for (let i = 0; i < 14; i++) {
      const c = cloud(this.res)
      c.position.set(-40 + Math.random() * 80, 16 + Math.random() * 8, 20 - Math.random() * 190)
      c.scale.setScalar(1 + Math.random() * 1.2)
      this.clouds.push(c)
      this.root.add(c)
    }
  }

  // ------------------------------------------------------------ זמן ריצה

  /** פותח את השער שיוצא מהאזור הנתון. */
  openGateFrom(areaId: string): Gate | undefined {
    const gate = this.gates.find((g) => g.fromAreaId === areaId)
    if (!gate || gate.open) return undefined
    gate.open = true
    this.collision.remove(gateKey(areaId))
    return gate
  }

  isGateOpen(areaId: string): boolean {
    return this.gates.find((g) => g.fromAreaId === areaId)?.open ?? true
  }

  /** מסמן איזו דמות מנחה עדיין מחכה למשימות. */
  setGuideActive(areaId: string, active: boolean): void {
    const guide = this.guides.find((g) => g.areaId === areaId)
    if (guide) guide.marker.visible = active
  }

  private applyGateAnim(gate: Gate): void {
    const a = gate.anim * (Math.PI / 2) * 0.95
    gate.doorL.rotation.y = -a
    gate.doorR.rotation.y = a
    gate.lock.visible = gate.anim < 0.15
    gate.lock.position.y = 3.2 + gate.anim * 2
  }

  update(dt: number): void {
    this.time += dt

    for (const gate of this.gates) {
      const target = gate.open ? 1 : 0
      if (Math.abs(gate.anim - target) > 0.001) {
        gate.anim += (target - gate.anim) * Math.min(1, dt * 2.2)
        this.applyGateAnim(gate)
      }
    }

    for (const guide of this.guides) {
      guide.group.position.y = Math.sin(this.time * 1.6 + guide.z) * 0.12
      guide.marker.position.y = 4 + Math.sin(this.time * 3.4) * 0.2
    }

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i]
      c.position.x += dt * (0.35 + (i % 3) * 0.15)
      if (c.position.x > 46) c.position.x = -46
    }
  }

  dispose(): void {
    this.res.dispose()
    this.root.clear()
    this.collision.clear()
  }
}

export function gateKey(areaId: string): string {
  return `gate:${areaId}`
}

/** רשימת האזורים לפי סדר, לשימוש במסכי UI. */
export const AREA_ORDER = AREAS.map((a) => a.id)
