/**
 * הדברים שדניאל אוספת.
 *
 * הפרס במשחק היה עד היום מספר שעולה. מספר הוא לא פרס - הוא ציון.
 * מה שילדה בת שמונה באמת רוצה זה **דבר שנשאר**: חיה שגרה אצלה בחדר,
 * שמלה שהנסיכה לובשת, כתר.
 *
 * שני כללים:
 *
 * **פריט נשאר לנצח.** אוסף שאפשר לאבד ממנו הוא מקור לחרדה, לא
 * למוטיבציה. לכן הרשימה היא איחוד בלבד גם במיזוג בין מכשירים.
 *
 * **פריט מגיע מסיפור, לא מציון.** לא "20 כוכבים = כתר", אלא "עזרת
 * לפיפ, ופיפ בא לגור אצלך". ככה הפריט מזכיר לה מה היא עשתה, וזה
 * מה שגורם לה לרצות את הבא.
 */

export type ItemKind = 'pet' | 'outfit' | 'crown' | 'thing'

export interface Item {
  id: string
  kind: ItemKind
  /** השם בעברית, כפי שדניאל תראה אותו. */
  name: string
  emoji: string
  /** מאיפה הוא הגיע. מוצג באוסף, כדי שהפריט יזכיר את הסיפור. */
  from: string
}

export const ITEMS: Item[] = [
  {
    id: 'pet-pip',
    kind: 'pet',
    name: 'פיפ הדרקון',
    emoji: '🐉',
    from: 'עזרת לזיגי למצוא אותו',
  },
  {
    id: 'crown-apple',
    kind: 'crown',
    name: 'כתר התפוחים',
    emoji: '👑',
    from: 'הצלת את התפוחים של הקוסם',
  },
  {
    id: 'outfit-garden',
    kind: 'outfit',
    name: 'שמלת הגינה',
    emoji: '👗',
    from: 'פתחת את שער הגינה',
  },
]

export function findItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id)
}

export function getItem(id: string): Item {
  const found = findItem(id)
  if (!found) throw new Error(`unknown item: ${id}`)
  return found
}

export const KIND_LABEL: Record<ItemKind, string> = {
  pet: 'חיות',
  outfit: 'בגדים',
  crown: 'כתרים',
  thing: 'חפצים',
}
