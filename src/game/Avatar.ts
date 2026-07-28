/**
 * בניית הדמות מפרימיטיבים של Three.js.
 *
 * אין כאן שום מודל חיצוני ושום טקסטורה. כל חלק הוא כדור, גליל,
 * חרוט או תיבה, ולכן כל שינוי בעיצוב הוא מיידי ואמיתי,
 * וגם הטעינה מהירה מאוד.
 */

import * as THREE from 'three'
import type { AvatarConfig } from '../app/avatarConfig'

export interface AvatarRig {
  root: THREE.Group
  /** מעדכן אנימציית הליכה או עמידה. */
  update: (dt: number, moving: boolean) => void
  /** קפיצת שמחה אחרי תשובה נכונה. */
  cheer: () => void
  dispose: () => void
}

function mat(color: THREE.ColorRepresentation, emissive = 0x000000): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, emissive })
}

export function buildAvatar(cfg: AvatarConfig): AvatarRig {
  const root = new THREE.Group()
  const disposables: { dispose: () => void }[] = []

  const track = <T extends THREE.BufferGeometry | THREE.Material>(x: T): T => {
    disposables.push(x)
    return x
  }

  const skinMat = track(mat(cfg.skin))
  const hairMat = track(mat(cfg.hairColor))
  const outfitMat = track(mat(cfg.outfitColor))
  const carryMat = track(mat(cfg.carryColor))
  const darkMat = track(mat(0x2b2b33))
  const goldMat = track(mat(0xf3c623, 0x3a2c00))
  const whiteMat = track(mat(0xfdfdff))

  // ---------------------------------------------------------------- רגליים
  const legGeo = track(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8))
  const legL = new THREE.Mesh(legGeo, skinMat)
  const legR = new THREE.Mesh(legGeo, skinMat)
  legL.position.set(-0.1, 0.3, 0)
  legR.position.set(0.1, 0.3, 0)
  root.add(legL, legR)

  // ---------------------------------------------------------------- נעליים
  const shoeMat = cfg.shoes === 'sneakers' ? whiteMat : cfg.shoes === 'boots' ? track(mat(0x6b4226)) : outfitMat
  const shoeGeo =
    cfg.shoes === 'boots'
      ? track(new THREE.CylinderGeometry(0.1, 0.11, 0.24, 10))
      : track(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2))
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat)
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat)
  const shoeY = cfg.shoes === 'boots' ? 0.12 : 0.06
  shoeL.position.set(-0.1, shoeY, 0.02)
  shoeR.position.set(0.1, shoeY, 0.02)
  root.add(shoeL, shoeR)

  // ---------------------------------------------------------------- גוף
  const bodyGroup = new THREE.Group()
  bodyGroup.position.y = 0.52
  root.add(bodyGroup)

  let bodyMesh: THREE.Mesh
  switch (cfg.outfit) {
    case 'dress':
      bodyMesh = new THREE.Mesh(track(new THREE.ConeGeometry(0.33, 0.62, 14)), outfitMat)
      bodyMesh.position.y = 0.18
      break
    case 'robe':
      bodyMesh = new THREE.Mesh(track(new THREE.ConeGeometry(0.29, 0.78, 12)), outfitMat)
      bodyMesh.position.y = 0.24
      break
    case 'overalls':
      bodyMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.24, 0.58, 12)), outfitMat)
      bodyMesh.position.y = 0.2
      break
    default: // tunic
      bodyMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.19, 0.27, 0.6, 12)), outfitMat)
      bodyMesh.position.y = 0.2
      break
  }
  bodyGroup.add(bodyMesh)

  // צווארון בהיר, שובר את הצורה ונותן פרופורציה נעימה
  const collar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 12)), whiteMat)
  collar.position.y = 0.5
  bodyGroup.add(collar)

  // ---------------------------------------------------------------- זרועות
  const armGeo = track(new THREE.CapsuleGeometry(0.055, 0.28, 4, 8))
  const armL = new THREE.Mesh(armGeo, skinMat)
  const armR = new THREE.Mesh(armGeo, skinMat)
  armL.position.set(-0.26, 0.34, 0)
  armR.position.set(0.26, 0.34, 0)
  armL.rotation.z = 0.22
  armR.rotation.z = -0.22
  bodyGroup.add(armL, armR)

  // ---------------------------------------------------------------- ראש
  const headGroup = new THREE.Group()
  headGroup.position.y = 1.12
  root.add(headGroup)

  const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.24, 18, 14)), skinMat)
  headGroup.add(head)

  // עיניים וחיוך, כדי שהדמות תרגיש ידידותית
  const eyeGeo = track(new THREE.SphereGeometry(0.032, 10, 8))
  const eyeL = new THREE.Mesh(eyeGeo, darkMat)
  const eyeR = new THREE.Mesh(eyeGeo, darkMat)
  eyeL.position.set(-0.085, 0.04, 0.215)
  eyeR.position.set(0.085, 0.04, 0.215)
  headGroup.add(eyeL, eyeR)

  const blushGeo = track(new THREE.SphereGeometry(0.045, 10, 8))
  const blushMat = track(mat(0xf59fb4))
  const blushL = new THREE.Mesh(blushGeo, blushMat)
  const blushR = new THREE.Mesh(blushGeo, blushMat)
  blushL.position.set(-0.145, -0.035, 0.185)
  blushR.position.set(0.145, -0.035, 0.185)
  blushL.scale.set(1, 0.6, 0.4)
  blushR.scale.set(1, 0.6, 0.4)
  headGroup.add(blushL, blushR)

  const smile = new THREE.Mesh(track(new THREE.TorusGeometry(0.06, 0.014, 6, 14, Math.PI)), darkMat)
  smile.position.set(0, -0.05, 0.215)
  smile.rotation.z = Math.PI
  headGroup.add(smile)

  // ---------------------------------------------------------------- שיער
  const hairCap = new THREE.Mesh(track(new THREE.SphereGeometry(0.253, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62)), hairMat)
  hairCap.position.y = 0.015
  headGroup.add(hairCap)

  switch (cfg.hairStyle) {
    case 'long': {
      const back = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.19, 0.36, 4, 12)), hairMat)
      back.position.set(0, -0.22, -0.09)
      back.scale.set(1, 1, 0.65)
      headGroup.add(back)
      break
    }
    case 'braids': {
      const braidGeo = track(new THREE.CapsuleGeometry(0.055, 0.3, 4, 8))
      const bl = new THREE.Mesh(braidGeo, hairMat)
      const br = new THREE.Mesh(braidGeo, hairMat)
      bl.position.set(-0.2, -0.16, -0.02)
      br.position.set(0.2, -0.16, -0.02)
      headGroup.add(bl, br)
      break
    }
    case 'bun': {
      const bun = new THREE.Mesh(track(new THREE.SphereGeometry(0.115, 12, 10)), hairMat)
      bun.position.set(0, 0.24, -0.07)
      headGroup.add(bun)
      break
    }
    case 'curly': {
      const curlGeo = track(new THREE.SphereGeometry(0.085, 10, 8))
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const c = new THREE.Mesh(curlGeo, hairMat)
        c.position.set(Math.cos(a) * 0.2, 0.06 + Math.sin(i) * 0.03, Math.sin(a) * 0.2)
        headGroup.add(c)
      }
      break
    }
    case 'short':
    default:
      break
  }

  // ---------------------------------------------------------------- אביזר ראש
  switch (cfg.headwear) {
    case 'crown': {
      const band = new THREE.Mesh(track(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 12)), goldMat)
      band.position.y = 0.25
      headGroup.add(band)
      const spikeGeo = track(new THREE.ConeGeometry(0.045, 0.11, 6))
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        const s = new THREE.Mesh(spikeGeo, goldMat)
        s.position.set(Math.cos(a) * 0.15, 0.33, Math.sin(a) * 0.15)
        headGroup.add(s)
      }
      break
    }
    case 'band': {
      const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.2, 0.028, 8, 20)), carryMat)
      band.position.y = 0.14
      band.rotation.x = Math.PI / 2
      headGroup.add(band)
      const bow = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 10, 8)), carryMat)
      bow.position.set(0.17, 0.18, 0.05)
      bow.scale.set(1.4, 0.8, 0.6)
      headGroup.add(bow)
      break
    }
    case 'hat': {
      const brim = new THREE.Mesh(track(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16)), carryMat)
      brim.position.y = 0.22
      headGroup.add(brim)
      const cone = new THREE.Mesh(track(new THREE.ConeGeometry(0.21, 0.46, 14)), carryMat)
      cone.position.y = 0.45
      headGroup.add(cone)
      const star = new THREE.Mesh(track(new THREE.SphereGeometry(0.05, 8, 6)), goldMat)
      star.position.y = 0.7
      headGroup.add(star)
      break
    }
    case 'none':
    default:
      break
  }

  // ---------------------------------------------------------------- תיק, גלימה, כנפיים
  switch (cfg.carry) {
    case 'cape': {
      const cape = new THREE.Mesh(track(new THREE.ConeGeometry(0.36, 0.72, 12, 1, true)), carryMat)
      cape.material = track(new THREE.MeshLambertMaterial({ color: cfg.carryColor, side: THREE.DoubleSide }))
      cape.position.set(0, 0.22, -0.13)
      cape.rotation.x = -0.12
      bodyGroup.add(cape)
      break
    }
    case 'bag': {
      const bag = new THREE.Mesh(track(new THREE.BoxGeometry(0.26, 0.28, 0.13)), carryMat)
      bag.position.set(0, 0.3, -0.24)
      bodyGroup.add(bag)
      const strap = new THREE.Mesh(track(new THREE.TorusGeometry(0.19, 0.022, 6, 16, Math.PI)), carryMat)
      strap.position.set(0, 0.42, -0.06)
      strap.rotation.y = Math.PI / 2
      bodyGroup.add(strap)
      break
    }
    case 'wings': {
      const wingGeo = track(new THREE.SphereGeometry(0.24, 12, 10))
      const wingMat = track(new THREE.MeshLambertMaterial({ color: cfg.carryColor, transparent: true, opacity: 0.7 }))
      const wl = new THREE.Mesh(wingGeo, wingMat)
      const wr = new THREE.Mesh(wingGeo, wingMat)
      wl.scale.set(0.7, 1.25, 0.12)
      wr.scale.set(0.7, 1.25, 0.12)
      wl.position.set(-0.2, 0.38, -0.2)
      wr.position.set(0.2, 0.38, -0.2)
      wl.rotation.z = 0.4
      wr.rotation.z = -0.4
      bodyGroup.add(wl, wr)
      break
    }
    case 'none':
    default:
      break
  }

  // ---------------------------------------------------------------- מבטא לפי סוג הדמות
  switch (cfg.kind) {
    case 'wizard': {
      const starChest = new THREE.Mesh(track(new THREE.ConeGeometry(0.07, 0.07, 5)), goldMat)
      starChest.position.set(0, 0.38, 0.24)
      starChest.rotation.x = Math.PI / 2
      bodyGroup.add(starChest)
      break
    }
    case 'knight': {
      const padGeo = track(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2))
      const padMat = track(mat(0xc9d3e0))
      const pl = new THREE.Mesh(padGeo, padMat)
      const pr = new THREE.Mesh(padGeo, padMat)
      pl.position.set(-0.24, 0.45, 0)
      pr.position.set(0.24, 0.45, 0)
      bodyGroup.add(pl, pr)
      break
    }
    case 'fairy': {
      const halo = new THREE.Mesh(track(new THREE.TorusGeometry(0.3, 0.014, 6, 24)), track(mat(0xffe9a8, 0x554400)))
      halo.position.y = 0.45
      halo.rotation.x = Math.PI / 2
      headGroup.add(halo)
      break
    }
    case 'princess':
    default: {
      const gem = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.05)), track(mat(0xff7fb0, 0x441122)))
      gem.position.set(0, 0.44, 0.17)
      bodyGroup.add(gem)
      break
    }
  }

  // ---------------------------------------------------------------- אנימציה
  let walkPhase = 0
  let cheerTime = 0

  const update = (dt: number, moving: boolean): void => {
    if (moving) {
      walkPhase += dt * 9
      const swing = Math.sin(walkPhase) * 0.5
      legL.rotation.x = swing
      legR.rotation.x = -swing
      shoeL.position.z = 0.02 + Math.sin(walkPhase) * 0.09
      shoeR.position.z = 0.02 - Math.sin(walkPhase) * 0.09
      armL.rotation.x = -swing * 0.8
      armR.rotation.x = swing * 0.8
      bodyGroup.position.y = 0.52 + Math.abs(Math.sin(walkPhase)) * 0.025
    } else {
      walkPhase += dt * 2
      legL.rotation.x *= 0.85
      legR.rotation.x *= 0.85
      armL.rotation.x *= 0.85
      armR.rotation.x *= 0.85
      shoeL.position.z += (0.02 - shoeL.position.z) * 0.2
      shoeR.position.z += (0.02 - shoeR.position.z) * 0.2
      // נשימה עדינה בעמידה
      bodyGroup.position.y = 0.52 + Math.sin(walkPhase) * 0.012
    }

    if (cheerTime > 0) {
      cheerTime = Math.max(0, cheerTime - dt)
      const t = 1 - cheerTime / 1.1
      root.position.y = Math.abs(Math.sin(t * Math.PI * 2.5)) * 0.32 * (1 - t)
      headGroup.rotation.z = Math.sin(t * Math.PI * 6) * 0.15 * (1 - t)
      armL.rotation.x = -2.2 * (1 - t)
      armR.rotation.x = -2.2 * (1 - t)
    } else {
      root.position.y = 0
      headGroup.rotation.z *= 0.85
    }

    headGroup.position.y = 1.12 + (bodyGroup.position.y - 0.52)
  }

  const cheer = (): void => {
    cheerTime = 1.1
  }

  const dispose = (): void => {
    for (const d of disposables) d.dispose()
    root.clear()
  }

  return { root, update, cheer, dispose }
}
