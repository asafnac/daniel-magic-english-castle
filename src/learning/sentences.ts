/**
 * מנוע המשפטים.
 *
 * עד כאן המשחק לימד מילים בודדות. אבל שפה היא מערכת של הרכבה, ורשימת
 * מילים נגמרת מהר בדיוק כי אי אפשר לעשות איתה כלום. כאן נכנסת
 * טבלת ההחלפה: מסגרת עם משבצות, ובכל משבצת כמה מילים אפשריות.
 * כל צירוף חוקי, וכל צירוף מייצר תמונה אחרת. ככה דקדוק הופך למשהו
 * שאפשר לגלות בניסוי במקום לשנן.
 *
 * ארבע המסגרות כאן לא נבחרו באקראי. כל אחת מכוונת לטעות שדובר עברית
 * עושה כמעט תמיד, כי המבנה בעברית שונה:
 *
 * 1. שם התואר בא לפני שם העצם. בעברית הוא בא אחריו: "כלב גדול"
 *    מול "big dog". זו הפוכה מלאה, ולכן היא ראשונה.
 * 2. באנגלית יש אוגד בהווה. בעברית אין: "החתול עצוב" מול
 *    "the cat is sad". המילה is פשוט נעלמת אצל דובר עברית.
 * 3. באנגלית יש תווית לא מיודעת. בעברית אין בכלל: "יש לי תיק"
 *    מול "I have a bag".
 * 4. שני שמות תואר: קודם גודל ואז צבע. הסדר הזה קבוע באנגלית.
 *
 * הקובץ הזה לא מכיר DOM ולא Three.js.
 */

import { getWord, type Word } from './vocabulary'

export type SlotRole = 'article' | 'pronoun' | 'verb' | 'copula' | 'size' | 'colour' | 'noun'

export interface FrameSlot {
  role: SlotRole
  /** מילה קבועה שאין בה בחירה, כמו "the". */
  fixed?: string
  /** המילים שאפשר לבחור במשבצת הזאת. */
  choices?: string[]
}

export interface Frame {
  id: string
  /** שם המסגרת בעברית. */
  title: string
  /** מה היא מלמדת. לתיעוד ולמסך ההורה, לא לילדה. */
  teaches: string
  slots: FrameSlot[]
  /** בונה את התרגום לעברית מהמילים שנבחרו. */
  hebrewOf: (picked: Partial<Record<SlotRole, Word>>) => string
}

/**
 * כל שמות העצם כאן זכר יחיד בעברית, וזה לא במקרה: כך התרגום
 * העברי נשאר תקין בכל צירוף בלי מנוע התאמת מין ומספר.
 */
const NOUNS = ['dog', 'cat', 'fish', 'bag', 'pen', 'book']
const COLOURS = ['red', 'blue', 'green', 'yellow']
const SIZES = ['big', 'small']
const FEELINGS = ['big', 'small', 'happy', 'sad']

const he = (w: Word | undefined): string => w?.hebrew ?? ''

export const FRAMES: Frame[] = [
  {
    id: 'the-size-noun',
    title: 'התואר לפני השם',
    teaches: 'באנגלית שם התואר בא לפני שם העצם, הפוך מעברית',
    slots: [
      { role: 'article', fixed: 'the' },
      { role: 'size', choices: SIZES },
      { role: 'noun', choices: NOUNS },
    ],
    hebrewOf: (p) => `ה${he(p.noun)} ה${he(p.size)}`,
  },
  {
    id: 'the-noun-is-adj',
    title: 'המילה is',
    teaches: 'באנגלית יש אוגד בהווה, ובעברית אין',
    slots: [
      { role: 'article', fixed: 'the' },
      { role: 'noun', choices: NOUNS },
      { role: 'copula', fixed: 'is' },
      { role: 'size', choices: FEELINGS },
    ],
    hebrewOf: (p) => `ה${he(p.noun)} ${he(p.size)}`,
  },
  {
    id: 'i-have-a-colour-noun',
    title: 'התווית a',
    teaches: 'באנגלית יש תווית לא מיודעת, ובעברית אין בכלל',
    slots: [
      { role: 'pronoun', fixed: 'i_pronoun' },
      { role: 'verb', fixed: 'have' },
      { role: 'article', fixed: 'a' },
      { role: 'colour', choices: COLOURS },
      { role: 'noun', choices: NOUNS },
    ],
    hebrewOf: (p) => `יש לי ${he(p.noun)} ${he(p.colour)}`,
  },
  {
    id: 'the-size-colour-noun',
    title: 'שני תארים לפי הסדר',
    teaches: 'כששני תארים באים יחד, גודל תמיד לפני צבע',
    slots: [
      { role: 'article', fixed: 'the' },
      { role: 'size', choices: SIZES },
      { role: 'colour', choices: COLOURS },
      { role: 'noun', choices: NOUNS },
    ],
    hebrewOf: (p) => `ה${he(p.noun)} ה${he(p.size)} ה${he(p.colour)}`,
  },
]

