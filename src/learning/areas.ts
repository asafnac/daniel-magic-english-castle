/**
 * הגדרת חמשת אזורי הטירה והמשימות שבהם.
 *
 * להוספת אזור חדש: מוסיפים AreaDef למערך AREAS, מוסיפים לו פריסה
 * ויזואלית ב-game/areasGeometry.ts, וזהו. מנוע המשחק קורא הכל מכאן.
 */

import type { TaskType } from './questions'

export interface AreaTaskSpec {
  type: TaskType
  /** מזהה המילה שהיא התשובה הנכונה. */
  word: string
  /** הסחות דעת מפורשות. אם לא צוינו, נבחרות אוטומטית ממילות האזור. */
  distractors?: string[]
  /** למשימת התאמה: כל המילים שמשתתפות בזוגות (כולל word). */
  pairWords?: string[]
  /** למשימת ספירה: לספור חפצים, או לשמוע מספר ולבחור כמות. */
  variant?: 'count-objects' | 'hear-number'
  /** למשימת ספירה: איזה חפץ סופרים. ברירת המחדל היא כוכבים. */
  countEmoji?: string
}

export interface AreaDef {
  id: string
  order: number
  /** הכותרת בעברית. */
  title: string
  emoji: string
  /** צבע הדגשה ל-UI. משתקף גם בפאנל המשימה. */
  accent: string
  /** מה הדמות אומרת כשנכנסים לאזור. */
  intro: string
  /** מה נאמר כשמסיימים את האזור. */
  done: string
  guide: { name: string; emoji: string }
  /** המילים שנלמדות באזור, לתצוגה במסך ההתקדמות. */
  words: string[]
  tasks: AreaTaskSpec[]
}

