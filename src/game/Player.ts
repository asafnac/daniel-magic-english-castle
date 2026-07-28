/**
 * השחקנית: מיקום, תנועה מול מכשולים, וסיבוב לכיוון ההליכה.
 */

import * as THREE from 'three'
import { buildAvatar, type AvatarRig } from './Avatar'
import type { Collision } from './Collision'
import type { AvatarConfig } from '../app/avatarConfig'

const SPEED = 7.2
const RADIUS = 0.55
const TURN_SPEED = 12

export class Player {
  readonly group = new THREE.Group()
  private rig: AvatarRig
  private facing = Math.PI
  private moving = false

  constructor(config: AvatarConfig) {
    this.rig = buildAvatar(config)
    this.group.add(this.rig.root)
    this.group.rotation.y = this.facing
  }

  get position(): THREE.Vector3 {
    return this.group.position
  }

  get isMoving(): boolean {
    return this.moving
  }

  setPosition(x: number, z: number): void {
    this.group.position.set(x, 0, z)
  }

  /** מחליף מראה בלי לאבד את המיקום בעולם. */
  setAvatar(config: AvatarConfig): void {
    this.group.remove(this.rig.root)
    this.rig.dispose()
    this.rig = buildAvatar(config)
    this.group.add(this.rig.root)
  }

  cheer(): void {
    this.rig.cheer()
  }

  update(dt: number, dir: { x: number; z: number }, collision: Collision): void {
    this.moving = dir.x !== 0 || dir.z !== 0

    if (this.moving) {
      const dx = dir.x * SPEED * dt
      const dz = dir.z * SPEED * dt
      const next = collision.move(this.group.position.x, this.group.position.z, dx, dz, RADIUS)
      this.group.position.x = next.x
      this.group.position.z = next.z
      this.facing = Math.atan2(dir.x, dir.z)
    }

    // סיבוב חלק לכיוון ההליכה
    let delta = this.facing - this.group.rotation.y
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    this.group.rotation.y += delta * Math.min(1, dt * TURN_SPEED)

    this.rig.update(dt, this.moving)
  }

  dispose(): void {
    this.rig.dispose()
  }
}
