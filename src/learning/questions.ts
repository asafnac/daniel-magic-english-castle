/**
 * מערכת השאלות.
 *
 * הקובץ הזה הופך הגדרת משימה (AreaTaskSpec) למשימה מוכנה להצגה (Task).
 * הוא לא יודע דבר על Three.js ולא על DOM. הוא מייצר נתונים בלבד,
 * וה-TaskPanel יודע לרנדר כל Task.
 *
 * להוספת סוג משימה חדש: מוסיפים ערך ל-TaskType, מוסיפים מחולל כאן,
 * ומוסיפים ענף רינדור ב-ui/components/TaskPanel.ts.
 */

import { WORDS, getWord, speakTextFor, type Word } from './vocabulary'
import { PHONEMES, blendScript, getDecodable, getPhoneme, type DecodableWord, type Phoneme } from './phonics'
import { findArea, type AreaTaskSpec } from './areas'

export type TaskType =
  | 'listen-pick-image'
  | 'match-word-object'
  | 'letter-sound'
  | 'two-words'
  | 'counting'
  | 'color-pick'
  | 'say-it'
  /** שומעים משפט שלם ובוחרים את הסצנה שמתאימה לו. */
  | 'phrase-match'
  /** שומעים "גדול" או "קטן" ובוחרים בין אותו עצם בשני גדלים. */
  | 'size-pick'
  // ---------- משימות הקריאה ----------
  /** שומעים צליל בודד ובוחרים את האות שמייצגת אותו. */
  | 'sound-to-letter'
  /** שומעים מילה מפורקת לצלילים ובוחרים את התמונה. שרשור באוזן. */
  | 'sound-out'
  /** בונים את המילה מאריחי צליל. הפקה, לא בחירה מרשימה. */
  | 'blend-build'
  /** רואים מילה כתובה בלי לשמוע אותה, מפענחים ובוחרים את התמונה. */
  | 'read-word'

/** סוגי המשימות שמלמדים לקרוא ולא רק לזהות בשמיעה. */
export const PHONICS_TYPES: readonly TaskType[] = ['sound-to-letter', 'sound-out', 'blend-build', 'read-word']

export function isPhonicsType(type: TaskType): boolean {
  return PHONICS_TYPES.includes(type)
}

/** צורות לאפשרויות צבע, כדי שלעולם לא נסתמך על צבע בלבד. */
export type OptionShape = 'circle' | 'square' | 'star' | 'heart' | 'flower' | 'diamond'

const SHAPES: OptionShape[] = ['circle', 'square', 'star', 'heart', 'flower', 'diamond']

export interface TaskOption {
  id: string
  correct: boolean
  /** האימוג'י או התו הראשי של האפשרות. */
  emoji?: string
  /** מספר חזרות של האימוג'י, למשימות כמות. */
  repeat?: number
  /** תווית בעברית מתחת לאפשרות. */
  label?: string
  /** הטקסט באנגלית. מוצג רק אם הופעלה האפשרות בהגדרות. */
  english?: string
  /** צבע מילוי, למשימות צבע. */
  color?: string
  /** צורה ייחודית, למשימות צבע. */
  shape?: OptionShape
  /** מה יושמע כשלוחצים על כפתור הרמקול של האפשרות. */
  speak?: string
  /** מספר סידורי מוצג, למשימות שתי מילים. */
  badge?: string
  /** קנה מידה לאימוג'י. משמש למשימות גדול וקטן. */
  scale?: number
}

export interface MatchPair {
  id: string
  english: string
  hebrew: string
  emoji: string
  color?: string
}

export interface Task {
  /** מזהה ייחודי להרצה הנוכחית. */
  key: string
  type: TaskType
  areaId: string
  wordId: string
  /** ההוראה בעברית. מוצגת וגם מוקראת בעברית אם יש קול. */
  promptHe: string
  /** מה מושמע באנגלית כשהמשימה נפתחת. */
  speakOnStart?: string
  options: TaskOption[]
  pairs?: MatchPair[]
  /** מה שמוצג בגדול במרכז: תמונה לזיהוי, או חפצים לספירה. */
  stimulus?: { emoji: string; repeat: number }
  /** רמזים מדורגים. רמז i מוצג אחרי הטעות ה-i. */
  hints: string[]
  variant?: 'count-objects' | 'hear-number'
  /** משימת חזרה על מילה שנטעו בה. משנה רק את הניסוח. */
  isPractice?: boolean

