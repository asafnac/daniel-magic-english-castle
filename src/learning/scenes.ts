/**
 * סצנות: הרגע שבו דניאל רק צופה ומקשיבה.
 *
 * זה השלב הראשון של מחזור הלמידה, והדבר היחיד שאסור שיקרה בו הוא
 * מבחן. היא שומעת אנגלית, רואה מה קורה, ומבינה מההקשר. אין מה לענות
 * ואי אפשר לטעות.
 *
 * למה זה עובד: רוכשים שפה מהבנת קלט שנמצא מעט מעל הרמה הנוכחית.
 * "מעט מעל" מושג כאן בשלוש דרכים, וכולן חייבות להתקיים יחד:
 *
 *   **המשפטים קצרים ומוכרים בצורתם.** אותם מבנים חוזרים מפי אותן
 *   דמויות, כך שהצורה כבר מוכרת גם כשהמילה שבתוכה חדשה.
 *
 *   **התמונה מספרת את הסיפור.** מי מדבר, מה קורה, ומה הבעיה - כל
 *   זה נקרא מהאימוג'י ומהצבע, בלי מילה אחת.
 *
 *   **הכתובית בעברית קיימת תמיד.** לא כדי לתרגם מילה במילה, אלא
 *   כדי שלא יהיה רגע אחד של "אני לא מבינה מה קורה". בלי הכתובית
 *   סצנה באנגלית היא רעש, ורעש לא מלמד כלום.
 *
 * מבנה התוכן: שורה אחת לכל דיבור, ולא פסקאות. סצנה של יותר משמונה
 * שורות היא סרט, וילדה בת שמונה עם קשב קצר יוצאת ממנו.
 */

export interface SceneLine {
  /** מזהה הדמות מ-characters.ts. */
  who: string
  /** מה נאמר, באנגלית. */
  en: string
  /** הכתובית בעברית. לא תרגום מילולי - מה שמבינים. */
  he: string
  /**
   * המבנים שהשורה חושפת, ככתיב המלא עם מקום ריק.
   *
   * כרגע זו תיעוד בלבד, והיא מה שיחבר את הסצנות למעקב השליטה
   * בשלב הבא: מבנה שנחשף בסצנה מקבל סטטוס "נחשפה", ומשם הוא
   * מטפס דרך שימוש ולא דרך תרגול.
   */
  teaches?: string[]
}

export interface Scene {
  id: string
  /** כותרת בעברית, למסך ולניווט. */
  title: string
  /** מה קורה כאן, למפתח. לא מוצג. */
  summary: string
  lines: SceneLine[]
}

export const SCENES: Scene[] = [
  {
    id: 'dragon-1-missing',
    title: 'הדרקון שאכל את כל התפוחים',
    summary:
      'הפתיחה של עולם הדרקון. זיגי מגלה שפיפ ברח ושכל התפוחים נעלמו. מאיה רואה משהו ירוק. ' +
      'המבנה המרכזי הוא Where is, והוא יחזור בכל העולם הזה מפי דמויות שונות.',
    lines: [
      {
        who: 'ziggy',
        en: 'Oh no! Where is my dragon?',
        he: 'אוי לא! איפה הדרקון שלי?',
        teaches: ['Where is my ___?'],
      },
      {
        who: 'maya',
        en: 'I don’t know. He is not here.',
        he: 'אני לא יודעת. הוא לא כאן.',
        teaches: ['I don’t know', '___ is not here'],
      },
      {
        who: 'ziggy',
        en: 'And my apples! My apples are gone!',
        he: 'והתפוחים שלי! כל התפוחים נעלמו!',
      },
      {
        who: 'maya',
        en: 'Look! Something green!',
        he: 'תראי! משהו ירוק!',
        teaches: ['Look!'],
      },
      {
        who: 'pip',
        en: 'Yum! Apples!',
        he: 'ממ! תפוחים!',
      },
      {
        who: 'ziggy',
        en: 'Pip! Come back!',
        he: 'פיפ! תחזור!',
      },
      {
        who: 'maya',
        en: 'Can you help us?',
        he: 'את יכולה לעזור לנו?',
        teaches: ['Can you help ___?'],
      },
    ],
  },
  {
    id: 'dragon-2-garden',
    title: 'משהו זז בגינה',
    summary:
      'הפעימה שמפרידה בין שתי הבקשות ומקדמת את הסיפור. מאיה רואה את פיפ בגינה. ' +
      'המבנה is in the חוזר כאן מפי מאיה, אחרי שזיגי כבר השתמש ב-Where is.',
    lines: [
      {
        who: 'maya',
        en: 'Wait! Look at the garden!',
        he: 'רגע! תסתכלי על הגינה!',
        teaches: ['Look at the ___!'],
      },
      {
        who: 'pip',
        en: 'More apples! Yum!',
        he: 'עוד תפוחים! ממ!',
      },
      {
        who: 'ziggy',
        en: 'He is in the garden!',
        he: 'הוא בגינה!',
        teaches: ['___ is in the ___'],
      },
    ],
  },
]

/** הסצנה שפותחת את הסיפור. */
export const FIRST_SCENE = 'dragon-1-missing'

export function findScene(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id)
}

export function getScene(id: string): Scene {
  const found = findScene(id)
  if (!found) throw new Error(`unknown scene: ${id}`)
  return found
}
