/**
 * מאגר המילים של המשחק.
 *
 * זהו הקובץ היחיד שצריך לערוך כדי להוסיף, לשנות או להסיר מילה.
 * מנוע המשחק לא מכיר אף מילה ספציפית, הוא רק קורא מהמאגר הזה.
 *
 * להוספת מילה חדשה: מוסיפים אובייקט אחד למערך WORDS, ואז מוסיפים
 * את ה-id שלה לרשימת המילים של אזור כלשהו ב-areas.ts.
 */

export type Category =
  | 'colors'
  | 'animals'
  | 'food'
  | 'numbers'
  | 'letters'
  | 'objects'
  | 'greetings'
  | 'family'
  | 'school'
  | 'describing'
  | 'phrases'
  /** מילים קצרות שנועדו לפענוח בקריאה, לא לשינון בשמיעה. */
  | 'sounds'
  /** מילות חיבור שאין להן תמונה, ומשמעותן נובעת ממקומן במשפט. */
  | 'grammar'
  /** מילים שההורה הוסיף, למשל הכתבה מבית הספר. */
  | 'custom'

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
  /**
   * מזהה הקלטה. כרגע כל המילים מוקראות בקריינות הדפדפן, וזה עובד
   * בלי אף קובץ. אם בעתיד תהיה הקלטה אמיתית של מורה, מוסיפים אותה
   * ל-RECORDED_AUDIO ב-audio.ts תחת המזהה הזה, והמשחק יעדיף אותה
   * על הקריינות הסינתטית בלי שינוי קוד.
   */
  audioKey?: string
  /**
   * למילות גודל: באיזה קנה מידה להציג את האימוג'י.
   * כך "גדול" ו"קטן" הם אותו עצם בשני גדלים, וזה מלמד גודל ולא צורה.
   */
  sizeHint?: 'big' | 'small'
  /**
   * פירוק המילה לצלילים, לפי מזהי הפונמות ב-phonics.ts.
   * מילה עם פירוק היא מילה שאפשר לפענח, כלומר לקרוא בשרשור צלילים
   * במקום לזהות בעל פה. הפירוק חייב להרכיב בדיוק את האיות, ויש
   * בדיקה עצמית שמוודאת את זה.
   *
   * לא לכל מילה יש פירוק, ובכוונה: "orange" נלמדת בשמיעה בשלב הזה
   * ולא בקריאה, כי היא לא ניתנת לפענוח עם הצלילים שכבר נלמדו.
   */
  sounds?: string[]
}

