/**
 * התנגשות פשוטה ויציבה: רשימת מלבנים במישור XZ ורדיוס לשחקן.
 *
 * הבדיקה נעשית על כל ציר בנפרד, כדי שאפשר יהיה להחליק לאורך קיר
 * במקום להיתקע בו. זה חשוב במיוחד לילדה שמחזיקה שני חצים יחד.
 */

export interface Box {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** שערים נעולים אפשר לפתוח בזמן ריצה. */
  id?: string
}

export class Collision {
  private boxes: Box[] = []

  add(box: Box): void {
    this.boxes.push(normalize(box))
  }

  addMany(boxes: Box[]): void {
    for (const b of boxes) this.add(b)
  }

  /** מסיר מכשול לפי מזהה, למשל כששער נפתח. */
  remove(id: string): void {
    this.boxes = this.boxes.filter((b) => b.id !== id)
  }

  has(id: string): boolean {
    return this.boxes.some((b) => b.id === id)
  }

  clear(): void {
    this.boxes = []
  }

  private hits(x: number, z: number, r: number): boolean {
    for (const b of this.boxes) {
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true
    }
    return false
  }

  /**
   * מזיז נקודה תוך התחשבות במכשולים.
   * מנסה קודם את שני הצירים יחד, ואם נחסם מנסה כל ציר לחוד.
   */
  move(x: number, z: number, dx: number, dz: number, r: number): { x: number; z: number; blocked: boolean } {
    let nx = x
    let nz = z
    let blocked = false

    if (dx !== 0) {
      if (!this.hits(x + dx, z, r)) nx = x + dx
      else blocked = true
    }
    if (dz !== 0) {
      if (!this.hits(nx, z + dz, r)) nz = z + dz
      else if (!this.hits(x, z + dz, r)) {
        nx = x
        nz = z + dz
        blocked = true
      } else blocked = true
    }
    return { x: nx, z: nz, blocked }
  }

  /**
   * מרחק פנוי מנקודה לכיוון נתון, עד מרחק מרבי.
   * משמש כדי למשוך את המצלמה פנימה כשקיר חוסם אותה.
   */
  freeDistance(fromX: number, fromZ: number, dirX: number, dirZ: number, maxDist: number, r: number): number {
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      const d = (i / steps) * maxDist
      if (this.hits(fromX + dirX * d, fromZ + dirZ * d, r)) return ((i - 1) / steps) * maxDist
    }
    return maxDist
  }
}

function normalize(b: Box): Box {
  return {
    minX: Math.min(b.minX, b.maxX),
    maxX: Math.max(b.minX, b.maxX),
    minZ: Math.min(b.minZ, b.maxZ),
    maxZ: Math.max(b.minZ, b.maxZ),
    id: b.id,
  }
}