  // ---------------------------------------------------------- קריאה
  /**
   * הצלילים להשמעה בזה אחר זה, בהפרדה. זה מה שהופך "cat" ל-c-a-t
   * ומאפשר לשרשר. המילה השלמה מושמעת תמיד בנפרד אחרי הצלילים,
   * כדי שהמודל הנכון יישמע גם כשהקירובים לא מושלמים.
   */
  soundScript?: string[]
  /** המילה הכתובה שמוצגת בגדול. במשימת קריאה אין השמעה לפני התשובה. */
  showWord?: string
  /** משימת בנייה: מה בונים ומאילו אריחים אפשר לבחור. */
  build?: {
    /** המילה המלאה, כפי שהיא נכתבת. */
    text: string
    /** מזהי הצלילים לפי הסדר הנכון. */
    sounds: string[]
    /** האריחים במגש, מעורבבים, כולל אריחי הסחה. */
    tray: string[]
  }
  /** דורס את האימוג'י במסך המשוב. משמש למשימות שבהן הגיבור הוא אות. */
  feedbackEmoji?: string
}

// ---------------------------------------------------------------- כלי עזר

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickRandom<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

/**
 * בוחר הסחות דעת. אם צוינו מפורשות, משתמש בהן.
 * אחרת בוחר מילים מאותה קטגוריה, כדי שהבחירה תהיה הוגנת ולא מבלבלת.
 */
function resolveDistractors(word: Word, spec: Pick<AreaTaskSpec, 'distractors'>, count: number): Word[] {
  if (spec.distractors && spec.distractors.length > 0) {
    return spec.distractors.slice(0, count).map(getWord)
  }
  const sameCategory = WORDS.filter((w) => w.category === word.category && w.id !== word.id)
  const pool = sameCategory.length >= count ? sameCategory : WORDS.filter((w) => w.id !== word.id)
  return pickRandom(pool, count)
}

/** מקצה צורה שונה לכל אפשרות, לפי מיקומה אחרי הערבוב. */
function withShapes(options: TaskOption[]): TaskOption[] {
  return options.map((o, i) => ({ ...o, shape: SHAPES[i % SHAPES.length] }))
}

let keyCounter = 0
function nextKey(areaId: string, type: string): string {
  keyCounter += 1
  return `${areaId}:${type}:${keyCounter}`
}

// ---------------------------------------------------------------- רמזים

/**
 * סולם הרמזים. שלושה שלבים, מהעדין לברור:
 * 1. בואי נקשיב שוב.
 * 2. חשיפת המשמעות בעברית. זהו הרמז שבאמת מלמד.
 * 3. צמצום האפשרויות לשתיים.
 */
function standardHints(word: Word): string[] {
  return [
    'בואי נקשיב שוב, לאט לאט 👂',
    `רמז: המילה הזאת אומרת "${word.hebrew}"`,
    'השארתי לך רק שתי אפשרויות. את יכולה! 💛',
  ]
}

function letterHints(word: Word): string[] {
  return [
    'בואי נקשיב לצליל של האות שוב 👂',
    `רמז: ${word.sentence ?? word.english}`,
    'השארתי לך רק שתי אותיות. תראי את הצורה שלהן 💛',
  ]
}

function countingHints(word: Word): string[] {
  return [
    'בואי נספור יחד לאט 👂',
    `רמז: המספר הזה הוא ${word.count} בעברית ${word.hebrew}`,
    'השארתי לך רק שתי אפשרויות 💛',
  ]
}

// ---------------------------------------------------------------- מחוללים

