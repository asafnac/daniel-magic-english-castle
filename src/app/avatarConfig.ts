/**
 * הגדרת הדמות. נתונים בלבד, ללא Three.js וללא DOM,
 * כדי שגם מסך העיצוב, גם השמירה וגם בניית המודל התלת-ממדי
 * יעבדו מול אותו מקור אמת.
 */

export type AvatarKind = 'princess' | 'wizard' | 'knight' | 'fairy'
export type HairStyle = 'long' | 'short' | 'braids' | 'bun' | 'curly'
export type Outfit = 'dress' | 'tunic' | 'robe' | 'overalls'
export type Shoes = 'boots' | 'flats' | 'sneakers'
export type Headwear = 'crown' | 'band' | 'hat' | 'none'
export type Carry = 'cape' | 'bag' | 'wings' | 'none'

export interface AvatarConfig {
  kind: AvatarKind
  skin: string
  hairStyle: HairStyle
  hairColor: string
  outfit: Outfit
  outfitColor: string
  shoes: Shoes
  headwear: Headwear
  carry: Carry
  carryColor: string
}

export interface ChoiceOption<T> {
  value: T
  label: string
  emoji?: string
}

export const KINDS: ChoiceOption<AvatarKind>[] = [
  { value: 'princess', label: 'נסיכה', emoji: '👸' },
  { value: 'wizard', label: 'קוסמת', emoji: '🧙' },
  { value: 'knight', label: 'אבירה', emoji: '🛡️' },
  { value: 'fairy', label: 'פיה', emoji: '🧚' },
]

export const SKIN_TONES: ChoiceOption<string>[] = [
  { value: '#f6d9c2', label: 'בהיר' },
  { value: '#eec2a0', label: 'שקד' },
  { value: '#d7a077', label: 'דבש' },
  { value: '#a9714b', label: 'קרמל' },
  { value: '#6f452d', label: 'שוקולד' },
]

export const HAIR_STYLES: ChoiceOption<HairStyle>[] = [
  { value: 'long', label: 'שיער ארוך', emoji: '💇' },
  { value: 'short', label: 'שיער קצר', emoji: '✂️' },
  { value: 'braids', label: 'צמות', emoji: '🎀' },
  { value: 'bun', label: 'קוקו גבוה', emoji: '🧅' },
  { value: 'curly', label: 'תלתלים', emoji: '🌀' },
]

export const HAIR_COLORS: ChoiceOption<string>[] = [
  { value: '#2b1b12', label: 'שחור' },
  { value: '#5a3320', label: 'חום' },
  { value: '#a5642a', label: 'ערמוני' },
  { value: '#e0a83c', label: 'בלונד' },
  { value: '#d3623a', label: 'ג׳ינג׳י' },
  { value: '#f487c0', label: 'ורוד' },
  { value: '#9b5de5', label: 'סגול' },
  { value: '#59c9e8', label: 'תכלת' },
]

export const OUTFITS: ChoiceOption<Outfit>[] = [
  { value: 'dress', label: 'שמלה', emoji: '👗' },
  { value: 'tunic', label: 'חולצה ארוכה', emoji: '👚' },
  { value: 'robe', label: 'גלימת קסם', emoji: '🥻' },
  { value: 'overalls', label: 'אוברול', emoji: '🧥' },
]

export const OUTFIT_COLORS: ChoiceOption<string>[] = [
  { value: '#f487c0', label: 'ורוד' },
  { value: '#9b5de5', label: 'סגול' },
  { value: '#59c9e8', label: 'תכלת' },
  { value: '#4fc3a1', label: 'טורקיז' },
  { value: '#f3c623', label: 'זהב' },
  { value: '#e8443a', label: 'אדום' },
  { value: '#fdfdff', label: 'לבן' },
  { value: '#5a6acf', label: 'כחול' },
]

export const SHOES: ChoiceOption<Shoes>[] = [
  { value: 'boots', label: 'מגפיים', emoji: '👢' },
  { value: 'flats', label: 'נעלי בלרינה', emoji: '🥿' },
  { value: 'sneakers', label: 'נעלי ספורט', emoji: '👟' },
]

export const HEADWEAR: ChoiceOption<Headwear>[] = [
  { value: 'crown', label: 'כתר', emoji: '👑' },
  { value: 'band', label: 'סרט', emoji: '🎀' },
  { value: 'hat', label: 'כובע קוסמת', emoji: '🎩' },
  { value: 'none', label: 'בלי', emoji: '🚫' },
]

export const CARRY: ChoiceOption<Carry>[] = [
  { value: 'cape', label: 'גלימה', emoji: '🦸' },
  { value: 'bag', label: 'תיק', emoji: '🎒' },
  { value: 'wings', label: 'כנפיים', emoji: '🦋' },
  { value: 'none', label: 'בלי', emoji: '🚫' },
]

export const CARRY_COLORS: ChoiceOption<string>[] = [
  { value: '#e8443a', label: 'אדום' },
  { value: '#9b5de5', label: 'סגול' },
  { value: '#59c9e8', label: 'תכלת' },
  { value: '#4fc3a1', label: 'טורקיז' },
  { value: '#f3c623', label: 'זהב' },
  { value: '#f487c0', label: 'ורוד' },
  { value: '#fdfdff', label: 'לבן' },
  { value: '#2b2b33', label: 'שחור' },
]

export const DEFAULT_AVATAR: AvatarConfig = {
  kind: 'princess',
  skin: SKIN_TONES[1].value,
  hairStyle: 'long',
  hairColor: HAIR_COLORS[1].value,
  outfit: 'dress',
  outfitColor: OUTFIT_COLORS[0].value,
  shoes: 'flats',
  headwear: 'crown',
  carry: 'cape',
  carryColor: CARRY_COLORS[1].value,
}

/** מנקה קונפיגורציה שנטענה מהאחסון, כדי שערך פגום לא ישבור את בניית המודל. */
export function sanitizeAvatar(raw: unknown): AvatarConfig {
  const base = { ...DEFAULT_AVATAR }
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const pick = <T extends string>(key: keyof AvatarConfig, allowed: readonly ChoiceOption<T>[]): T | undefined => {
    const v = r[key]
    return typeof v === 'string' && allowed.some((o) => o.value === v) ? (v as T) : undefined
  }
  return {
    kind: pick<AvatarKind>('kind', KINDS) ?? base.kind,
    skin: pick<string>('skin', SKIN_TONES) ?? base.skin,
    hairStyle: pick<HairStyle>('hairStyle', HAIR_STYLES) ?? base.hairStyle,
    hairColor: pick<string>('hairColor', HAIR_COLORS) ?? base.hairColor,
    outfit: pick<Outfit>('outfit', OUTFITS) ?? base.outfit,
    outfitColor: pick<string>('outfitColor', OUTFIT_COLORS) ?? base.outfitColor,
    shoes: pick<Shoes>('shoes', SHOES) ?? base.shoes,
    headwear: pick<Headwear>('headwear', HEADWEAR) ?? base.headwear,
    carry: pick<Carry>('carry', CARRY) ?? base.carry,
    carryColor: pick<string>('carryColor', CARRY_COLORS) ?? base.carryColor,
  }
}
