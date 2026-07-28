/**
 * אפקטים קטנים: כוכבים שעפים, ניצוצות, ואור קסום סביב הצלחה.
 * הכל ב-Sprite של אימוג'י, בלי חלקיקים כבדים ובלי טקסטורות חיצוניות.
 */

import * as THREE from 'three'
import { emojiSprite } from './props'

interface Particle {
  sprite: THREE.Sprite
  vx: number
  vy: number
  vz: number
  life: number
  maxLife: number
  spin: number
}

const CELEBRATION = ['⭐', '✨', '🌟', '💖', '💎']

export class Effects {
  private particles: Particle[] = []

  constructor(private readonly scene: THREE.Object3D) {}

  /** פרץ כוכבים סביב נקודה. משמש אחרי תשובה נכונה. */
  burst(at: THREE.Vector3, count = 14): void {
    for (let i = 0; i < count; i++) {
      const emoji = CELEBRATION[Math.floor(Math.random() * CELEBRATION.length)]
      const sprite = emojiSprite(emoji, 0.9 + Math.random() * 0.6)
      sprite.position.copy(at)
      sprite.position.y += 1.2
      const angle = Math.random() * Math.PI * 2
      const speed = 2.5 + Math.random() * 3
      this.scene.add(sprite)
      this.particles.push({
        sprite,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 3.5,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 1.3 + Math.random() * 0.5,
        spin: (Math.random() - 0.5) * 6,
      })
    }
  }

  /** ניצוץ עדין ליד השחקנית, למשל כשיהלום יורד. */
  sparkle(at: THREE.Vector3, emoji = '💎'): void {
    const sprite = emojiSprite(emoji, 1.1)
    sprite.position.copy(at)
    sprite.position.y += 2
    this.scene.add(sprite)
    this.particles.push({ sprite, vx: 0, vy: 1.4, vz: 0, life: 0, maxLife: 0.9, spin: 0 })
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt
      if (p.life >= p.maxLife) {
        this.scene.remove(p.sprite)
        this.particles.splice(i, 1)
        continue
      }
      p.vy -= 9 * dt
      p.sprite.position.x += p.vx * dt
      p.sprite.position.y += p.vy * dt
      p.sprite.position.z += p.vz * dt
      p.sprite.material.rotation += p.spin * dt
      const t = p.life / p.maxLife
      p.sprite.material.opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
    }
  }

  clear(): void {
    for (const p of this.particles) this.scene.remove(p.sprite)
    this.particles = []
  }
}