const BY_ID = new Map(FRAMES.map((f) => [f.id, f]))

export function findFrame(id: string): Frame | undefined {
  return BY_ID.get(id)
}

export function getFrame(id: string): Frame {
  const f = BY_ID.get(id)
  if (!f) throw new Error(`Unknown frame id: ${id}`)
  return f
}

// ---------------------------------------------------------------- צירופים

/**
 * הסצנה שצירוף מייצר.
 *
 * זה מה שהופך את זה למשחק ולא לתרגיל: לא מספיק שהמשפט נכון, הוא
 * גם חייב לעשות משהו שרואים. "the big red dog" ו-"the small blue dog"
 * מוכרחים להיראות שונה, אחרת אין שום סיבה לשים לב לשתי המילים
 * שבאמצע.
 */
export interface Scene {
  emoji: string
  /** צבע הרקע, אם נבחר צבע. */
  color?: string
  /** קנה מידה, אם נבחר גודל. */
  scale: number
}

export interface BuiltSentence {
  frameId: string
  /** מזהי המילים לפי סדר המשבצות, כולל הקבועות. */
  picks: string[]
  english: string
  hebrew: string
  scene: Scene
}

/** המילים שנבחרו, לפי תפקיד. */
function byRole(frame: Frame, picks: readonly string[]): Partial<Record<SlotRole, Word>> {
  const out: Partial<Record<SlotRole, Word>> = {}
  frame.slots.forEach((slot, i) => {
    const id = picks[i]
    if (id) out[slot.role] = getWord(id)
  })
  return out
}

export function buildSentence(frameId: string, picks: readonly string[]): BuiltSentence {
  const frame = getFrame(frameId)
  const roles = byRole(frame, picks)
  const words = picks.map(getWord)
  const noun = roles.noun

  // רק גודל אמיתי משנה קנה מידה. "happy" הוא תואר במסגרת הזאת
  // אבל אין לו גודל, ולכן הוא לא מותח את התמונה.
  const sizeWord = roles.size
  const scale = sizeWord?.sizeHint === 'big' ? 1.5 : sizeWord?.sizeHint === 'small' ? 0.6 : 1

  return {
    frameId,
    picks: picks.slice(),
    english: words.map((w) => w.english).join(' '),
    hebrew: frame.hebrewOf(roles),
    scene: {
      emoji: emojiFor(noun, roles.size),
      color: roles.colour?.color,
      scale,
    },
  }
}

/**
 * רגש משנה את הפרצוף ולא את החפץ. בלי זה "the dog is sad" היה
 * נראה בדיוק כמו "the dog is happy", והמילה האחרונה הייתה מיותרת.
 */
function emojiFor(noun: Word | undefined, adjective: Word | undefined): string {
  const base = noun?.emoji ?? '❓'
  if (adjective?.id === 'happy') return `${base}😊`
  if (adjective?.id === 'sad') return `${base}😢`
  return base
}

/** ברירת המחדל של מסגרת: האפשרות הראשונה בכל משבצת. */
export function defaultPicks(frame: Frame): string[] {
  return frame.slots.map((s) => s.fixed ?? s.choices?.[0] ?? '')
}

/** כמה צירופים שונים המסגרת מייצרת. */
export function combinationCount(frame: Frame): number {
  return frame.slots.reduce((n, s) => n * (s.fixed ? 1 : (s.choices?.length ?? 1)), 1)
}

/**
 * צירופים שנבדלים מהמקור במשבצת אחת בלבד.
 *
 * זה מה שמכריח להקשיב לכל מילה. אם ההסחות נבדלות בשתי מילים,
 * אפשר לזהות את התשובה מהמילה הראשונה ולהפסיק להקשיב.
 */
export function neighbours(frameId: string, picks: readonly string[]): BuiltSentence[] {
  const frame = getFrame(frameId)
  const out: BuiltSentence[] = []
  frame.slots.forEach((slot, i) => {
    if (slot.fixed || !slot.choices) return
    for (const choice of slot.choices) {
      if (choice === picks[i]) continue
      const next = picks.slice()
      next[i] = choice
      out.push(buildSentence(frameId, next))
    }
  })
  return out
}
