/**
 * הדמויות של הטירה.
 *
 * זה הקובץ שהופך את המשחק מרצף משימות לסיפור. הרעיון פשוט ומגיע
 * ישירות מהשיטה שחקרנו: כשאותן דמויות חוזרות שוב ושוב, הלומד רוצה
 * לדעת מה יקרה להן - וזה מה שמחזיק אותו, לא התרגול.
 *
 * לכל דמות יש שלושה דברים שחייבים להיות עקביים לאורך כל המשחק:
 *
 * 1. **אישיות שאפשר לזהות במשפט אחד.** זיגי שוכח, פיפ רעב, השומר
 *    מדבר בהוראות. כשהאישיות עקבית, דניאל מנחשת נכון מה הדמות
 *    עומדת לומר - וניחוש נכון הוא בדיוק מה שמאפשר להבין אנגלית
 *    לפני שיודעים אותה.
 * 2. **קול משלה.** הדפדפן נותן קול אנגלי אחד, ולכן ההבדל בין
 *    הדמויות חייב לבוא מגובה וקצב. בלי זה כל הסצנה נשמעת כמו
 *    מספר אחד שקורא הצגה.
 * 3. **סוג המשפטים שהיא אומרת.** לכל דמות יש תפקיד לשוני: זיגי
 *    שואל, השומר מורה, פיפ רוצה. ככה אותו מבנה חוזר טבעית מפי
 *    אותה דמות, וזו חזרה שלא מרגישה כמו חזרה.
 */

export interface Character {
  id: string
  /** השם באנגלית, כפי שהוא נאמר ומופיע בשיחה. */
  name: string
  /** השם בעברית, לכתוביות. */
  hebrewName: string
  emoji: string
  /** צבע ההדגשה של הדמות. עקבי בכל מקום שבו היא מופיעה. */
  color: string
  /** משפט אחד שמסביר מי היא. לא מוצג לדניאל - הוא מנחה כתיבת תוכן. */
  personality: string
  /** גובה הקול. 1 הוא רגיל. */
  pitch: number
  /** קצב הדיבור. איטי יותר לדמויות שמלמדות מבנה חדש. */
  rate: number
}

export const CHARACTERS: Character[] = [
  {
    id: 'ziggy',
    name: 'Ziggy',
    hebrewName: 'זיגי',
    emoji: '🧙',
    color: '#7b4bb7',
    personality: 'קוסם זקן שמאבד כל דבר ושואל איפה הוא. נחמד מאוד, קצת מבולבל.',
    pitch: 0.8,
    rate: 0.72,
  },
  {
    id: 'maya',
    name: 'Maya',
    hebrewName: 'מאיה',
    emoji: '👧',
    color: '#e8558f',
    personality: 'חברה של הנסיכה. מהירה, סקרנית, מדברת במשפטים קצרים ומצביעה על דברים.',
    pitch: 1.35,
    rate: 0.85,
  },
  {
    id: 'pip',
    name: 'Pip',
    hebrewName: 'פיפ',
    emoji: '🐉',
    color: '#3fae5a',
    personality: 'דרקון קטן, שובב ותמיד רעב. אומר מה הוא רוצה, לרוב מילה או שתיים.',
    pitch: 1.7,
    rate: 0.9,
  },
  {
    id: 'guard',
    name: 'Bruno',
    hebrewName: 'ברונו',
    emoji: '💂',
    color: '#c25b2e',
    personality: 'שומר הטירה. רציני, מדבר בהוראות קצרות וברורות, ותמיד עוזר בסוף.',
    pitch: 0.65,
    rate: 0.7,
  },
  {
    id: 'daniel',
    name: 'Daniel',
    hebrewName: 'דניאל',
    emoji: '👑',
    color: '#f3c623',
    personality: 'הנסיכה. זו דניאל עצמה, ולכן היא לא מדברת מעצמה - היא בוחרת מה לומר.',
    pitch: 1.2,
    rate: 0.8,
  },
]

export function getCharacter(id: string): Character {
  const found = CHARACTERS.find((c) => c.id === id)
  if (!found) throw new Error(`unknown character: ${id}`)
  return found
}

export function findCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id)
}

/** הדמות שמייצגת את דניאל עצמה. השורות שלה הן בחירה, לא הקראה. */
export const PLAYER_CHARACTER = 'daniel'
