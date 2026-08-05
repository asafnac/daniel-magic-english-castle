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
  /**
   * למשימת צליל-לאות: מזהה הצליל הנלמד, מתוך phonics.ts.
   * שדה word ממשיך להצביע על מילת העוגן שמדגימה את הצליל.
   */
  phoneme?: string
  /** למשימת בנייה: אריחי הסחה מפורשים. אם לא צוינו, נבחרים אוטומטית. */
  extraTiles?: string[]
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
  /**
   * אזור שמלמד לקרוא, ואיזו קבוצת צלילים הוא מלמד.
   * אזור בלי השדה הזה הוא אזור שמיעה בלבד, ולא יציג בו שום משימת קריאה,
   * גם לא כמשימת חזרה.
   */
  phonicsSet?: 1 | 2 | 3
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
    words: ['cat', 'dog', 'bird', 'fish', 'horse', 'rabbit', 'lion', 'monkey', 'cow', 'duck'],
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
      // חיות החווה מתוכנית Jet. cat, dog, bird ו-horse כבר נלמדו למעלה,
      // ולכן כאן נוספות רק החיות החדשות והמשפטים.
      { type: 'listen-pick-image', word: 'cow', distractors: ['horse', 'duck', 'dog'] },
      { type: 'two-words', word: 'duck', distractors: ['bird'] },
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

  // ============================================================
  //  האזורים הבאים מגיעים מתוכנית הלימודים של Jet, רמת Pre-A1.
  //  הם נוספו בסוף ולא באמצע במכוון: הסדר קובע את הפריסה בעולם
  //  ואת שרשרת הפתיחה, ושינוי הסדר של אזור קיים היה מבלבל את
  //  ההתקדמות שדניאל כבר אספה.
  // ============================================================

  // ======================= 6. שער הידידות =======================
  {
    id: 'friends-gate',
    order: 6,
    title: 'שער הידידות',
    emoji: '👋',
    accent: '#f2a65a',
    intro: 'שלום דניאל! אני נוגה. כאן לומדים איך אומרים שלום ואיך מכירים חברים חדשים.',
    done: 'עכשיו את יודעת להגיד שלום באנגלית! הדרך לבית פתוחה.',
    guide: { name: 'נוגה השומרת', emoji: '🧡' },
    words: ['hello', 'goodbye', 'boy', 'girl', 'name', 'yes', 'no'],
    tasks: [
      { type: 'listen-pick-image', word: 'hello', distractors: ['goodbye', 'yes'] },
      { type: 'two-words', word: 'goodbye', distractors: ['hello'] },
      { type: 'listen-pick-image', word: 'girl', distractors: ['boy', 'baby', 'mother'] },
      { type: 'listen-pick-image', word: 'boy', distractors: ['girl', 'baby', 'father'] },
      { type: 'two-words', word: 'yes', distractors: ['no'] },
      { type: 'listen-pick-image', word: 'no', distractors: ['yes', 'hello', 'goodbye'] },
      { type: 'say-it', word: 'name' },
      { type: 'phrase-match', word: 'phrase_i_am_a_girl', distractors: ['phrase_i_am_a_boy', 'phrase_this_is_my_mother'] },
      { type: 'phrase-match', word: 'phrase_i_am_a_boy', distractors: ['phrase_i_am_a_girl', 'phrase_a_big_house'] },
      { type: 'say-it', word: 'phrase_whats_your_name' },
    ],
  },

  // ======================= 7. אגף הבית =======================
  {
    id: 'family-wing',
    order: 7,
    title: 'אגף הבית',
    emoji: '🏠',
    accent: '#7ec8a9',
    intro: 'ברוכה הבאה הביתה! אני מיץ׳. כאן גרה המשפחה, ולומדים איך קוראים לכולם באנגלית.',
    done: 'כל המשפחה מחייכת! בואי נמשיך לגן ההפכים.',
    guide: { name: 'מיץ׳ החתולה', emoji: '🐈' },
    words: ['mother', 'father', 'brother', 'sister', 'baby', 'house'],
    tasks: [
      { type: 'listen-pick-image', word: 'mother', distractors: ['father', 'sister', 'baby'] },
      { type: 'listen-pick-image', word: 'father', distractors: ['mother', 'brother', 'boy'] },
      { type: 'two-words', word: 'brother', distractors: ['sister'] },
      { type: 'listen-pick-image', word: 'sister', distractors: ['brother', 'mother', 'baby'] },
      { type: 'listen-pick-image', word: 'baby', distractors: ['boy', 'girl', 'mother'] },
      { type: 'listen-pick-image', word: 'house', distractors: ['door', 'tree', 'classroom'] },
      { type: 'say-it', word: 'house' },
      { type: 'match-word-object', word: 'mother', pairWords: ['mother', 'father', 'baby'] },
      { type: 'phrase-match', word: 'phrase_this_is_my_mother', distractors: ['phrase_a_big_house', 'phrase_i_am_a_boy'] },
    ],
  },

  // ======================= 8. גן ההפכים =======================
  // התוכן הזה קיבל אזור נפרד ולא נדחס לאגף הבית, כי אזור של שלוש עשרה
  // משימות מתחיל לעייף ילדה בת שמונה, וזה בדיוק מה שגורם לה להפסיק.
  {
    id: 'opposites-garden',
    order: 8,
    title: 'גן ההפכים',
    emoji: '🎭',
    accent: '#c79bea',
    intro: 'היי! אני זוזו. בגן שלי כל דבר בא בזוגות: גדול וקטן, שמח ועצוב.',
    done: 'למדת את כל ההפכים! נשארה רק הכיתה.',
    guide: { name: 'זוזו הפנדה', emoji: '🐼' },
    words: ['big', 'small', 'happy', 'sad'],
    tasks: [
      { type: 'size-pick', word: 'big', distractors: ['small'] },
      { type: 'size-pick', word: 'small', distractors: ['big'] },
      { type: 'two-words', word: 'happy', distractors: ['sad'] },
      { type: 'listen-pick-image', word: 'sad', distractors: ['happy', 'baby', 'girl'] },
      { type: 'say-it', word: 'happy' },
      { type: 'phrase-match', word: 'phrase_a_big_house', distractors: ['phrase_this_is_my_mother', 'phrase_a_happy_dog'] },
      { type: 'phrase-match', word: 'phrase_a_happy_dog', distractors: ['phrase_the_cow_is_big', 'phrase_a_big_house'] },
      { type: 'phrase-match', word: 'phrase_the_cow_is_big', distractors: ['phrase_a_happy_dog', 'phrase_a_big_house'] },
    ],
  },

  // ======================= 9. כיתת הקסם =======================
  {
    id: 'magic-classroom',
    order: 9,
    title: 'כיתת הקסם',
    emoji: '🎒',
    accent: '#6aa9dd',
    intro: 'שלום! אני מר בלוט, המורה כאן. בואי נלמד מה יש בכיתה ובתיק.',
    done: 'כל הכבוד! עכשיו נפתח מגדל הצלילים, ושם לומדים לקרוא באמת.',
    guide: { name: 'מר בלוט המורה', emoji: '🌰' },
    words: ['bag', 'pen', 'pencil', 'teacher', 'classroom', 'sit', 'stand', 'book'],
    tasks: [
      { type: 'listen-pick-image', word: 'bag', distractors: ['book', 'pencil', 'house'] },
      { type: 'two-words', word: 'pen', distractors: ['pencil'] },
      { type: 'listen-pick-image', word: 'pencil', distractors: ['pen', 'book', 'bag'] },
      { type: 'listen-pick-image', word: 'teacher', distractors: ['mother', 'girl', 'boy'] },
      { type: 'listen-pick-image', word: 'classroom', distractors: ['house', 'door', 'bag'] },
      { type: 'two-words', word: 'sit', distractors: ['stand'] },
      { type: 'say-it', word: 'stand' },
      { type: 'match-word-object', word: 'bag', pairWords: ['bag', 'pencil', 'book'] },
      { type: 'phrase-match', word: 'phrase_sit_down', distractors: ['phrase_stand_up', 'phrase_open_your_book'] },
      { type: 'phrase-match', word: 'phrase_open_your_book', distractors: ['phrase_sit_down', 'phrase_stand_up'] },
      // המשפטים האלה מחברים מספר, צבע וחפץ מהכיתה, ולכן הם מסכמים
      // גם את גן הצבעים וגם את מגדל המספרים בלי ללמד אותם מחדש.
      { type: 'phrase-match', word: 'phrase_one_red_pencil', distractors: ['phrase_three_blue_bags', 'phrase_open_your_book'] },
      { type: 'phrase-match', word: 'phrase_three_blue_bags', distractors: ['phrase_one_red_pencil', 'phrase_sit_down'] },
    ],
  },

  // ==================== 10. מגדל הצלילים ====================
  // כאן המשחק מפסיק ללמד לזהות מילים ומתחיל ללמד לקרוא אותן.
  // הצלילים s a t p i n נבחרו כי מהם לבד אפשר לבנות מילים אמיתיות
  // כבר במשימה הראשונה. אלפביתי היה דוחה את זה עד סוף האלפבית.
  {
    id: 'sound-tower',
    order: 10,
    title: 'מגדל הצלילים',
    emoji: '🔮',
    accent: '#c98adf',
    phonicsSet: 1,
    intro: 'אני מרלינה, שומרת הצלילים. עד היום שמעת מילים. עכשיו נלמד לבנות אותן מצלילים, ואז תוכלי לקרוא אותן לבד.',
    done: 'עשית את זה! בנית מילים מצלילים וקראת אותן בעצמך. זו קריאה אמיתית.',
    guide: { name: 'מרלינה שומרת הצלילים', emoji: '🧙‍♀️' },
    words: ['sit', 'ant', 'tap', 'pan', 'pin', 'nap', 'tin', 'spin'],
    tasks: [
      { type: 'sound-to-letter', word: 'sit', phoneme: 's', distractors: ['a', 't'] },
      { type: 'sound-to-letter', word: 'ant', phoneme: 'a', distractors: ['i', 's'] },
      { type: 'sound-to-letter', word: 'tap', phoneme: 't', distractors: ['p', 'n'] },
      { type: 'sound-to-letter', word: 'pan', phoneme: 'p', distractors: ['t', 's'] },
      { type: 'sound-to-letter', word: 'pin', phoneme: 'i', distractors: ['a', 'n'] },
      { type: 'sound-to-letter', word: 'nap', phoneme: 'n', distractors: ['s', 't'] },
      // שרשור באוזן קודם, ורק אחריו שרשור בעיניים. קל יותר לחבר
      // צלילים ששומעים מאשר צלילים שצריך קודם לפענח מהכתב.
      { type: 'sound-out', word: 'pin', distractors: ['pan', 'tin'] },
      { type: 'blend-build', word: 'ant', extraTiles: ['s', 'p'] },
      { type: 'blend-build', word: 'tap', extraTiles: ['i', 'n'] },
      { type: 'read-word', word: 'pin', distractors: ['pan', 'tin'] },
      { type: 'read-word', word: 'nap', distractors: ['tap', 'pan'] },
    ],
  },

  // ==================== 11. אולם הלחשים ====================
  {
    id: 'spell-hall',
    order: 11,
    title: 'אולם הלחשים',
    emoji: '📜',
    accent: '#e0a13c',
    phonicsSet: 2,
    intro: 'שישה צלילים חדשים מחכים לך כאן, וכל אחד מהם פותח עוד מילים שתוכלי לקרוא.',
    done: 'מדהים! עכשיו את קוראת גם cat, גם dog וגם עוד הרבה.',
    guide: { name: 'ספרן הלחשים', emoji: '🦉' },
    words: ['map', 'pot', 'cat', 'dog', 'pig', 'kid', 'cap', 'dig'],
    tasks: [
      { type: 'sound-to-letter', word: 'map', phoneme: 'm', distractors: ['n', 's'] },
      // d מול t היא הבחנה שקל להחמיץ, ולכן היא מתורגלת במפורש
      { type: 'sound-to-letter', word: 'dig', phoneme: 'd', distractors: ['t', 'p'] },
      { type: 'sound-to-letter', word: 'pig', phoneme: 'g', distractors: ['d', 'p'] },
      { type: 'sound-to-letter', word: 'pot', phoneme: 'o', distractors: ['a', 'i'] },
      // c ו-k עושים את אותו צליל בדיוק, ולכן אף פעם לא זה מול זה:
      // זו הייתה שאלה בלי תשובה נכונה אחת.
      { type: 'sound-to-letter', word: 'cat', phoneme: 'c', distractors: ['g', 't'] },
      { type: 'sound-to-letter', word: 'kid', phoneme: 'k', distractors: ['t', 'd'] },
      { type: 'sound-out', word: 'cat', distractors: ['cap', 'pot'] },
      { type: 'blend-build', word: 'map', extraTiles: ['t', 'i'] },
      { type: 'blend-build', word: 'pig', extraTiles: ['a', 'm'] },
      // cat מול cap נבדלות בצליל אחד בלבד, ולכן אי אפשר לנחש מהתמונה
      { type: 'read-word', word: 'cat', distractors: ['cap', 'pan'] },
      { type: 'read-word', word: 'dog', distractors: ['dig', 'pig'] },
    ],
  },

  // ==================== 12. חדר הכתר ====================
  {
    id: 'rune-room',
    order: 12,
    title: 'חדר הכתר',
    emoji: '👑',
    accent: '#5ec8b0',
    phonicsSet: 3,
    intro: 'שבעת הצלילים האחרונים. אחריהם תוכלי לקרוא לבד עשרות מילים באנגלית.',
    done: 'סיימת את כל הטירה, ואת יודעת לקרוא. זה הדבר הכי גדול שלמדת כאן.',
    guide: { name: 'שומר הכתר', emoji: '🦄' },
    words: ['bed', 'bus', 'hat', 'run', 'leg', 'hen', 'cup', 'net', 'fan', 'frog'],
    tasks: [
      { type: 'sound-to-letter', word: 'bed', phoneme: 'e', distractors: ['a', 'i'] },
      { type: 'sound-to-letter', word: 'bus', phoneme: 'u', distractors: ['o', 'a'] },
      { type: 'sound-to-letter', word: 'run', phoneme: 'r', distractors: ['n', 'm'] },
      { type: 'sound-to-letter', word: 'hat', phoneme: 'h', distractors: ['f', 's'] },
      { type: 'sound-to-letter', word: 'bat', phoneme: 'b', distractors: ['d', 'p'] },
      { type: 'sound-to-letter', word: 'fan', phoneme: 'f', distractors: ['s', 'h'] },
      { type: 'sound-to-letter', word: 'leg', phoneme: 'l', distractors: ['r', 'n'] },
      { type: 'sound-out', word: 'hen', distractors: ['hat', 'net'] },
      { type: 'blend-build', word: 'bed', extraTiles: ['t', 'u'] },
      // ארבעה צלילים, כולל צרור עיצורים. זה השיא של האזור.
      { type: 'blend-build', word: 'frog', extraTiles: ['a', 'p'] },
      { type: 'read-word', word: 'cup', distractors: ['cap', 'cat'] },
      { type: 'read-word', word: 'bus', distractors: ['bat', 'bed'] },
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
