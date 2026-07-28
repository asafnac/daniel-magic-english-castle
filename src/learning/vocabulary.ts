/**
 * מאגר המילים של המשחק.
 *
 * זהו הקובץ היחיד שצריך לערוך כדי להוסיף, לשנות או להסיר מילה.
 * מנוע המשחק לא מכיר אף מילה ספציפית, הוא רק קורא מהמאגר הזה.
 *
 * להוספת מילה חדשה: מוסיפים אובייקט אחד למערך WORDS, ואז מוסיפים
 * את ה-id שלה לרשימת המילים של אזור כלשהו ב-areas.ts.
 */

export type Category = 'colors' | 'animals' | 'food' | 'numbers' | 'letters' | 'objects'

export interface Word {
  /** מזהה ייחודי. משמש בשמירה ב-localStorage, אז עדיף לא לשנות אחרי שמשחקים. */
  id: string
  /** המילה באנגלית, כפי שהיא נכתבת. */
  english: string
  /** התרגום לעברית, מוצג אחרי תשובה נכונה. */
  hebrew: string
  category: Category
  /** 1 = קל מאוד, 3 = מאתגר יותר. משמש לבחירת הסחות דעת מתאימות. */
  difficulty: 1 | 2 | 3
  /** התצוגה החזותית. אימוג'י של מערכת ההפעלה, ללא קבצים חיצוניים. */
  emoji: string
  /** למילות צבע בלבד: קוד הצבע לריבוע הצבע. */
  color?: string
  /** מה שה-TTS יקריא, אם שונה מ-english. */
  audioText?: string
  /** משפט מלא לאותיות, למשל "A is for apple". */
  sentence?: string
  /** למילות מספר בלבד: הערך המספרי. */
  count?: number
  /** לאותיות בלבד: האימוג'י של המילה המדגימה. */
  letterEmoji?: string
}