export const AREAS: AreaDef[] = [
  // ============================ 1. גן הצבעים ============================
  {
    id: 'colors-garden',
    order: 1,
    title: 'גן הצבעים',
    emoji: '🌸',
    accent: '#f487c0',
    intro: 'שלום דניאל! אני לילי הפיה. בואי נלמד יחד את הצבעים באנגלית.',
    done: 'איזה יופי! למדת את כל הצבעים. השער לחצר החיות נפתח!',
    guide: { name: 'לילי הפיה', emoji: '🧚' },
    words: ['red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'black', 'white', 'star', 'flower', 'tree'],
    tasks: [
      { type: 'color-pick', word: 'red', distractors: ['blue', 'yellow'] },
      { type: 'color-pick', word: 'blue', distractors: ['red', 'green'] },
      { type: 'listen-pick-image', word: 'star', distractors: ['flower', 'tree', 'sun'] },
      { type: 'color-pick', word: 'yellow', distractors: ['red', 'blue', 'green'] },
      { type: 'color-pick', word: 'green', distractors: ['blue', 'yellow', 'red'] },
      { type: 'two-words', word: 'flower', distractors: ['tree'] },
      { type: 'color-pick', word: 'pink', distractors: ['red', 'purple', 'blue'] },
      { type: 'say-it', word: 'purple' },
      { type: 'color-pick', word: 'orange', distractors: ['yellow', 'red', 'pink'] },
      { type: 'match-word-object', word: 'red', pairWords: ['red', 'blue', 'green'] },
      { type: 'color-pick', word: 'black', distractors: ['white', 'purple', 'blue'] },
      { type: 'color-pick', word: 'white', distractors: ['black', 'yellow', 'pink'] },
    ],
  },

  // ============================ 2. חצר החיות ============================
  {
    id: 'animals-yard',
    order: 2,
    title: 'חצר החיות',
    emoji: '🐾',
    accent: '#4fc3a1',
    intro: 'היי! אני ברק, דרקון קטן וידידותי. כל החיות שלי מדברות אנגלית.',
    done: 'כל החיות שמחות! פתחת את הדרך למטבח הקסם.',
    guide: { name: 'ברק הדרקון', emoji: '🐲' },
    words: ['cat', 'dog', 'bird', 'fish', 'horse', 'rabbit', 'lion', 'monkey'],
    tasks: [
      { type: 'listen-pick-image', word: 'cat', distractors: ['dog', 'bird'] },
      { type: 'listen-pick-image', word: 'dog', distractors: ['cat', 'fish', 'bird'] },
      { type: 'two-words', word: 'bird', distractors: ['fish'] },
      { type: 'listen-pick-image', word: 'fish', distractors: ['bird', 'cat', 'rabbit'] },
      { type: 'say-it', word: 'horse' },
      { type: 'listen-pick-image', word: 'rabbit', distractors: ['cat', 'horse', 'monkey'] },
      { type: 'match-word-object', word: 'cat', pairWords: ['cat', 'dog', 'bird'] },
      { type: 'two-words', word: 'lion', distractors: ['monkey'] },
      { type: 'counting', word: 'three', variant: 'count-objects', distractors: ['two', 'four', 'five'], countEmoji: '🐵' },
      { type: 'listen-pick-image', word: 'monkey', distractors: ['lion', 'horse', 'rabbit'] },
    ],
  },

  // ============================ 3. מטבח הקסם ============================
  {
    id: 'magic-kitchen',
    order: 3,
    title: 'מטבח הקסם',
    emoji: '🍎',
    accent: '#f4913a',
    intro: 'ברוכה הבאה למטבח! אני טופי, ואני מבשלת רק עם מילים באנגלית.',
    done: 'טעים! עכשיו אפשר לעלות למגדל המספרים.',
    guide: { name: 'טופי הטבחית', emoji: '🧁' },
    words: ['apple', 'banana', 'orange_fruit', 'milk', 'water', 'bread', 'cake', 'egg'],
    tasks: [
      { type: 'listen-pick-image', word: 'apple', distractors: ['banana', 'egg'] },
      { type: 'listen-pick-image', word: 'banana', distractors: ['apple', 'bread', 'cake'] },
      { type: 'two-words', word: 'milk', distractors: ['water'] },
      { type: 'listen-pick-image', word: 'orange_fruit', distractors: ['apple', 'banana', 'egg'] },
      { type: 'say-it', word: 'bread' },
      { type: 'match-word-object', word: 'apple', pairWords: ['apple', 'banana', 'cake'] },
      { type: 'listen-pick-image', word: 'egg', distractors: ['bread', 'cake', 'milk'] },
      { type: 'two-words', word: 'cake', distractors: ['bread'] },
      { type: 'listen-pick-image', word: 'water', distractors: ['milk', 'egg', 'apple'] },
      { type: 'listen-pick-image', word: 'milk', distractors: ['water', 'cake', 'bread'] },
    ],
  },

  // ============================ 4. מגדל המספרים ============================
  {
    id: 'numbers-tower',
    order: 4,
    title: 'מגדל המספרים',
    emoji: '🔢',
    accent: '#5aa9f0',
    intro: 'אני זיו, הכוכב הסופר. את כבר יודעת לספור, בואי נספור באנגלית!',
    done: 'ספרת מצוין! דלת הספרייה נפתחה.',
    guide: { name: 'זיו הכוכב', emoji: '⭐' },
    words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
    tasks: [
      { type: 'counting', word: 'three', variant: 'count-objects', distractors: ['two', 'four', 'five'], countEmoji: '⭐' },
      { type: 'counting', word: 'five', variant: 'count-objects', distractors: ['four', 'six', 'three'], countEmoji: '💎' },
      { type: 'counting', word: 'one', variant: 'hear-number', distractors: ['two', 'three'], countEmoji: '👑' },
      { type: 'counting', word: 'two', variant: 'count-objects', distractors: ['one', 'three', 'four'], countEmoji: '🌷' },
      { type: 'listen-pick-image', word: 'four', distractors: ['three', 'five', 'six'] },
      { type: 'counting', word: 'seven', variant: 'hear-number', distractors: ['six', 'eight'], countEmoji: '⭐' },
      { type: 'counting', word: 'six', variant: 'count-objects', distractors: ['five', 'seven', 'eight'], countEmoji: '🔑' },
      { type: 'say-it', word: 'eight' },
      { type: 'counting', word: 'nine', variant: 'hear-number', distractors: ['eight', 'ten'], countEmoji: '💎' },
      { type: 'counting', word: 'ten', variant: 'count-objects', distractors: ['nine', 'eight', 'seven'], countEmoji: '🌟' },
    ],
  },

  // ============================ 5. ספריית האותיות ============================
  {
    id: 'letters-library',
    order: 5,
    title: 'ספריית האותיות',
    emoji: '📚',
    accent: '#9b5de5',
    intro: 'שששש... אני אלמה הינשופה. כאן לומדים את האותיות, מעט מעט.',
    done: 'כל הכבוד דניאל! סיימת את כל הטירה. את אלופה!',
    guide: { name: 'אלמה הינשופה', emoji: '🦉' },
    words: ['letter_a', 'letter_b', 'letter_c', 'letter_d', 'letter_e', 'letter_f', 'letter_g', 'letter_h', 'letter_i', 'letter_j', 'letter_k', 'letter_l'],
    tasks: [
      // בכל פעם רק שלוש אותיות מול העיניים. לא כל האלפבית בבת אחת.
      { type: 'letter-sound', word: 'letter_a', distractors: ['letter_b', 'letter_c'] },
      { type: 'letter-sound', word: 'letter_b', distractors: ['letter_a', 'letter_c'] },
      { type: 'letter-sound', word: 'letter_c', distractors: ['letter_a', 'letter_b'] },
      { type: 'letter-sound', word: 'letter_d', distractors: ['letter_e', 'letter_f'] },
      { type: 'letter-sound', word: 'letter_e', distractors: ['letter_d', 'letter_f'] },
      { type: 'letter-sound', word: 'letter_f', distractors: ['letter_d', 'letter_e'] },
      { type: 'letter-sound', word: 'letter_g', distractors: ['letter_h', 'letter_i'] },
      { type: 'letter-sound', word: 'letter_i', distractors: ['letter_g', 'letter_h'] },
      { type: 'letter-sound', word: 'letter_k', distractors: ['letter_j', 'letter_l'] },
      { type: 'letter-sound', word: 'letter_l', distractors: ['letter_j', 'letter_k'] },
    ],
  },
]

const AREA_BY_ID = new Map<string, AreaDef>(AREAS.map((a) => [a.id, a]))

export function getArea(id: string): AreaDef {
  const a = AREA_BY_ID.get(id)
  if (!a) throw new Error(`Unknown area id: ${id}`)
  return a
}

export function findArea(id: string): AreaDef | undefined {
  return AREA_BY_ID.get(id)
}

export const FIRST_AREA_ID = AREAS[0].id

/** האזור הבא בסדר, או undefined אם זה האחרון. */
export function nextArea(id: string): AreaDef | undefined {
  const a = findArea(id)
  if (!a) return undefined
  return AREAS.find((x) => x.order === a.order + 1)
}
