/**
 * מנוע הצלילים: פונמות, שרשור וקריאה.
 *
 * זה הקובץ שהופך את המשחק ממשחק זיהוי מילים למשחק שמלמד לקרוא.
 * ההבדל בין שם האות לצליל שלה הוא ההבדל בין "לדעת את האלפבית" לבין
 * "לקרוא מילה": שם האות הוא "אֵס", והצליל הוא סססס. רק מהצליל
 * אפשר לשרשר, ורק שרשור הוא קריאה.
 *
 * סדר ההוראה אינו אלפביתי בכוונה. פוניקס שיטתי מתחיל ב-s a t p i n
 * כי מהן לבד אפשר לבנות עשרות מילים אמיתיות ולקרוא כבר בשיעור הראשון.
 * הסדר A B C דוחה את רגע הקריאה הראשון עד סוף האלפבית.
 *
 * הקובץ הזה לא מכיר DOM ולא Three.js. הוא נתונים ולוגיקה בלבד.
 */

import { WORDS, getWord, type Word } from './vocabulary'

export interface Phoneme {
  /** מזהה הצליל. כרגע זהה לאות היחידה שמייצגת אותו. */
  id: string
  /** איך הצליל נכתב. */
  grapheme: string
  /**
   * מה נשלח לקריינות כדי להשמיע את הצליל עצמו ולא את שם האות.
   *
   * זו החוליה החלשה במנוע, וכדאי להיות כנים לגביה: קריינות דפדפן
   * לא יודעת להגות פונמה בודדת. על אות בודדת היא תאמר את שם האות
   * ("טי" במקום ט), ולכן כאן יושבים קירובים שנבדקו באוזן.
   * צליל מתמשך כמו סססס יוצא טוב. עיצור עוצר כמו ט לא ניתן להארכה
   * בכלל, ולכן הוא מקבל שווא קל - פשרה מקובלת גם בכיתה.
   *
   * המילה השלמה תמיד מושמעת מהקריינות הרגילה ולכן תמיד נכונה,
   * והקירובים משמשים כפיגום בלבד. אם תתווסף פעם הקלטה אמיתית,
   * מוסיפים אותה תחת audioKey בדיוק כמו במילים, בלי לגעת בקוד.
   */
  say: string
  /** האם אפשר להאריך את הצליל. משנה את ההנחיה שהילדה מקבלת. */
  continuant: boolean
  /** מזהה המילה שמעגנת את הצליל, מתוך מאגר המילים. */
  anchor: string
  /** תיאור הצליל בעברית. אף פעם לא שם האות. */
  hebrew: string
  /** באיזו קבוצת הוראה הצליל נלמד. */
  set: 1 | 2 | 3
  /** מזהה הקלטה עתידית, בדיוק כמו במילים. */
  audioKey?: string
}

/**
 * שלוש קבוצות ההוראה, בסדר של פוניקס שיטתי.
 * כל קבוצה נבחרה כך שהיא פותחת משפחה שלמה של מילים חדשות.
 */
export const PHONEMES: Phoneme[] = [
  // ---------- קבוצה 1: s a t p i n ----------
  { id: 's', grapheme: 's', say: 'sss', continuant: true, anchor: 'sit', hebrew: 'סססס, כמו נחש', set: 1 },
  { id: 'a', grapheme: 'a', say: 'ah', continuant: true, anchor: 'ant', hebrew: 'אַ קצר', set: 1 },
  { id: 't', grapheme: 't', say: 'tuh', continuant: false, anchor: 'tap', hebrew: 'ט קצר', set: 1 },
  { id: 'p', grapheme: 'p', say: 'puh', continuant: false, anchor: 'pan', hebrew: 'פ קצר', set: 1 },
  { id: 'i', grapheme: 'i', say: 'ih', continuant: true, anchor: 'pin', hebrew: 'אִ קצר', set: 1 },
  { id: 'n', grapheme: 'n', say: 'nnn', continuant: true, anchor: 'nap', hebrew: 'ננננ', set: 1 },

  // ---------- קבוצה 2: m d g o c k ----------
  { id: 'm', grapheme: 'm', say: 'mmm', continuant: true, anchor: 'map', hebrew: 'מממ', set: 2 },
  { id: 'd', grapheme: 'd', say: 'duh', continuant: false, anchor: 'dig', hebrew: 'ד קצר', set: 2 },
  { id: 'g', grapheme: 'g', say: 'guh', continuant: false, anchor: 'pig', hebrew: 'ג קצר', set: 2 },
  { id: 'o', grapheme: 'o', say: 'oh', continuant: true, anchor: 'pot', hebrew: 'אוֹ קצר', set: 2 },
  { id: 'c', grapheme: 'c', say: 'kuh', continuant: false, anchor: 'cat', hebrew: 'ק קצר', set: 2 },
  { id: 'k', grapheme: 'k', say: 'kuh', continuant: false, anchor: 'kid', hebrew: 'ק קצר, נכתב אחרת', set: 2 },

  // ---------- קבוצה 3: e u r h b f l ----------
  { id: 'e', grapheme: 'e', say: 'eh', continuant: true, anchor: 'bed', hebrew: 'אֶ קצר', set: 3 },
  { id: 'u', grapheme: 'u', say: 'uh', continuant: true, anchor: 'bus', hebrew: 'אַ עמום', set: 3 },
  { id: 'r', grapheme: 'r', say: 'rrr', continuant: true, anchor: 'run', hebrew: 'ררר', set: 3 },
  { id: 'h', grapheme: 'h', say: 'huh', continuant: true, anchor: 'hat', hebrew: 'ה נשופה', set: 3 },
  { id: 'b', grapheme: 'b', say: 'buh', continuant: false, anchor: 'bat', hebrew: 'ב קצר', set: 3 },
  { id: 'f', grapheme: 'f', say: 'fff', continuant: true, anchor: 'fan', hebrew: 'פףףף', set: 3 },
  { id: 'l', grapheme: 'l', say: 'lll', continuant: true, anchor: 'leg', hebrew: 'ללל', set: 3 },
]

