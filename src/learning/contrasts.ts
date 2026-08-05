/**
 * זוגות מינימליים לדוברי עברית.
 *
 * זה החלק שמטפל בהגייה, והוא בנוי על עיקרון אחד: **אי אפשר להגות
 * הבדל שלא שומעים**. ילדה שלא מבחינה באוזן בין ship לבין sheep לא
 * תפיק את ההבדל הזה גם אם תתאמן שעה מול מיקרופון, כי היא לא יודעת
 * לאן לכוון. לכן ההבחנה קודמת, וההפקה באה אחריה.
 *
 * הבונוס: הבחנה בשמיעה נבדקת בלי מיקרופון בכלל. היא עובדת בכל
 * דפדפן, גם כשזיהוי הדיבור לא זמין או כבוי, וזה אומר שהחלק החשוב
 * של תרגול ההגייה אף פעם לא תלוי בהרשאה שמישהו צריך לאשר.
 *
 * הזוגות כאן לא נבחרו כי הם קשים באופן כללי, אלא כי הם קשים
 * **לדובר עברית** ספציפית. לעברית אין th, אין הבחנה בין w ל-v,
 * ואין תנועות ארוכות מול קצרות. אלה בדיוק שלוש הטעויות שנשארות
 * גם אחרי שנים של לימוד, כי אף אחד לא הפנה אליהן תשומת לב.
 */

import { getWord } from './vocabulary'

export interface Contrast {
  id: string
  /** שתי המילים שנבדלות בצליל אחד. */
  pair: [string, string]
  /** מה ההבדל, בעברית. */
  title: string
  /** למה זה קשה דווקא לדובר עברית. לתיעוד ולמסך ההורים. */
  why: string
  /** רמז שמסביר איך להקשיב. */
  listenHint: string
}

export const CONTRASTS: Contrast[] = [
  {
    id: 'th-vs-t',
    pair: ['three', 'tree'],
    title: 'th מול t',
    why: 'הצליל th לא קיים בעברית, ודובר עברית מחליף אותו ב-t או ב-ס',
    listenHint: 'ב-three הלשון יוצאת קצת בין השיניים. ב-tree היא נוגעת בחך',
  },
  {
    id: 'th-vs-s',
    pair: ['think', 'sink'],
    title: 'th מול s',
    why: 'ההחלפה השנייה הנפוצה של th, והפעם ב-ס',
    listenHint: 'ב-sink יש שריקה חדה. ב-think הצליל רך ועמום יותר',
  },
  {
    id: 'v-vs-w',
    pair: ['vest', 'west'],
    title: 'v מול w',
    why: 'בעברית אין w בכלל, ולכן שתי המילים נשמעות זהות לאוזן עברית',
    listenHint: 'ב-vest השיניים נוגעות בשפה. ב-west השפתיים מתעגלות, כמו לפני שריקה',
  },
  {
    id: 'v-vs-w-2',
    pair: ['vet', 'wet'],
    title: 'v מול w, שוב',
    why: 'אותה הבחנה במילים קצרות יותר',
    listenHint: 'שיניים על השפה, מול שפתיים מעוגלות',
  },
  {
    id: 'short-vs-long-i',
    pair: ['ship', 'sheep'],
    title: 'תנועה קצרה מול ארוכה',
    why: 'בעברית אין הבדל בין תנועה קצרה לארוכה, ולכן ההבחנה הזאת לא קיימת באוזן',
    listenHint: 'ב-sheep התנועה נמשכת. ב-ship היא נחתכת מהר',
  },
  {
    id: 'short-vs-long-i-2',
    pair: ['bin', 'bean'],
    title: 'עוד תנועה קצרה מול ארוכה',
    why: 'אותה הבחנה, כדי שהיא לא תיקשר למילה אחת בלבד',
    listenHint: 'ב-bean התנועה ארוכה, ב-bin קצרה',
  },
  {
    id: 'a-vs-e',
    pair: ['bad', 'bed'],
    title: 'a מול e',
    why: 'שתי התנועות האלה נופלות בעברית לאותו צליל',
    listenHint: 'ב-bad הפה פתוח יותר. ב-bed הוא צר יותר',
  },
]

const BY_ID = new Map(CONTRASTS.map((c) => [c.id, c]))

export function findContrast(id: string): Contrast | undefined {
  return BY_ID.get(id)
}

export function getContrast(id: string): Contrast {
  const c = BY_ID.get(id)
  if (!c) throw new Error(`Unknown contrast id: ${id}`)
  return c
}

/** בן הזוג של מילה בתוך זוג מינימלי. */
export function partnerOf(contrastId: string, wordId: string): string {
  const contrast = getContrast(contrastId)
  return contrast.pair[0] === wordId ? contrast.pair[1] : contrast.pair[0]
}

/**
 * בדיקת שפיות: שתי המילים בזוג חייבות להישמע שונה ולהיראות שונה.
 * אם האימוג'י זהה, אי אפשר לבחור ביניהן בלי הטקסט, וזה הופך
 * משימת שמיעה למשימת קריאה.
 */
export function pairIsUsable(contrast: Contrast): boolean {
  const [a, b] = contrast.pair.map(getWord)
  return a.english.toLowerCase() !== b.english.toLowerCase() && a.emoji !== b.emoji
}
