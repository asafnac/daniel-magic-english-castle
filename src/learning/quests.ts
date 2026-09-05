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

import { questBeatOf } from './progress'

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
  /** המשימה שצריך לסיים לפני שזו נפתחת. חסר במשימה הראשונה. */
  requires?: string
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
  {
    id: 'pip-hungry',
    title: 'פיפ רעב',
    emoji: '🍞',
    blurb: 'פיפ אכל את כל האוכל במטבח של זיגי, ועכשיו מבשלים מחדש.',
    requires: 'dragon',
    beats: [
      { kind: 'scene', scene: 'pip-2-kitchen' },
      // פיפ מבקש בעצמו, ולא מישהו בשבילו. I want הוא המבנה שדניאל
      // תרצה להשתמש בו בעצמה, ולכן היא שומעת אותו מפי מי שתמיד רוצה.
      {
        kind: 'ask',
        character: 'pip',
        say: 'I am hungry. I want the bread.',
        he: 'אני רעב. אני רוצה את הלחם.',
        options: ['bread', 'cake', 'milk'],
        answer: 'bread',
        help: 'The bread! I want the bread, please.',
        helpHe: 'הלחם! אני רוצה את הלחם, בבקשה.',
        thanks: 'Yum! Thank you, Daniel!',
        thanksHe: 'ממ! תודה, דניאל!',
        teaches: ['I want the ___'],
      },
      { kind: 'scene', scene: 'pip-3-mimi' },
      {
        kind: 'ask',
        character: 'guard',
        say: 'Pip wants the milk. Can you bring the milk?',
        he: 'פיפ רוצה את החלב. את יכולה להביא את החלב?',
        options: ['milk', 'water', 'egg'],
        answer: 'milk',
        help: 'The milk, please. The white one.',
        helpHe: 'את החלב בבקשה. הלבן.',
        thanks: 'Good. Thank you, princess.',
        thanksHe: 'יופי. תודה, נסיכה.',
        teaches: ['Can you bring the ___?'],
      },
      {
        kind: 'play',
        game: 'chase',
        intro: 'פיפ חטף את העוגה וברח מהמטבח! תפסי אותו.',
      },
      {
        kind: 'reward',
        item: 'outfit-chef',
        text: 'בישלת במטבח של הקוסם, וקיבלת את סינר הבישול.',
      },
      {
        kind: 'say',
        character: 'pip',
        ask: 'Do you like cake?',
        askHe: 'את אוהבת עוגה?',
        choices: [
          { en: 'Yes, I like cake.', he: 'כן, אני אוהבת עוגה.' },
          { en: 'I like cake and apples.', he: 'אני אוהבת עוגה ותפוחים.' },
        ],
        reply: 'Me too! Cake is the best.',
        replyHe: 'גם אני! עוגה זה הכי טוב.',
        teaches: ['Do you like ___?', 'I like ___'],
      },
      {
        kind: 'reward',
        item: 'pet-mimi',
        text: 'מימי נשארה בגלל ריח העוגה. עכשיו היא שלך.',
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
 * מצב הסיפור, מנקודת מבט של מסך הסיפורים.
 *
 * `done` הוא לא סוף. סיפור שנגמר נשאר ברשימה ואפשר לראות אותו שוב
 * מההתחלה - דניאל אהבה את הדרקון וביקשה לשמוע אותו שוב, וכפתור
 * שלא עושה כלום הוא התשובה הגרועה ביותר לבקשה כזאת.
 */
export type QuestStage = 'locked' | 'new' | 'middle' | 'done'

export function questStage(questId: string): QuestStage {
  const quest = getQuest(questId)
  const at = questBeatOf(questId)
  if (at >= quest.beats.length) return 'done'
  if (quest.requires && questBeatOf(quest.requires) < getQuest(quest.requires).beats.length) return 'locked'
  return at === 0 ? 'new' : 'middle'
}

/**
 * מאיזו פעימה להתחיל.
 *
 * באמצע ממשיכים מאיפה שעצרו, ובסיפור שנגמר מתחילים מההתחלה. הצפייה
 * החוזרת לא דורסת כלום: המונה השמור הוא מקסימום בלבד, ולכן סיפור
 * שהושלם נשאר מושלם גם אחרי שרואים אותו שוב.
 */
export function questStartBeat(questId: string): number {
  const quest = getQuest(questId)
  const at = questBeatOf(questId)
  return at >= quest.beats.length ? 0 : at
}

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
