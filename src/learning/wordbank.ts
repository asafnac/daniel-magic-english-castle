/**
 * הגשר בין מאגר המילים הקבוע לבין המילים שההורה מוסיף.
 *
 * הרעיון: מילה של ההורה, למשל הכתבה מבית הספר, לא מקבלת מסלול מיוחד
 * בשום מקום. היא נרשמת למאגר הרגיל בזמן טעינה, ומאותו רגע כל המשחק
 * מתייחס אליה כמו לכל מילה אחרת - משימות, רמזים, מעקב שליטה ותרגול.
 *
 * הדרך השנייה, של קוד מיוחד לכל מקום שנוגע במילה, הייתה מתפצלת לשני
 * סוגי מילים שמתנהגים אחרת, וזה בדיוק המקום שבו נולדים באגים.
 */

import { getProgress, updateProgress, type CustomWord, type SaveData } from './progress'
import { WORDS, findWord, registerWords, unregisterWords, type Word } from './vocabulary'

/** ממיר מילה של ההורה למילה רגילה במאגר. */
export function toWord(custom: CustomWord): Word {
  return {
    id: custom.id,
    english: custom.english,
    hebrew: custom.hebrew,
    category: 'custom',
    difficulty: 2,
    emoji: custom.emoji || '🔤',
    sounds: custom.sounds && custom.sounds.length > 0 ? custom.sounds : undefined,
  }
}

/**
 * רושם את כל מילות ההורה למאגר. נקרא פעם אחת בעליית המשחק,
 * ושוב אחרי כל שינוי ברשימות.
 */
export function syncCustomWords(save: SaveData = getProgress()): void {
  registerWords(save.customWords.map(toWord))
}

/** מילה מהמאגר, כולל מילות ההורה שכבר נרשמו. */
export function findAnyWord(id: string, save: SaveData = getProgress()): Word | undefined {
  const known = findWord(id)
  if (known) return known
  const custom = save.customWords.find((w) => w.id === id)
  return custom ? toWord(custom) : undefined
}

/** כל המילים שאפשר לתרגל, כולל של ההורה. */
export function allWords(save: SaveData = getProgress()): Word[] {
  syncCustomWords(save)
  return WORDS.slice()
}

// ---------------------------------------------------------------- רשימות

/** מזהה חדש לרשימה או למילה. מבוסס זמן, כדי שיהיה ייחודי גם בין מכשירים. */
function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`
}

export interface NewWordInput {
  english: string
  hebrew: string
  emoji?: string
}

/**
 * יוצר רשימה חדשה מרשימת מילים שההורה הקליד.
 *
 * מילה שכבר קיימת במאגר הקבוע מזוהה לפי הכתיב באנגלית ומשתמשים בה
 * כמו שהיא, במקום ליצור כפילות. ככה "cat" בהכתבה מתחברת לכל מה
 * שדניאל כבר יודעת על cat, ולא מתחילה מאפס.
 */
export function createList(title: string, words: readonly NewWordInput[]): string {
  const listId = newId('list')
  const wordIds: string[] = []
  const created: CustomWord[] = []

  for (const input of words) {
    const english = input.english.trim()
    if (!english) continue
    const existing = WORDS.find((w) => w.english.toLowerCase() === english.toLowerCase())
    if (existing) {
      wordIds.push(existing.id)
      continue
    }
    const custom: CustomWord = {
      id: newId('w'),
      english,
      hebrew: input.hebrew.trim(),
      emoji: input.emoji?.trim() || '🔤',
    }
    created.push(custom)
    wordIds.push(custom.id)
  }

  updateProgress((save) => {
    save.customWords.push(...created)
    save.lists.push({ id: listId, title: title.trim() || 'רשימה', wordIds, created: Date.now(), active: true })
  })
  registerWords(created.map(toWord))
  return listId
}

export function setListActive(listId: string, active: boolean): void {
  updateProgress((save) => {
    const list = save.lists.find((l) => l.id === listId)
    if (list) list.active = active
  })
}

/**
 * מוחק רשימה. מילים שההורה הגדיר ואינן בשום רשימה אחרת נמחקות איתה,
 * אבל מילים מהמאגר הקבוע כמובן נשארות.
 */
export function deleteList(listId: string): void {
  let orphans: string[] = []
  updateProgress((save) => {
    const list = save.lists.find((l) => l.id === listId)
    if (!list) return
    save.lists = save.lists.filter((l) => l.id !== listId)
    if (!save.deletedLists.includes(listId)) save.deletedLists.push(listId)
    const stillUsed = new Set(save.lists.flatMap((l) => l.wordIds))
    orphans = save.customWords.filter((w) => list.wordIds.includes(w.id) && !stillUsed.has(w.id)).map((w) => w.id)
    save.customWords = save.customWords.filter((w) => !orphans.includes(w.id))
    for (const id of orphans) delete save.stats[`word:${id}`]
  })
  unregisterWords(orphans)
}

/**
 * מפרק טקסט שההורה הדביק לרשימת מילים.
 *
 * מקבל שורה לכל מילה, ומפריד אנגלית מעברית בפסיק, נקודתיים, מקף
 * או טאב. הפורמט סלחני בכוונה: הורה שמעתיק רשימה מוואטסאפ לא אמור
 * ללמוד תחביר.
 */
export function parseWordList(text: string): NewWordInput[] {
  const out: NewWordInput[] = []
  for (const rawLine of text.split(/[\n\r]+/)) {
    const line = rawLine.trim()
    if (!line) continue
    const parts = line.split(/\s*[,:\t]\s*|\s+[-–—]\s+/)
    const english = (parts[0] ?? '').trim()
    if (!english) continue
    out.push({ english, hebrew: (parts[1] ?? '').trim() })
  }
  return out
}
