/**
 * פריסת העולם. מספרים בלבד.
 *
 * העולם בנוי כשדרה אחת ארוכה: חצר הכניסה, ואחריה חמישה אזורים
 * שמחוברים בגשרים קצרים. בכל גשר עומד שער. הפריסה הליניארית
 * נבחרה בכוונה: קל להתמצא בה, אי אפשר ללכת לאיבוד,
 * וההתקדמות בטירה מרגישה כמו התקדמות בלמידה.
 */

import { AREAS } from '../learning/areas'

export const HALF_WIDTH = 16
export const BRIDGE_HALF = 4
export const AREA_LENGTH = 26
export const BRIDGE_LENGTH = 6
export const COURTYARD_LENGTH = 22

export interface Zone {
  /** הקצה הקרוב, ערך z גדול יותר. */
  zStart: number
  /** הקצה הרחוק, ערך z קטן יותר. */
  zEnd: number
  halfWidth: number
}

export interface AreaLayout extends Zone {
  id: string
  index: number
  ground: number
  wallColor: number
  accent: number
  theme: 'garden' | 'animals' | 'kitchen' | 'numbers' | 'library'
  guide: { x: number; z: number }
  /** הגשר והשער שמובילים לאזור הבא. חסר באזור האחרון. */
  gate?: { zStart: number; zEnd: number; z: number }
}

const THEMES: AreaLayout['theme'][] = ['garden', 'animals', 'kitchen', 'numbers', 'library']

const PALETTES: { ground: number; wall: number; accent: number }[] = [
  { ground: 0x8fd98f, wall: 0xf7c3dd, accent: 0xf487c0 }, // גן הצבעים
  { ground: 0xa8d879, wall: 0xbfe6d5, accent: 0x4fc3a1 }, // חצר החיות
  { ground: 0xf0d2a8, wall: 0xffd9b0, accent: 0xf4913a }, // מטבח הקסם
  { ground: 0xb9dcf5, wall: 0xc9e2fb, accent: 0x5aa9f0 }, // מגדל המספרים
  { ground: 0xd8c9f2, wall: 0xe3d7fb, accent: 0x9b5de5 }, // ספריית האותיות
]

export const COURTYARD: Zone = {
  zStart: COURTYARD_LENGTH,
  zEnd: 0,
  halfWidth: HALF_WIDTH,
}

export const AREA_LAYOUTS: AreaLayout[] = AREAS.map((area, i) => {
  const zStart = -i * (AREA_LENGTH + BRIDGE_LENGTH)
  const zEnd = zStart - AREA_LENGTH
  const palette = PALETTES[i % PALETTES.length]
  const isLast = i === AREAS.length - 1
  return {
    id: area.id,
    index: i,
    zStart,
    zEnd,
    halfWidth: HALF_WIDTH,
    ground: palette.ground,
    wallColor: palette.wall,
    accent: palette.accent,
    theme: THEMES[i % THEMES.length],
    guide: { x: 0, z: zEnd + 7 },
    gate: isLast ? undefined : { zStart: zEnd, zEnd: zEnd - BRIDGE_LENGTH, z: zEnd - BRIDGE_LENGTH / 2 },
  }
})

export const WORLD_Z_END = AREA_LAYOUTS[AREA_LAYOUTS.length - 1].zEnd

/** נקודת ההתחלה של המשחק, בחצר הכניסה. */
export const SPAWN = { x: 0, z: COURTYARD.zStart - 6 }

/** נקודת כניסה לאזור, קצת אחרי השער שמובילים אליו. */
export function areaEntry(areaId: string): { x: number; z: number } {
  const a = AREA_LAYOUTS.find((l) => l.id === areaId)
  if (!a) return SPAWN
  return { x: 0, z: a.zStart - 4 }
}

export function layoutFor(areaId: string): AreaLayout | undefined {
  return AREA_LAYOUTS.find((l) => l.id === areaId)
}

/** באיזה אזור נמצאת נקודה. undefined אם היא בחצר או על גשר. */
export function areaAt(z: number): AreaLayout | undefined {
  return AREA_LAYOUTS.find((l) => z <= l.zStart && z >= l.zEnd)
}