export const WORDS: Word[] = [
  // ---------- צבעים ----------
  { id: 'red', english: 'red', hebrew: 'אדום', category: 'colors', difficulty: 1, emoji: '🔴', color: '#e8443a', sounds: ['r','e','d'] },
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
  { id: 'sun', english: 'sun', hebrew: 'שמש', category: 'objects', difficulty: 1, emoji: '☀️', sounds: ['s','u','n'] },
  { id: 'moon', english: 'moon', hebrew: 'ירח', category: 'objects', difficulty: 2, emoji: '🌙' },
  { id: 'crown', english: 'crown', hebrew: 'כתר', category: 'objects', difficulty: 2, emoji: '👑' },

  // ---------- חיות ----------
  { id: 'cat', english: 'cat', hebrew: 'חתול', category: 'animals', difficulty: 1, emoji: '🐱', sounds: ['c','a','t'] },
  { id: 'dog', english: 'dog', hebrew: 'כלב', category: 'animals', difficulty: 1, emoji: '🐶', sounds: ['d','o','g'] },
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
  { id: 'ten', english: 'ten', hebrew: 'עשר', category: 'numbers', difficulty: 2, emoji: '🔟', count: 10, sounds: ['t','e','n'] },

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

  // ============================================================
  //  תוכנית הלימודים של Jet, רמת Pre-A1
  //  ה-visualHint מהסילבוס הומר לאימוג'י של מערכת ההפעלה,
  //  כדי לשמור על משחק בלי אף נכס חיצוני.
  // ============================================================

  // ---------- Jet 1: נימוסים והיכרות ----------
  { id: 'hello', english: 'hello', hebrew: 'שלום', category: 'greetings', difficulty: 1, emoji: '👋', audioKey: 'hello' },
  { id: 'goodbye', english: 'goodbye', hebrew: 'להתראות', category: 'greetings', difficulty: 1, emoji: '🙋', audioKey: 'goodbye' },
  { id: 'yes', english: 'yes', hebrew: 'כן', category: 'greetings', difficulty: 1, emoji: '✅', audioKey: 'yes' },
  { id: 'no', english: 'no', hebrew: 'לא', category: 'greetings', difficulty: 1, emoji: '❌', audioKey: 'no' },
  { id: 'name', english: 'name', hebrew: 'שם', category: 'greetings', difficulty: 2, emoji: '🏷️', audioKey: 'name' },
  { id: 'boy', english: 'boy', hebrew: 'ילד', category: 'family', difficulty: 1, emoji: '👦', audioKey: 'boy' },
  { id: 'girl', english: 'girl', hebrew: 'ילדה', category: 'family', difficulty: 1, emoji: '👧', audioKey: 'girl' },

  // ---------- Jet 2: הבית והמשפחה ----------
  { id: 'mother', english: 'mother', hebrew: 'אמא', category: 'family', difficulty: 1, emoji: '👩', audioKey: 'mother' },
  { id: 'father', english: 'father', hebrew: 'אבא', category: 'family', difficulty: 1, emoji: '👨', audioKey: 'father' },
  { id: 'brother', english: 'brother', hebrew: 'אח', category: 'family', difficulty: 2, emoji: '🧒', audioKey: 'brother' },
  { id: 'sister', english: 'sister', hebrew: 'אחות', category: 'family', difficulty: 2, emoji: '👧🏻', audioKey: 'sister' },
  { id: 'baby', english: 'baby', hebrew: 'תינוק', category: 'family', difficulty: 1, emoji: '👶', audioKey: 'baby' },
  { id: 'house', english: 'house', hebrew: 'בית', category: 'objects', difficulty: 1, emoji: '🏠', audioKey: 'house' },
  // גדול וקטן חייבים להיות אותו עצם בשני גדלים, אחרת זה מלמד צורה ולא גודל.
  // שני אימוג'ים שונים שמוצגים באותו גודל גופן נראים פשוט כשני דברים שונים.
  { id: 'big', english: 'big', hebrew: 'גדול', category: 'describing', difficulty: 1, emoji: '🔵', audioKey: 'big', sizeHint: 'big', sounds: ['b','i','g'] },
  { id: 'small', english: 'small', hebrew: 'קטן', category: 'describing', difficulty: 1, emoji: '🔵', audioKey: 'small', sizeHint: 'small' },
  { id: 'happy', english: 'happy', hebrew: 'שמח', category: 'describing', difficulty: 1, emoji: '😊', audioKey: 'happy' },
  { id: 'sad', english: 'sad', hebrew: 'עצוב', category: 'describing', difficulty: 1, emoji: '😢', audioKey: 'sad', sounds: ['s','a','d'] },

  // ---------- Jet 3: בית הספר ----------
  { id: 'bag', english: 'bag', hebrew: 'תיק', category: 'school', difficulty: 1, emoji: '🎒', audioKey: 'bag', sounds: ['b','a','g'] },
  { id: 'pen', english: 'pen', hebrew: 'עט', category: 'school', difficulty: 2, emoji: '🖊️', audioKey: 'pen', sounds: ['p','e','n'] },
  { id: 'pencil', english: 'pencil', hebrew: 'עיפרון', category: 'school', difficulty: 2, emoji: '✏️', audioKey: 'pencil' },
  { id: 'teacher', english: 'teacher', hebrew: 'מורה', category: 'school', difficulty: 2, emoji: '👩‍🏫', audioKey: 'teacher' },
  { id: 'classroom', english: 'classroom', hebrew: 'כיתה', category: 'school', difficulty: 3, emoji: '🏫', audioKey: 'classroom' },
  { id: 'sit', english: 'sit', hebrew: 'לשבת', category: 'school', difficulty: 2, emoji: '🪑', audioKey: 'sit', sounds: ['s','i','t'] },
  { id: 'stand', english: 'stand', hebrew: 'לעמוד', category: 'school', difficulty: 2, emoji: '🧍', audioKey: 'stand' },

  // ---------- Jet 5: חיות החווה ----------
  { id: 'cow', english: 'cow', hebrew: 'פרה', category: 'animals', difficulty: 1, emoji: '🐄', audioKey: 'cow' },
  { id: 'duck', english: 'duck', hebrew: 'ברווז', category: 'animals', difficulty: 1, emoji: '🦆', audioKey: 'duck' },

  // ---------- מילים לפענוח ----------
  // המילים האלה לא נועדו להישמע ולהיזכר, אלא להיקרא. לכל אחת פירוק
  // לצלילים, וכולן נבנות רק מהצלילים שכבר נלמדו. הן קצרות בכוונה:
  // מילה בת שלושה צלילים היא המקום שבו שרשור מצליח בפעם הראשונה.
  //
  // חלקן זוגות מינימליים בכוונה תחילה - cat מול cap מול cup - כי רק
  // כשההבדל בין שתי מילים הוא צליל אחד, ניחוש לפי התמונה מפסיק לעבוד
  // וצריך באמת לפענח.

  // צלילי קבוצה 1: s a t p i n
  { id: 'ant', english: 'ant', hebrew: 'נמלה', category: 'sounds', difficulty: 1, emoji: '🐜', sounds: ['a', 'n', 't'] },
  { id: 'pin', english: 'pin', hebrew: 'סיכה', category: 'sounds', difficulty: 1, emoji: '📌', sounds: ['p', 'i', 'n'] },
  { id: 'pan', english: 'pan', hebrew: 'מחבת', category: 'sounds', difficulty: 1, emoji: '🍳', sounds: ['p', 'a', 'n'] },
  { id: 'tap', english: 'tap', hebrew: 'ברז', category: 'sounds', difficulty: 1, emoji: '🚰', sounds: ['t', 'a', 'p'] },
  { id: 'nap', english: 'nap', hebrew: 'תנומה', category: 'sounds', difficulty: 1, emoji: '😴', sounds: ['n', 'a', 'p'] },
  { id: 'tin', english: 'tin', hebrew: 'פחית', category: 'sounds', difficulty: 1, emoji: '🥫', sounds: ['t', 'i', 'n'] },
  { id: 'spin', english: 'spin', hebrew: 'להסתובב', category: 'sounds', difficulty: 2, emoji: '🌀', sounds: ['s', 'p', 'i', 'n'] },

  // צלילי קבוצה 2: m d g o c k
  { id: 'map', english: 'map', hebrew: 'מפה', category: 'sounds', difficulty: 1, emoji: '🗺️', sounds: ['m', 'a', 'p'] },
  { id: 'pot', english: 'pot', hebrew: 'סיר', category: 'sounds', difficulty: 1, emoji: '🍲', sounds: ['p', 'o', 't'] },
  { id: 'man', english: 'man', hebrew: 'איש', category: 'sounds', difficulty: 1, emoji: '👨', sounds: ['m', 'a', 'n'] },
  { id: 'cap', english: 'cap', hebrew: 'כובע מצחייה', category: 'sounds', difficulty: 1, emoji: '🧢', sounds: ['c', 'a', 'p'] },
  { id: 'kid', english: 'kid', hebrew: 'ילדה', category: 'sounds', difficulty: 1, emoji: '🧒', sounds: ['k', 'i', 'd'] },
  { id: 'pig', english: 'pig', hebrew: 'חזיר', category: 'sounds', difficulty: 1, emoji: '🐷', sounds: ['p', 'i', 'g'] },
  { id: 'dig', english: 'dig', hebrew: 'לחפור', category: 'sounds', difficulty: 1, emoji: '⛏️', sounds: ['d', 'i', 'g'] },

  // צלילי קבוצה 3: e u r h b f l
  { id: 'bed', english: 'bed', hebrew: 'מיטה', category: 'sounds', difficulty: 1, emoji: '🛏️', sounds: ['b', 'e', 'd'] },
  { id: 'bus', english: 'bus', hebrew: 'אוטובוס', category: 'sounds', difficulty: 1, emoji: '🚌', sounds: ['b', 'u', 's'] },
  { id: 'hat', english: 'hat', hebrew: 'כובע', category: 'sounds', difficulty: 1, emoji: '🎩', sounds: ['h', 'a', 't'] },
  { id: 'run', english: 'run', hebrew: 'לרוץ', category: 'sounds', difficulty: 1, emoji: '🏃', sounds: ['r', 'u', 'n'] },
  { id: 'leg', english: 'leg', hebrew: 'רגל', category: 'sounds', difficulty: 1, emoji: '🦵', sounds: ['l', 'e', 'g'] },
  { id: 'hen', english: 'hen', hebrew: 'תרנגולת', category: 'sounds', difficulty: 1, emoji: '🐔', sounds: ['h', 'e', 'n'] },
  { id: 'cup', english: 'cup', hebrew: 'כוס', category: 'sounds', difficulty: 1, emoji: '☕', sounds: ['c', 'u', 'p'] },
  { id: 'net', english: 'net', hebrew: 'רשת', category: 'sounds', difficulty: 1, emoji: '🥅', sounds: ['n', 'e', 't'] },
  { id: 'fan', english: 'fan', hebrew: 'מניפה', category: 'sounds', difficulty: 1, emoji: '🪭', sounds: ['f', 'a', 'n'] },
  { id: 'bat', english: 'bat', hebrew: 'עטלף', category: 'sounds', difficulty: 1, emoji: '🦇', sounds: ['b', 'a', 't'] },
  { id: 'hug', english: 'hug', hebrew: 'חיבוק', category: 'sounds', difficulty: 1, emoji: '🤗', sounds: ['h', 'u', 'g'] },
  { id: 'frog', english: 'frog', hebrew: 'צפרדע', category: 'sounds', difficulty: 2, emoji: '🐸', sounds: ['f', 'r', 'o', 'g'] },
  { id: 'flag', english: 'flag', hebrew: 'דגל', category: 'sounds', difficulty: 2, emoji: '🚩', sounds: ['f', 'l', 'a', 'g'] },
  { id: 'drum', english: 'drum', hebrew: 'תוף', category: 'sounds', difficulty: 2, emoji: '🥁', sounds: ['d', 'r', 'u', 'm'] },
  { id: 'hand', english: 'hand', hebrew: 'יד', category: 'sounds', difficulty: 2, emoji: '✋', sounds: ['h', 'a', 'n', 'd'] },

  // ---------- מילות חיבור ----------
  // אין להן תמונה, ולכן הן היחידות במשחק שמוצגות ככיתוב בלבד.
  // זה אפשרי רק אחרי מגדל הצלילים: עד שם דניאל לא קראה כלום.
  //
  // שלוש מהן הן בדיוק מה שדובר עברית נוטה להשמיט, כי בעברית הן
  // פשוט לא קיימות: "a" (אין תווית יידוע לא מיודעת), "is" (בהווה
  // עברית מוותרת על אוגד), ו-the לפני שם עצם מיודע.
  { id: 'the', english: 'the', hebrew: 'ה־', category: 'grammar', difficulty: 1, emoji: '🔹' },
  { id: 'a', english: 'a', hebrew: 'אחד, סתמי', category: 'grammar', difficulty: 1, emoji: '🔹' },
  { id: 'is', english: 'is', hebrew: 'הוא, בהווה', category: 'grammar', difficulty: 2, emoji: '🔸' },
  { id: 'i_pronoun', english: 'I', hebrew: 'אני', category: 'grammar', difficulty: 1, emoji: '🙋' },
  { id: 'have', english: 'have', hebrew: 'יש לי', category: 'grammar', difficulty: 2, emoji: '🤲' },
  { id: 'see', english: 'see', hebrew: 'רואה', category: 'grammar', difficulty: 2, emoji: '👀' },

  // ---------- משפטים ----------
  // משפט הוא פריט רגיל לכל דבר, ולכן כל מנגנוני המשחק עובדים עליו
  // בלי קוד מיוחד. ה-emoji הוא הסצנה שמייצגת אותו.
  { id: 'phrase_i_am_a_girl', english: 'I am a girl', hebrew: 'אני ילדה', category: 'phrases', difficulty: 1, emoji: '👧' },
  { id: 'phrase_i_am_a_boy', english: 'I am a boy', hebrew: 'אני ילד', category: 'phrases', difficulty: 1, emoji: '👦' },
  { id: 'phrase_whats_your_name', english: "What's your name?", hebrew: 'איך קוראים לך?', category: 'phrases', difficulty: 2, emoji: '🏷️' },
  { id: 'phrase_this_is_my_mother', english: 'This is my mother', hebrew: 'זאת אמא שלי', category: 'phrases', difficulty: 2, emoji: '👩' },
  { id: 'phrase_a_big_house', english: 'A big house', hebrew: 'בית גדול', category: 'phrases', difficulty: 1, emoji: '🏠' },
  { id: 'phrase_sit_down', english: 'Sit down', hebrew: 'שבי', category: 'phrases', difficulty: 1, emoji: '🪑' },
  { id: 'phrase_stand_up', english: 'Stand up', hebrew: 'קומי', category: 'phrases', difficulty: 1, emoji: '🧍' },
  { id: 'phrase_open_your_book', english: 'Open your book', hebrew: 'פתחי את הספר', category: 'phrases', difficulty: 2, emoji: '📖' },
  { id: 'phrase_one_red_pencil', english: 'One red pencil', hebrew: 'עיפרון אדום אחד', category: 'phrases', difficulty: 2, emoji: '1️⃣✏️' },
  { id: 'phrase_three_blue_bags', english: 'Three blue bags', hebrew: 'שלושה תיקים כחולים', category: 'phrases', difficulty: 3, emoji: '3️⃣🎒' },
  { id: 'phrase_a_happy_dog', english: 'A happy dog', hebrew: 'כלב שמח', category: 'phrases', difficulty: 1, emoji: '🐶😊' },
  { id: 'phrase_the_cow_is_big', english: 'The cow is big', hebrew: 'הפרה גדולה', category: 'phrases', difficulty: 2, emoji: '🐄' },
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

/**
 * מוסיף מילים למאגר בזמן ריצה.
 *
 * זו הדרך שבה מילים של ההורה, כמו הכתבה מבית הספר, הופכות למילים
 * רגילות לכל דבר. אחרי הרישום כל מנגנוני המשחק עובדים עליהן בלי
 * שום קוד מיוחד: getWord מוצא אותן, מחוללי המשימות בונים מהן משימות,
 * ומעקב השליטה סופר אותן.
 *
 * מזהה שכבר קיים במאגר הקבוע לא נדרס. אחרת רשימה של ההורה הייתה
 * יכולה לשנות בשקט את המשמעות של מילה שכבר נלמדה באזור.
 */
export function registerWords(words: readonly Word[]): void {
  for (const word of words) {
    if (BY_ID.has(word.id)) continue
    BY_ID.set(word.id, word)
    WORDS.push(word)
  }
}

/** מסיר מילים שנרשמו בזמן ריצה. המאגר הקבוע לעולם לא נפגע. */
export function unregisterWords(ids: readonly string[]): void {
  for (const id of ids) {
    const existing = BY_ID.get(id)
    if (!existing || existing.category !== 'custom') continue
    BY_ID.delete(id)
    const at = WORDS.indexOf(existing)
    if (at >= 0) WORDS.splice(at, 1)
  }
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