const BY_ID = new Map(PHONEMES.map((p) => [p.id, p]))

export function findPhoneme(id: string): Phoneme | undefined {
  return BY_ID.get(id)
}

export function getPhoneme(id: string): Phoneme {
  const p = BY_ID.get(id)
  if (!p) throw new Error(`Unknown phoneme id: ${id}`)
  return p
}

/** הצלילים של קבוצת הוראה אחת. */
export function phonemesInSet(set: 1 | 2 | 3): Phoneme[] {
  return PHONEMES.filter((p) => p.set === set)
}

/** כל הצלילים שנלמדו עד קבוצה מסוימת ועד בכלל. */
export function phonemesUpTo(set: 1 | 2 | 3): Phoneme[] {
  return PHONEMES.filter((p) => p.set <= set)
}

// ---------------------------------------------------------------- מילים

/** מילה שאפשר לפענח: יש לה פירוק לצלילים. */
export interface DecodableWord extends Word {
  sounds: string[]
}

export function isDecodable(word: Word): word is DecodableWord {
  return Array.isArray(word.sounds) && word.sounds.length > 0
}

/** כל המילים במאגר שיש להן פירוק לצלילים. */
export function decodableWords(): DecodableWord[] {
  return WORDS.filter(isDecodable)
}

export function getDecodable(id: string): DecodableWord {
  const w = getWord(id)
  if (!isDecodable(w)) throw new Error(`Word "${id}" has no sound breakdown`)
  return w
}

/**
 * המילים שאפשר לפענח עם קבוצת צלילים נתונה בלבד.
 * זהו הלב של ההתקדמות: כל צליל חדש פותח משפחה שלמה של מילים,
 * ולכן הרווח הוא צירופי ולא נצרך.
 */
export function decodableWith(phonemeIds: readonly string[]): DecodableWord[] {
  const have = new Set(phonemeIds)
  return decodableWords().filter((w) => w.sounds.every((s) => have.has(s)))
}

/** המילים שנפתחות עד קבוצת הוראה מסוימת. */
export function wordsUpTo(set: 1 | 2 | 3): DecodableWord[] {
  return decodableWith(phonemesUpTo(set).map((p) => p.id))
}

/**
 * המילים שהקבוצה הזאת פתחה ולא היו אפשריות לפניה.
 * זה מה שראוי להראות כרווח: לא "עוד שישה צלילים", אלא
 * "ועכשיו את יכולה לקרוא גם את אלה".
 */
export function wordsUnlockedBySet(set: 1 | 2 | 3): DecodableWord[] {
  const now = new Set(wordsUpTo(set).map((w) => w.id))
  const before = set === 1 ? new Set<string>() : new Set(wordsUpTo((set - 1) as 1 | 2).map((w) => w.id))
  return wordsUpTo(set).filter((w) => now.has(w.id) && !before.has(w.id))
}

// ---------------------------------------------------------------- שרשור

/**
 * הטקסט שמושמע כשמשרשרים מילה לאט: הצלילים בזה אחר זה.
 * המילה השלמה מושמעת אחריו בנפרד, כדי שהמודל הנכון תמיד יישמע.
 */
export function blendScript(word: DecodableWord): string[] {
  return word.sounds.map((id) => getPhoneme(id).say)
}

/** בדיקת שפיות: הצלילים חייבים להרכיב בדיוק את איות המילה. */
export function spellingMatchesSounds(word: DecodableWord): boolean {
  return word.sounds.map((id) => findPhoneme(id)?.grapheme ?? ' ').join('') === word.english.toLowerCase()
}