function makeListenPickImage(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const distractors = resolveDistractors(word, spec, 3)
  const options: TaskOption[] = shuffle([
    { id: word.id, correct: true, emoji: word.emoji, label: word.hebrew, english: word.english },
    ...distractors.map((d) => ({ id: d.id, correct: false, emoji: d.emoji, label: d.hebrew, english: d.english })),
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'listen-pick-image',
    areaId,
    wordId: word.id,
    promptHe: 'הקשיבי למילה ובחרי את התמונה המתאימה',
    speakOnStart: speakTextFor(word),
    options,
    hints: standardHints(word),
  }
}

function makeColorPick(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const distractors = resolveDistractors(word, spec, 3)
  const options = withShapes(
    shuffle([
      { id: word.id, correct: true, color: word.color, label: word.hebrew, english: word.english },
      ...distractors.map((d) => ({ id: d.id, correct: false, color: d.color, label: d.hebrew, english: d.english })),
    ]),
  )
  return {
    key: nextKey(areaId, spec.type),
    type: 'color-pick',
    areaId,
    wordId: word.id,
    promptHe: 'הקשיבי לשם הצבע ובחרי את הצבע הנכון',
    speakOnStart: speakTextFor(word),
    options,
    hints: standardHints(word),
  }
}

function makeTwoWords(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const other = resolveDistractors(word, spec, 1)[0]
  const options: TaskOption[] = shuffle([
    { id: word.id, correct: true, speak: speakTextFor(word), english: word.english },
    { id: other.id, correct: false, speak: speakTextFor(other), english: other.english },
  ]).map((o, i) => ({ ...o, badge: String(i + 1), label: `אפשרות ${i + 1}` }))
  return {
    key: nextKey(areaId, spec.type),
    type: 'two-words',
    areaId,
    wordId: word.id,
    promptHe: 'לחצי על כל רמקול כדי לשמוע, ואז בחרי את המילה שמתאימה לתמונה',
    stimulus: { emoji: word.emoji, repeat: 1 },
    options,
    hints: [
      'לחצי על שני הרמקולים ותשמעי את ההבדל 👂',
      `רמז: בתמונה יש ${word.hebrew}`,
      'תקשיבי שוב לאפשרות הראשונה ואז לשנייה 💛',
    ],
  }
}

function makeLetterSound(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const distractors = resolveDistractors(word, spec, 2)
  const options: TaskOption[] = shuffle([
    { id: word.id, correct: true, emoji: word.emoji, label: word.hebrew, english: word.english },
    ...distractors.map((d) => ({ id: d.id, correct: false, emoji: d.emoji, label: d.hebrew, english: d.english })),
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'letter-sound',
    areaId,
    wordId: word.id,
    promptHe: 'הקשיבי לצליל של האות ובחרי את האות הנכונה',
    speakOnStart: speakTextFor(word),
    options,
    hints: letterHints(word),
  }
}

function makeCounting(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const variant = spec.variant ?? 'count-objects'
  const emoji = spec.countEmoji ?? '⭐'
  const distractors = resolveDistractors(word, spec, variant === 'hear-number' ? 2 : 3)

  if (variant === 'hear-number') {
    // שומעים מספר באנגלית ובוחרים את הקבוצה עם הכמות המתאימה.
    const options: TaskOption[] = shuffle([
      { id: word.id, correct: true, emoji, repeat: word.count ?? 1, label: `${word.count}` },
      ...distractors.map((d) => ({ id: d.id, correct: false, emoji, repeat: d.count ?? 1, label: `${d.count}` })),
    ])
    return {
      key: nextKey(areaId, spec.type),
      type: 'counting',
      areaId,
      wordId: word.id,
      variant,
      promptHe: 'הקשיבי למספר ובחרי את הקבוצה עם הכמות הנכונה',
      speakOnStart: speakTextFor(word),
      options,
      hints: countingHints(word),
    }
  }

  // סופרים את החפצים ובוחרים את הספרה. אחרי ההצלחה נשמע את המספר באנגלית.
  const options: TaskOption[] = shuffle([
    { id: word.id, correct: true, emoji: word.emoji, label: word.hebrew, english: word.english },
    ...distractors.map((d) => ({ id: d.id, correct: false, emoji: d.emoji, label: d.hebrew, english: d.english })),
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'counting',
    areaId,
    wordId: word.id,
    variant,
    promptHe: 'ספרי כמה יש ובחרי את המספר הנכון',
    stimulus: { emoji, repeat: word.count ?? 1 },
    options,
    hints: countingHints(word),
  }
}

function makeMatch(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const ids = spec.pairWords && spec.pairWords.length >= 2 ? spec.pairWords : [word.id, ...resolveDistractors(word, spec, 2).map((w) => w.id)]
  const pairs: MatchPair[] = ids.map((id) => {
    const w = getWord(id)
    return { id: w.id, english: w.english, hebrew: w.hebrew, emoji: w.emoji, color: w.color }
  })
  return {
    key: nextKey(areaId, spec.type),
    type: 'match-word-object',
    areaId,
    wordId: word.id,
    promptHe: 'לחצי על רמקול כדי לשמוע מילה, ואז לחצי על החפץ שמתאים לה',
    options: [],
    pairs,
    hints: [
      'לחצי על הרמקול ותשמעי את המילה שוב 👂',
      'רמז: מתחת לכל חפץ כתוב מה הוא בעברית',
      'נסי להתחיל מהמילה שהכי קל לך 💛',
    ],
  }
}

/**
 * אתגר המשפטים. שומעים משפט שלם ובוחרים את הסצנה שמתאימה לו.
 * ההסחות הן משפטים אחרים מאותו אזור, ולכן זו בדיקת הבנה אמיתית
 * ולא ניחוש: "Sit down" מול כיסא, אדם עומד וספר פתוח.
 */
function makePhraseMatch(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const distractors = resolveDistractors(word, spec, 2)
  const options: TaskOption[] = shuffle([
    { id: word.id, correct: true, emoji: word.emoji, label: word.hebrew, english: word.english },
    ...distractors.map((d) => ({ id: d.id, correct: false, emoji: d.emoji, label: d.hebrew, english: d.english })),
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'phrase-match',
    areaId,
    wordId: word.id,
    promptHe: 'הקשיבי למשפט ובחרי את התמונה שמתאימה לו',
    speakOnStart: speakTextFor(word),
    options,
    hints: [
      'בואי נקשיב למשפט שוב, לאט לאט 👂',
      `רמז: המשפט אומר "${word.hebrew}"`,
      'השארתי לך רק שתי אפשרויות 💛',
    ],
  }
}

/**
 * גדול וקטן. אותו עצם בדיוק, בשני גדלים, כדי שהבחירה תהיה על גודל
 * ולא על צורה או צבע. התוויות בעברית נשארות כדי שלא נסתמך על הגודל בלבד.
 */
function makeSizePick(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const other = resolveDistractors(word, spec, 1)[0]
  const scaleFor = (w: Word): number => (w.sizeHint === 'small' ? 0.5 : 1.5)
  const options = shuffle([
    { id: word.id, correct: true, emoji: word.emoji, label: word.hebrew, english: word.english, scale: scaleFor(word) },
    { id: other.id, correct: false, emoji: word.emoji, label: other.hebrew, english: other.english, scale: scaleFor(other) },
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'size-pick',
    areaId,
    wordId: word.id,
    promptHe: 'הקשיבי ובחרי: גדול או קטן',
    speakOnStart: speakTextFor(word),
    options,
    hints: standardHints(word),
  }
}

function makeSayIt(areaId: string, _spec: AreaTaskSpec, word: Word): Task {
  return {
    key: nextKey(areaId, 'say-it'),
    type: 'say-it',
    areaId,
    wordId: word.id,
    promptHe: 'הקשיבי למילה, אמרי אותה בקול, ואז לחצי על הכפתור',
    speakOnStart: speakTextFor(word),
    stimulus: { emoji: word.emoji, repeat: 1 },
    options: [],
    hints: ['בואי נשמע שוב 👂', `המילה הזאת אומרת "${word.hebrew}"`, 'אין כאן טעויות, פשוט תגידי אותה בקול 💛'],
  }
}

// ------------------------------------------------------- מחוללי הקריאה

/**
 * הסחות לצליל. ברירת המחדל היא צלילים מאותה קבוצת הוראה או מוקדמת
 * ממנה, כי אין טעם לבלבל עם אות שעוד לא נלמדה.
 */
function resolvePhonemeDistractors(target: Phoneme, spec: AreaTaskSpec, count: number): Phoneme[] {
  if (spec.distractors && spec.distractors.length > 0) {
    return spec.distractors.slice(0, count).map(getPhoneme)
  }
  const pool = PHONEMES.filter((p) => p.id !== target.id && p.set <= target.set && p.grapheme !== target.grapheme)
  return pickRandom(pool, count)
}

/**
 * הסחות למשימת קריאה. הבחירה כאן קריטית: אם ההסחות רחוקות,
 * אפשר לנחות על התשובה מהתמונה בלי לפענח שום דבר. לכן מעדיפים
 * מילים באותו אורך, ואם אפשר כאלה שנבדלות בצליל אחד בלבד.
 */
function resolveReadingDistractors(word: DecodableWord, spec: AreaTaskSpec, count: number): Word[] {
  if (spec.distractors && spec.distractors.length > 0) {
    return spec.distractors.slice(0, count).map(getWord)
  }
  const others = WORDS.filter((w): w is DecodableWord => w.id !== word.id && Array.isArray(w.sounds) && w.sounds.length > 0)
  const differsByOne = others.filter(
    (w) => w.sounds.length === word.sounds.length && w.sounds.filter((s, i) => s !== word.sounds[i]).length === 1,
  )
  const sameLength = others.filter((w) => w.sounds.length === word.sounds.length)
  const pool = differsByOne.length >= count ? differsByOne : sameLength.length >= count ? sameLength : others
  return pickRandom(pool, count)
}

function soundHints(word: DecodableWord): string[] {
  return [
    'בואי נשמע את הצלילים אחד אחד, לאט 👂',
    `רמז: המילה הזאת אומרת "${word.hebrew}"`,
    'השארתי לך רק שתי אפשרויות. את יכולה! 💛',
  ]
}

/** צליל בודד ← האות שמייצגת אותו. הבסיס של הכל. */
function makeSoundToLetter(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const phoneme = getPhoneme(spec.phoneme ?? '')
  const distractors = resolvePhonemeDistractors(phoneme, spec, 2)
  const options: TaskOption[] = shuffle([
    { id: phoneme.id, correct: true, emoji: phoneme.grapheme, label: phoneme.hebrew },
    ...distractors.map((d) => ({ id: d.id, correct: false, emoji: d.grapheme, label: d.hebrew })),
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'sound-to-letter',
    areaId,
    wordId: word.id,
    promptHe: 'הקשיבי לצליל ובחרי את האות שעושה אותו',
    soundScript: [phoneme.say],
    options,
    feedbackEmoji: phoneme.grapheme,
    hints: [
      'בואי נשמע את הצליל שוב 👂',
      `רמז: זה הצליל שפותח את המילה ${word.english}`,
      'השארתי לך רק שתי אותיות 💛',
    ],
  }
}

/** שומעים את המילה מפורקת לצלילים ובוחרים תמונה. שרשור באוזן, בלי כתב. */
function makeSoundOut(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const target = getDecodable(word.id)
  const distractors = resolveReadingDistractors(target, spec, 2)
  const options: TaskOption[] = shuffle([
    { id: target.id, correct: true, emoji: target.emoji, label: target.hebrew, english: target.english },
    ...distractors.map((d) => ({ id: d.id, correct: false, emoji: d.emoji, label: d.hebrew, english: d.english })),
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'sound-out',
    areaId,
    wordId: target.id,
    promptHe: 'הקשיבי לצלילים, חברי אותם למילה, ובחרי את התמונה',
    soundScript: blendScript(target),
    options,
    hints: soundHints(target),
  }
}

/**
 * בניית המילה מאריחי צליל.
 *
 * זו המשימה היחידה במשחק שבה דניאל מייצרת משהו במקום לבחור מתוך רשימה.
 * אין כאן אפשרויות מוכנות, ולכן אי אפשר לפסול ולנחש: או שהיא יודעת
 * אילו צלילים מרכיבים את המילה ובאיזה סדר, או שלא.
 */
function makeBlendBuild(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const target = getDecodable(word.id)
  const extras = spec.extraTiles ?? defaultExtraTiles(target, 2)
  return {
    key: nextKey(areaId, spec.type),
    type: 'blend-build',
    areaId,
    wordId: target.id,
    promptHe: 'הקשיבי למילה ובני אותה מהצלילים, לפי הסדר',
    speakOnStart: speakTextFor(target),
    soundScript: blendScript(target),
    stimulus: { emoji: target.emoji, repeat: 1 },
    options: [],
    build: {
      text: target.english.toLowerCase(),
      sounds: target.sounds,
      tray: shuffle([...target.sounds, ...extras]),
    },
    hints: [
      'בואי נשמע את הצלילים אחד אחד. כל צליל הוא אריח 👂',
      'שמתי לך את האריח הראשון במקום',
      'השארתי לך רק אריח אחד להשלים. את כמעט שם 💛',
    ],
  }
}

/** אריחי הסחה: צלילים שלא נמצאים במילה, מתוך מה שכבר נלמד. */
function defaultExtraTiles(word: DecodableWord, count: number): string[] {
  const inWord = new Set(word.sounds)
  const maxSet = Math.max(...word.sounds.map((s) => getPhoneme(s).set))
  const pool = PHONEMES.filter((p) => !inWord.has(p.id) && p.set <= maxSet)
  return pickRandom(pool, count).map((p) => p.id)
}

/**
 * קריאה אמיתית: המילה מוצגת כתובה ולא מושמעת.
 *
 * זו הסיבה שאין כאן speakOnStart. ברגע שהמילה נשמעת, המשימה חוזרת
 * להיות זיהוי בשמיעה, וזה בדיוק מה שהמשחק כבר יודע לעשות. ההשמעה
 * מגיעה רק אחרי התשובה, כפרס ואישור.
 */
function makeReadWord(areaId: string, spec: AreaTaskSpec, word: Word): Task {
  const target = getDecodable(word.id)
  const distractors = resolveReadingDistractors(target, spec, 2)
  const options: TaskOption[] = shuffle([
    { id: target.id, correct: true, emoji: target.emoji, label: target.hebrew, english: target.english },
    ...distractors.map((d) => ({ id: d.id, correct: false, emoji: d.emoji, label: d.hebrew, english: d.english })),
  ])
  return {
    key: nextKey(areaId, spec.type),
    type: 'read-word',
    areaId,
    wordId: target.id,
    promptHe: 'קראי את המילה בעצמך ובחרי את התמונה שמתאימה לה',
    showWord: target.english.toLowerCase(),
    soundScript: blendScript(target),
    options,
    hints: [
      'תעברי על האותיות אחת אחת ותגידי כל צליל בקול 👂',
      'לחצי על הכפתור ואני אשרשר לך את הצלילים',
      'השארתי לך רק שתי אפשרויות 💛',
    ],
  }
}

// ---------------------------------------------------------------- API

export function createTask(areaId: string, spec: AreaTaskSpec): Task {
  const word = getWord(spec.word)
  switch (spec.type) {
    case 'listen-pick-image':
      return makeListenPickImage(areaId, spec, word)
    case 'color-pick':
      return makeColorPick(areaId, spec, word)
    case 'two-words':
      return makeTwoWords(areaId, spec, word)
    case 'letter-sound':
      return makeLetterSound(areaId, spec, word)
    case 'counting':
      return makeCounting(areaId, spec, word)
    case 'match-word-object':
      return makeMatch(areaId, spec, word)
    case 'phrase-match':
      return makePhraseMatch(areaId, spec, word)
    case 'size-pick':
      return makeSizePick(areaId, spec, word)
    case 'say-it':
      return makeSayIt(areaId, spec, word)
    case 'sound-to-letter':
      return makeSoundToLetter(areaId, spec, word)
    case 'sound-out':
      return makeSoundOut(areaId, spec, word)
    case 'blend-build':
      return makeBlendBuild(areaId, spec, word)
    case 'read-word':
      return makeReadWord(areaId, spec, word)
  }
}

/**
 * בונה משימת חזרה על מילה שנטעו בה, בסוג משימה שונה מזה שבו נטעתה,
 * כדי שהחזרה לא תרגיש כמו אותו מסך בדיוק.
 */
export function createPracticeTask(areaId: string, wordId: string, avoidType?: TaskType): Task {
  const word = getWord(wordId)
  // חזרה דרך קריאה מותרת רק באזור שמלמד קריאה. למילה כמו red יש פירוק
  // לצלילים, אבל בגן הצבעים דניאל עוד לא ראתה אף אריח צליל, ומשימת
  // קריאה שם הייתה מבקשת ממנה משהו שאף אחד עוד לא לימד אותה.
  const readingArea = findArea(areaId)?.phonicsSet !== undefined
  const candidates: TaskType[] =
    readingArea && Array.isArray(word.sounds) && word.sounds.length > 0
      ? ['read-word', 'blend-build', 'sound-out']
      : word.category === 'letters'
      ? ['letter-sound']
      : word.category === 'numbers'
        ? ['counting', 'listen-pick-image']
        : word.category === 'colors'
          ? ['color-pick', 'two-words', 'say-it']
          : word.category === 'phrases'
            ? ['phrase-match', 'say-it']
            : word.sizeHint
              ? ['size-pick', 'say-it']
              : ['listen-pick-image', 'two-words', 'say-it']

  const usable = candidates.filter((t) => t !== avoidType)
  const type = (usable.length > 0 ? usable : candidates)[Math.floor(Math.random() * (usable.length > 0 ? usable.length : candidates.length))]

  const spec: AreaTaskSpec = { type, word: wordId }
  const task = createTask(areaId, spec)
  task.isPractice = true
  return task
}
