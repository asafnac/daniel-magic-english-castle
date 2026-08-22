/**
 * דפי העבודה של בית הספר, מוכנים להוספה בלחיצה.
 *
 * ההורה כבר יכול להקליד רשימת מילים משלו, וזה נשאר הכלי הכללי. אבל
 * דפי האותיות חוזרים כל שבוע באותו מבנה בדיוק - "צבעי את התמונות
 * שמתחילות באות ..." - והקלדה של שבע מילים עם תרגום, על טאבלט,
 * בערב, היא בדיוק סוג החיכוך שגורם לכך שזה פשוט לא ייעשה.
 *
 * לכן כל דף כזה יושב כאן מוכן. לחיצה אחת, והמילים של הדף נכנסות
 * לתרגול של דניאל עם השאלה שהדף שואל.
 *
 * להוספת דף חדש: מוסיפים את המילים ל-vocabulary.ts עם firstSound,
 * ומוסיפים כאן ערך אחד. אין שום מקום שלישי לעדכן, ויש בדיקה עצמית
 * שמוודאת שכל מזהה כאן קיים ושהצליל שלו באמת מתאים.
 */

import { WORDS } from './vocabulary'
import { createList, type NewWordInput } from './wordbank'

export interface SchoolSet {
  id: string
  /** האות, כפי שהיא מופיעה בראש הדף. */
  letter: string
  /** מזהה הצליל ב-phonics.ts. */
  phoneme: string
  /** שם הרשימה כפי שיוצג להורה ובכרטיס הסיום של דניאל. */
  title: string
  /** מזהי המילים, מתוך vocabulary.ts. */
  words: string[]
}

/**
 * חמשת הדפים שדניאל הביאה הביתה.
 *
 * המילים הן מה שמופיע על הדף עצמו, למעט שתיים: נבל וסביבון. לשתיהן
 * אין אימוג'י שילדה מזהה בלי הסבר, ותמונה שצריך לנחש מה היא הופכת
 * שאלה על צליל לחידת ציור. הוספתי במקומן מילים אחרות עם אותו צליל.
 */
export const SCHOOL_SETS: SchoolSet[] = [
  {
    id: 'letter-i',
    letter: 'Ii',
    phoneme: 'i',
    title: 'דף האות Ii',
    words: ['iguana', 'insect', 'igloo', 'ink', 'invitation', 'ill', 'ice_cream'],
  },
  {
    id: 'letter-g',
    letter: 'Gg',
    phoneme: 'g',
    title: 'דף האות Gg',
    words: ['goat', 'grapes', 'guitar', 'gate', 'glue', 'girl', 'gift'],
  },
  {
    id: 'letter-h',
    letter: 'Hh',
    phoneme: 'h',
    title: 'דף האות Hh',
    words: ['hat', 'house', 'horse', 'hamburger', 'hand', 'honey', 'heart'],
  },
  {
    id: 'letter-t',
    letter: 'Tt',
    phoneme: 't',
    title: 'דף האות Tt',
    words: ['tiger', 'tooth', 'turtle', 'tie', 'tree', 'tomato', 'train'],
  },
  {
    id: 'letter-e',
    letter: 'Ee',
    phoneme: 'e',
    title: 'דף האות Ee',
    words: ['egg', 'elephant', 'envelope', 'eye', 'elk'],
  },
]

export function findSchoolSet(id: string): SchoolSet | undefined {
  return SCHOOL_SETS.find((s) => s.id === id)
}

/**
 * מוסיף דף שלם כרשימה פעילה.
 *
 * עובר דרך createList הרגילה ולא דרך מסלול מיוחד, וזה מכוון: המילים
 * כבר קיימות במאגר, ו-createList מזהה אותן לפי הכתיב ומשתמשת בקיימות
 * במקום לשכפל. כך דף שנוסף מתחבר לכל מה שדניאל כבר יודעת על המילים
 * האלה, ולא מתחיל מאפס.
 */
export function addSchoolSet(set: SchoolSet): string {
  const words: NewWordInput[] = set.words.map((id) => {
    const word = WORDS.find((w) => w.id === id)
    if (!word) throw new Error(`school set ${set.id} points at a word that does not exist: ${id}`)
    return { english: word.english, hebrew: word.hebrew, emoji: word.emoji }
  })
  return createList(set.title, words)
}
