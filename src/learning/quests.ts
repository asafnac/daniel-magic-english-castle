/**
 * משימות: השרשרת שמחזיקה את המשחק.
 *
 * זו התשובה ל"אזור עם תור משימות". משימה היא סיפור עם בעיה, והיא
 * מורכבת מ**פעימות** קצרות שכל אחת מהן שונה בסוגה מקודמתה.
 *
 * שלושה כללים שהמבנה הזה אוכף:
 *
 * **סוג הפעימה מתחלף.** לא רק התוכן - התנועה. לצפות, לבחור חפץ,
 * לענות בשיחה, לקבל משהו. שתי פעימות מאותו סוג ברצף הן בדיוק
 * הרגע שבו משחק חוזר להיות שאלון, ויש על זה בדיקה.
 *
 * **האנגלית היא בתוך הפעולה.** דמות מבקשת משהו, ודניאל נותנת לה
 * אותו. היא לא עונה על שאלה על המילה apple - היא נותנת תפוח.
 *
 * **אי אפשר להיתקע.** אין תשובה שסוגרת את הדרך. טעות מביאה עזרה
 * מהדמות, ואז עוד עזרה, עד שעוברים. ראו AskScreen.
 */

export interface SceneBeat {
  kind: 'scene'
  /** מזהה מ-scenes.ts. */
  scene: string
}

/** דמות מבקשת משהו, ודניאל נותנת לה אותו. */
export interface AskBeat {
  kind: 'ask'
  character: string
  /** מה הדמות אומרת, באנגלית ובמשפט שלם. */
  say: string
  /** כתובית בעברית. */
  he: string
  /** מזהי המילים שמוצגות כאפשרויות. */
  options: string[]
  /** המילה הנכונה, מתוך options. */
  answer: string
  /** מה הדמות אומרת כשטועים. עוזרת, לא מתקנת. */
  help: string
  helpHe: string
  /** מה הדמות אומרת כשמצליחים. */
  thanks: string
  thanksHe: string
  teaches?: string[]
}

/** דניאל בוחרת מה לומר. זה ה-Role Play, בלי מיקרופון. */
export interface SayBeat {
  kind: 'say'
  /** הדמות ששואלת. */
  character: string
  ask: string
  askHe: string
  /** המשפטים שאפשר לומר. כולם תקינים - זו שיחה, לא מבחן. */
  choices: { en: string; he: string }[]
  /** מה הדמות עונה אחרי כל בחירה. */
  reply: string
  replyHe: string
  teaches?: string[]
}

/**
 * מיני-משחק. אפס אנגלית.
 *
 * זה לא פרס על למידה - זה חלק מהמשחק, ולכן הוא יושב באמצע המשימה
 * ולא בסופה. הפעימה הזאת קיימת כדי שדניאל תרצה להמשיך, וזו סיבה
 * מספיקה בפני עצמה.
 */
export interface PlayBeat {
  kind: 'play'
  game: 'chase'
  /** מה מסבירים לפני, בעברית ובמשפט אחד. */
  intro: string
}

/** פרס: פריט שנשאר. */
export interface RewardBeat {
  kind: 'reward'
  item: string
  /** מה נאמר בעברית כשמקבלים אותו. */
  text: string
}

export type Beat = SceneBeat | AskBeat | SayBeat | PlayBeat | RewardBeat

export interface Quest {
  id: string
  title: string
  emoji: string
  /** תיאור קצר, למסך הבחירה. */
  blurb: string
  beats: Beat[]
}

export const QUESTS: Quest[] = [
  {
    id: 'dragon',
    title: 'הדרקון שאכל את כל התפוחים',
    emoji: '🐉',
    blurb: 'פיפ ברח מהמגדל של הקוסם, וכל התפוחים נעלמו.',
    beats: [
      { kind: 'scene', scene: 'dragon-1-missing' },
      {
        kind: 'ask',
        character: 'ziggy',
        say: 'Can you give me the red apple?',
        he: 'את יכולה לתת לי את התפוח האדום?',
        options: ['apple', 'orange_fruit', 'banana'],
        answer: 'apple',
        help: 'Almost! I need the red apple.',
        helpHe: 'כמעט! אני צריך את התפוח האדום.',
        thanks: 'Thank you! Now Pip will come.',
        thanksHe: 'תודה! עכשיו פיפ יבוא.',
        teaches: ['Can you give me the ___?'],
      },
      // סצנה בין שתי הבקשות, ולא במקרה: שתי בקשות ברצף הן שאלון קטן.
      // כאן היא גם מקדמת את הסיפור - מאיה מגלה איפה פיפ.
      { kind: 'scene', scene: 'dragon-2-garden' },
      {
        kind: 'ask',
        character: 'maya',
        say: 'Can you find the garden?',
        he: 'את יכולה למצוא את הגינה?',
        options: ['flower', 'house', 'cake'],
        answer: 'flower',
        help: 'The garden is where the flowers are.',
        helpHe: 'הגינה היא איפה שהפרחים.',
        thanks: 'Yes! There he is!',
        thanksHe: 'כן! הנה הוא!',
        teaches: ['Can you find the ___?'],
      },
      {
        kind: 'play',
        game: 'chase',
        intro: 'פיפ בורח בגינה! תפסי אותו.',
      },
      {
        kind: 'reward',
        item: 'outfit-garden',
        text: 'רצת בכל הגינה, וקיבלת את שמלת הגינה.',
      },
      {
        kind: 'say',
        character: 'pip',
        ask: 'Hello! What is your name?',
        askHe: 'שלום! איך קוראים לך?',
        choices: [
          { en: 'My name is Daniel.', he: 'קוראים לי דניאל.' },
          { en: 'I am Daniel!', he: 'אני דניאל!' },
        ],
        reply: 'Nice to meet you, Daniel!',
        replyHe: 'נעים להכיר, דניאל!',
        teaches: ['My name is ___', 'What is your name?'],
      },
      {
        kind: 'reward',
        item: 'pet-pip',
        text: 'פיפ בא לגור אצלך! הוא מחכה לך בחדר.',
      },
    ],
  },
]

export function findQuest(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id)
}

export function getQuest(id: string): Quest {
  const found = findQuest(id)
  if (!found) throw new Error(`unknown quest: ${id}`)
  return found
}

/** המשימה הראשונה. */
export const FIRST_QUEST = 'dragon'

/**
 * כל המבנים שהמשימה חושפת, לפי סדר ההופעה.
 *
 * זה הגשר לשלב הבא: מבנה שנחשף במשימה יקבל סטטוס במעקב, וממנו
 * ייקבע מה יופיע במשימה הבאה.
 */
export function structuresOf(quest: Quest): string[] {
  const out: string[] = []
  for (const beat of quest.beats) {
    if (beat.kind === 'ask' || beat.kind === 'say') {
      for (const s of beat.teaches ?? []) if (!out.includes(s)) out.push(s)
    }
  }
  return out
}