export const WORDS: Word[] = [
  // ---------- צבעים ----------
  { id: 'red', english: 'red', hebrew: 'אדום', category: 'colors', difficulty: 1, emoji: '🔴', color: '#e8443a' },
  { id: 'blue', english: 'blue', hebrew: 'כחול', category: 'colors', difficulty: 1, emoji: '🔵', color: '#2f7fe0' },
  { id: 'green', english: 'green', hebrew: 'ירוק', category: 'colors', difficulty: 1, emoji: '🟢', color: '#3fae5a' },
  { id: 'yellow', english: 'yellow', hebrew: 'צהוב', category: 'colors', difficulty: 1, emoji: '🟡', color: '#f3c623' },
  { id: 'pink', english: 'pink', hebrew: 'ורוד', category: 'colors', difficulty: 1, emoji: '🌸', color: '#f487c0' },
  { id: 'purple', english: 'purple', hebrew: 'סגול', category: 'colors', difficulty: 2, emoji: '🟣', color: '#9b5de5' },
  { id: 'orange', english: 'orange', hebrew: 'כתום', category: 'colors', difficulty: 2, emoji: '🟠', color: '#f4913a' },
  { id: 'black', english: 'black', hebrew: 'שחור', category: 'colors', difficulty: 1, emoji: '⚫', color: '#2b2b33' },
  { id: 'white', english: 'white', hebrew: 'לבן', category: 'colors', difficulty: 1, emoji: '⚪', color: '#fdfdff' },

  // ---------- חפצים בגן ----------
  { id: 'star', english: 'star', hebrew: 'כוכב', category: 'objects', difficulty: 1, emoji: '⭐' },
  { id: 'flower', english: 'flower', hebrew: 'פרח', category: 'objects', difficulty: 1, emoji: '🌷' },
  { id: 'tree', english: 'tree', hebrew: 'עץ', category: 'objects', difficulty: 1, emoji: '🌳' },
  { id: 'door', english: 'door', hebrew: 'דלת', category: 'objects', difficulty: 1, emoji: '🚪' },
  { id: 'key', english: 'key', hebrew: 'מפתח', category: 'objects', difficulty: 1, emoji: '🔑' },
  { id: 'book', english: 'book', hebrew: 'ספר', category: 'objects', difficulty: 1, emoji: '📕' },
  { id: 'heart', english: 'heart', hebrew: 'לב', category: 'objects', difficulty: 1, emoji: '❤️' },
  { id: 'sun', english: 'sun', hebrew: 'שמש', category: 'objects', difficulty: 1, emoji: '☀️' },
  { id: 'moon', english: 'moon', hebrew: 'ירח', category: 'objects', difficulty: 2, emoji: '🌙' },
  { id: 'crown', english: 'crown', hebrew: 'כתר', category: 'objects', difficulty: 2, emoji: '👑' },

  // ---------- חיות ----------
  { id: 'cat', english: 'cat', hebrew: 'חתול', category: 'animals', difficulty: 1, emoji: '🐱' },
  { id: 'dog', english: 'dog', hebrew: 'כלב', category: 'animals', difficulty: 1, emoji: '🐶' },
  { id: 'bird', english: 'bird', hebrew: 'ציפור', category: 'animals', difficulty: 1, emoji: '🐦' },
  { id: 'fish', english: 'fish', hebrew: 'דג', category: 'animals', difficulty: 1, emoji: '🐟' },
  { id: 'horse', english: 'horse', hebrew: 'סוס', category: 'animals', difficulty: 2, emoji: '🐴' },
  { id: 'rabbit', english: 'rabbit', hebrew: 'ארנב', category: 'animals', difficulty: 2, emoji: '🐰' },
  { id: 'lion', english: 'lion', hebrew: 'אריה', category: 'animals', difficulty: 2, emoji: '🦁' },
  { id: 'monkey', english: 'monkey', hebrew: 'קוף', category: 'animals', difficulty: 2, emoji: '🐵' },

  // ---------- אוכל ----------
  { id: 'apple', english: 'apple', hebrew: 'תפוח', category: 'food', difficulty: 1, emoji: '🍎' },
  { id: 'banana', english: 'banana', hebrew: 'בננה', category: 'food', difficulty: 1, emoji: '🍌' },
  { id: 'orange_fruit', english: 'orange', hebrew: 'תפוז', category: 'food', difficulty: 2, emoji: '🍊' },
  { id: 'milk', english: 'milk', hebrew: 'חלב', category: 'food', difficulty: 1, emoji: '🥛' },
  { id: 'water', english: 'water', hebrew: 'מים', category: 'food', difficulty: 1, emoji: '💧' },
  { id: 'bread', english: 'bread', hebrew: 'לחם', category: 'food', difficulty: 2, emoji: '🍞' },
  { id: 'cake', english: 'cake', hebrew: 'עוגה', category: 'food', difficulty: 1, emoji: '🍰' },
  { id: 'egg', english: 'egg', hebrew: 'ביצה', category: 'food', difficulty: 1, emoji: '🥚' },

  // ---------- מספרים ----------
  { id: 'one', english: 'one', hebrew: 'אחת', category: 'numbers', difficulty: 1, emoji: '1️⃣', count: 1 },
  { id: 'two', english: 'two', hebrew: 'שתיים', category: 'numbers', difficulty: 1, emoji: '2️⃣', count: 2 },
  { id: 'three', english: 'three', hebrew: 'שלוש', category: 'numbers', difficulty: 1, emoji: '3️⃣', count: 3 },
  { id: 'four', english: 'four', hebrew: 'ארבע', category: 'numbers', difficulty: 1, emoji: '4️⃣', count: 4 },
  { id: 'five', english: 'five', hebrew: 'חמש', category: 'numbers', difficulty: 1, emoji: '5️⃣', count: 5 },
  { id: 'six', english: 'six', hebrew: 'שש', category: 'numbers', difficulty: 2, emoji: '6️⃣', count: 6 },
  { id: 'seven', english: 'seven', hebrew: 'שבע', category: 'numbers', difficulty: 2, emoji: '7️⃣', count: 7 },
  { id: 'eight', english: 'eight', hebrew: 'שמונה', category: 'numbers', difficulty: 2, emoji: '8️⃣', count: 8 },
  { id: 'nine', english: 'nine', hebrew: 'תשע', category: 'numbers', difficulty: 2, emoji: '9️⃣', count: 9 },
  { id: 'ten', english: 'ten', hebrew: 'עשר', category: 'numbers', difficulty: 2, emoji: '🔟', count: 10 },

  // ---------- אותיות ----------
  // emoji הוא צורת האות עצמה. חשוב שדניאל תראה את האות האמיתית ולא סמל דומה,
  // ולכן כאן משתמשים בתו האות ולא באימוג'י. audioText הוא שם האות,
  // sentence הוא המשפט המלא שמושמע אחרי תשובה נכונה.
  { id: 'letter_a', english: 'A', hebrew: 'האות A', category: 'letters', difficulty: 1, emoji: 'A', audioText: 'A', sentence: 'A is for apple', letterEmoji: '🍎' },
  { id: 'letter_b', english: 'B', hebrew: 'האות B', category: 'letters', difficulty: 1, emoji: 'B', audioText: 'B', sentence: 'B is for ball', letterEmoji: '⚽' },
  { id: 'letter_c', english: 'C', hebrew: 'האות C', category: 'letters', difficulty: 1, emoji: 'C', audioText: 'C', sentence: 'C is for cat', letterEmoji: '🐱' },
  { id: 'letter_d', english: 'D', hebrew: 'האות D', category: 'letters', difficulty: 1, emoji: 'D', audioText: 'D', sentence: 'D is for dog', letterEmoji: '🐶' },
  { id: 'letter_e', english: 'E', hebrew: 'האות E', category: 'letters', difficulty: 2, emoji: 'E', audioText: 'E', sentence: 'E is for egg', letterEmoji: '🥚' },
  { id: 'letter_f', english: 'F', hebrew: 'האות F', category: 'letters', difficulty: 2, emoji: 'F', audioText: 'F', sentence: 'F is for fish', letterEmoji: '🐟' },
  { id: 'letter_g', english: 'G', hebrew: 'האות G', category: 'letters', difficulty: 2, emoji: 'G', audioText: 'G', sentence: 'G is for gift', letterEmoji: '🎁' },
  { id: 'letter_h', english: 'H', hebrew: 'האות H', category: 'letters', difficulty: 2, emoji: 'H', audioText: 'H', sentence: 'H is for hat', letterEmoji: '👒' },
  { id: 'letter_i', english: 'I', hebrew: 'האות I', category: 'letters', difficulty: 3, emoji: 'I', audioText: 'I', sentence: 'I is for ice cream', letterEmoji: '🍦' },
  { id: 'letter_j', english: 'J', hebrew: 'האות J', category: 'letters', difficulty: 3, emoji: 'J', audioText: 'J', sentence: 'J is for juice', letterEmoji: '🧃' },
  { id: 'letter_k', english: 'K', hebrew: 'האות K', category: 'letters', difficulty: 3, emoji: 'K', audioText: 'K', sentence: 'K is for key', letterEmoji: '🔑' },
  { id: 'letter_l', english: 'L', hebrew: 'האות L', category: 'letters', difficulty: 3, emoji: 'L', audioText: 'L', sentence: 'L is for lion', letterEmoji: '🦁' },
]

const BY_ID = new Map<string, Word>(WORDS.map((w) => [w.id, w]))

/** מחזיר מילה לפי מזהה. זורק אם המזהה לא קיים, כדי לתפוס שגיאות הקלדה מוקדם. */
export function getWord(id: string): Word {
  const w = BY_ID.get(id)
  if (!w) throw new Error(`Unknown word id: ${id}`)
  return w
}

/** מחזיר מילה לפי מזהה, או undefined. לשימוש בקוד שקורא מ-localStorage ישן. */
export function findWord(id: string): Word | undefined {
  return BY_ID.get(id)
}

export function getWords(ids: string[]): Word[] {
  return ids.map(getWord)
}

export function wordsInCategory(category: Category): Word[] {
  return WORDS.filter((w) => w.category === category)
}

/** הטקסט שה-TTS צריך להקריא עבור מילה. */
export function speakTextFor(word: Word): string {
  return word.audioText ?? word.english
}
