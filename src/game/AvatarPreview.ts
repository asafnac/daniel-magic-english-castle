/**
 * תצוגה מקדימה מסתובבת של הדמות, למסך עיצוב הדמות.
 * סצנה קטנה ונפרדת, כדי שהעולם הגדול לא ייטען סתם.
 */

import * as THREE from 'three'
import { buildAvatar, type AvatarRig } from './Avatar'
import type { AvatarConfig } from '../app/avatarConfig'

export class AvatarPreview {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40)
  private rig: AvatarRig
  private clock = new THREE.Clock()
  private raf = 0
  private host: HTMLElement

  constructor(host: HTMLElement, config: AvatarConfig) {
    this.host = host
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    host.appendChild(this.renderer.domElement)
    this.renderer.domElement.classList.add('avatar-preview-canvas')

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c8f0, 1.15))
    const key = new THREE.DirectionalLight(0xfff4de, 0.8)
    key.position.set(3, 6, 5)
    this.scene.add(key)

    // במה עגולה קטנה מתחת לדמות
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.14, 24),
      new THREE.MeshLambertMaterial({ color: 0xf0e2ff }),
    )
    disc.position.y = -0.07
    this.scene.add(disc)

    this.rig = buildAvatar(config)
    this.scene.add(this.rig.root)

    this.camera.position.set(0, 1.35, 3.6)
    this.camera.lookAt(0, 0.85, 0)

    this.resize()
    window.addEventListener('resize', this.resize)
    this.loop()
  }

  update(config: AvatarConfig): void {
    this.scene.remove(this.rig.root)
    this.rig.dispose()
    this.rig = buildAvatar(config)
    this.scene.add(this.rig.root)
  }

  cheer(): void {
    this.rig.cheer()
  }

  private resize = (): void => {
    const w = this.host.clientWidth || 260
    const h = this.host.clientHeight || 300
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(1, h)
    this.camera.updateProjectionMatrix()
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.rig.root.rotation.y += dt * 0.7
    this.rig.update(dt, false)
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    this.rig.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.scene.clear()
  }
}
