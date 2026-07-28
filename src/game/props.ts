/**
 * אבני הבניין הוויזואליות של העולם.
 *
 * הכל נבנה מפרימיטיבים, ואימוג'ים מצוירים על קנבס והופכים ל-Sprite.
 * כך אין אף קובץ חיצוני, אין זכויות יוצרים, והטעינה מיידית.
 */

import * as THREE from 'three'

/** אוסף משאבים לשחרור מסודר בסוף. */
export class Res {
  private items: { dispose: () => void }[] = []

  track<T extends { dispose: () => void }>(x: T): T {
    this.items.push(x)
    return x
  }

  mat(color: THREE.ColorRepresentation, emissive: THREE.ColorRepresentation = 0x000000): THREE.MeshLambertMaterial {
    return this.track(new THREE.MeshLambertMaterial({ color, emissive }))
  }

  dispose(): void {
    for (const i of this.items) i.dispose()
    this.items = []
  }
}

const spriteCache = new Map<string, THREE.SpriteMaterial>()

/**
 * הופך אימוג'י ל-Sprite. הציור נעשה פעם אחת לכל אימוג'י ונשמר במטמון,
 * כך שאפשר לפזר עשרות אימוג'ים בעולם בלי לפגוע בביצועים.
 */
export function emojiSprite(emoji: string, scale = 2): THREE.Sprite {
  let material = spriteCache.get(emoji)
  if (!material) {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, size, size)
      ctx.font = `${Math.floor(size * 0.78)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, size / 2, size / 2 + 4)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    spriteCache.set(emoji, material)
  }
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(scale, scale, scale)
  return sprite
}

/** משחרר את מטמון האימוג'ים. נקרא רק בפירוק מלא של המשחק. */
export function disposeSpriteCache(): void {
  for (const m of spriteCache.values()) {
    m.map?.dispose()
    m.dispose()
  }
  spriteCache.clear()
}

// ------------------------------------------------------------------ מבנים

export function tower(res: Res, wallColor: number, roofColor: number, height = 9, radius = 2.2): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(res.track(new THREE.CylinderGeometry(radius, radius * 1.08, height, 14)), res.mat(wallColor))
  body.position.y = height / 2
  g.add(body)

  const roof = new THREE.Mesh(res.track(new THREE.ConeGeometry(radius * 1.35, height * 0.45, 14)), res.mat(roofColor))
  roof.position.y = height + height * 0.22
  g.add(roof)

  const flag = new THREE.Mesh(res.track(new THREE.BoxGeometry(1.1, 0.6, 0.06)), res.mat(0xf3c623, 0x352c00))
  flag.position.set(0.6, height + height * 0.5, 0)
  g.add(flag)

  const pole = new THREE.Mesh(res.track(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6)), res.mat(0xf7f2ff))
  pole.position.y = height + height * 0.48
  g.add(pole)

  // חלונות קטנים, נותנים קנה מידה למגדל
  const winMat = res.mat(0x5a4a7a, 0x1a1230)
  const winGeo = res.track(new THREE.BoxGeometry(0.7, 1.1, 0.2))
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const w = new THREE.Mesh(winGeo, winMat)
    w.position.set(Math.cos(a) * radius, height * 0.6, Math.sin(a) * radius)
    w.lookAt(Math.cos(a) * radius * 3, height * 0.6, Math.sin(a) * radius * 3)
    g.add(w)
  }
  return g
}

export function tree(res: Res, leafColor = 0x4aa85e): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(res.track(new THREE.CylinderGeometry(0.22, 0.3, 1.8, 8)), res.mat(0x8a5a3b))
  trunk.position.y = 0.9
  g.add(trunk)
  const leafGeo = res.track(new THREE.SphereGeometry(1.1, 10, 8))
  const leafMat = res.mat(leafColor)
  for (const [x, y, z, s] of [
    [0, 2.3, 0, 1],
    [0.7, 1.9, 0.3, 0.7],
    [-0.6, 2.0, -0.3, 0.75],
  ]) {
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.set(x, y, z)
    leaf.scale.setScalar(s)
    g.add(leaf)
  }
  return g
}

export function flowerPatch(res: Res, color: number): THREE.Group {
  const g = new THREE.Group()
  const stemGeo = res.track(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5))
  const stemMat = res.mat(0x4aa85e)
  const petalGeo = res.track(new THREE.SphereGeometry(0.22, 8, 6))
  const petalMat = res.mat(color, new THREE.Color(color).multiplyScalar(0.15).getHex())
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const x = Math.cos(a) * 0.5
    const z = Math.sin(a) * 0.5
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.set(x, 0.35, z)
    g.add(stem)
    const petal = new THREE.Mesh(petalGeo, petalMat)
    petal.position.set(x, 0.78, z)
    petal.scale.set(1, 0.7, 1)
    g.add(petal)
  }
  return g
}

/** עמוד עם אימוג'י מרחף. הדרך הפשוטה והברורה ביותר לקשט אזור נושאי. */
export function propPost(res: Res, emoji: string, postColor: number, height = 1.6, spriteScale = 2.2): THREE.Group {
  const g = new THREE.Group()
  const post = new THREE.Mesh(res.track(new THREE.CylinderGeometry(0.12, 0.16, height, 8)), res.mat(postColor))
  post.position.y = height / 2
  g.add(post)
  const base = new THREE.Mesh(res.track(new THREE.CylinderGeometry(0.42, 0.5, 0.22, 10)), res.mat(postColor))
  base.position.y = 0.11
  g.add(base)
  const sprite = emojiSprite(emoji, spriteScale)
  sprite.position.y = height + spriteScale * 0.45
  g.add(sprite)
  return g
}

export function archway(res: Res, color: number, width = 5, height = 5): THREE.Group {
  const g = new THREE.Group()
  const pillarGeo = res.track(new THREE.CylinderGeometry(0.45, 0.55, height, 10))
  const m = res.mat(color)
  const left = new THREE.Mesh(pillarGeo, m)
  const right = new THREE.Mesh(pillarGeo, m)
  left.position.set(-width / 2, height / 2, 0)
  right.position.set(width / 2, height / 2, 0)
  g.add(left, right)

  const arch = new THREE.Mesh(res.track(new THREE.TorusGeometry(width / 2, 0.45, 8, 20, Math.PI)), m)
  arch.position.y = height
  g.add(arch)
  return g
}

/** חזית הטירה ברקע חצר הכניסה. */
export function castleFacade(res: Res): THREE.Group {
  const g = new THREE.Group()
  const wall = new THREE.Mesh(res.track(new THREE.BoxGeometry(26, 12, 3)), res.mat(0xf3d9ea))
  wall.position.y = 6
  g.add(wall)

  const bandGeo = res.track(new THREE.BoxGeometry(1.4, 1.4, 3.4))
  const bandMat = res.mat(0xe6bcd6)
  for (let i = -8; i <= 8; i += 3.2) {
    const b = new THREE.Mesh(bandGeo, bandMat)
    b.position.set(i, 12.6, 0)
    g.add(b)
  }

  const door = new THREE.Mesh(res.track(new THREE.BoxGeometry(4.2, 6, 0.5)), res.mat(0x9c6b45))
  door.position.set(0, 3, 1.6)
  g.add(door)
  const doorTop = new THREE.Mesh(res.track(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 14, 1, false, 0, Math.PI)), res.mat(0x9c6b45))
  doorTop.position.set(0, 6, 1.6)
  doorTop.rotation.z = -Math.PI / 2
  doorTop.rotation.y = Math.PI / 2
  g.add(doorTop)

  g.add(placeAt(tower(res, 0xf3d9ea, 0x9b5de5, 14, 2.6), -13, 0, 0))
  g.add(placeAt(tower(res, 0xf3d9ea, 0x9b5de5, 14, 2.6), 13, 0, 0))
  return g
}

export function placeAt<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z)
  return obj
}

/** ענן רך שצף מעל העולם. */
export function cloud(res: Res): THREE.Group {
  const g = new THREE.Group()
  const geo = res.track(new THREE.SphereGeometry(1.6, 8, 6))
  const m = res.mat(0xffffff, 0x1a1a22)
  for (const [x, y, z, s] of [
    [0, 0, 0, 1],
    [1.6, -0.2, 0.2, 0.8],
    [-1.5, -0.25, -0.1, 0.75],
    [0.6, 0.5, -0.3, 0.65],
  ]) {
    const part = new THREE.Mesh(geo, m)
    part.position.set(x, y, z)
    part.scale.setScalar(s)
    g.add(part)
  }
  return g
}
