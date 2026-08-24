/**
 * קריינות באמצעות Web Speech API של הדפדפן.
 *
 * שלושה דברים חשובים כאן:
 * 1. הקולות בכרום נטענים אסינכרונית, ולכן מקשיבים ל-voiceschanged.
 * 2. הדפדפן לא מרשה להשמיע קול לפני אינטראקציה של המשתמש,
 *    ולכן המערכת ננעלת עד הלחיצה הראשונה במסך הפתיחה.
 * 3. אם אין קול עברי, המשחק ממשיך לעבוד. ההוראות פשוט נשארות בטקסט.
 */

import { getProgress } from './progress'

let voices: SpeechSynthesisVoice[] = []
let englishVoice: SpeechSynthesisVoice | null = null
let hebrewVoice: SpeechSynthesisVoice | null = null
let unlocked = false
let ready = false

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function isSpeechSupported(): boolean {
  return supported
}

export function hasHebrewVoice(): boolean {
  return hebrewVoice !== null
}

export function hasEnglishVoice(): boolean {
  return englishVoice !== null
}

function scoreEnglish(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase()
  if (!lang.startsWith('en')) return -1
  let score = 1
  if (lang === 'en-us') score += 4
  else if (lang === 'en-gb') score += 3
  // קולות מקומיים יציבים יותר מקולות ענן, ולא דורשים רשת.
  if (v.localService) score += 2
  const name = v.name.toLowerCase()
  // קולות נשיים בדרך כלל נעימים יותר לילדים, וגם ברורים יותר בקצב איטי.
  if (/zira|samantha|aria|jenny|female|woman|susan|hazel/.test(name)) score += 2
  return score
}

function scoreHebrew(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase()
  if (!lang.startsWith('he') && !lang.startsWith('iw')) return -1
  return v.localService ? 3 : 1
}

function pickVoices(): void {
  if (!supported) return
  voices = window.speechSynthesis.getVoices() ?? []
  if (voices.length === 0) return

  let bestEn: SpeechSynthesisVoice | null = null
  let bestEnScore = 0
  let bestHe: SpeechSynthesisVoice | null = null
  let bestHeScore = 0

  for (const v of voices) {
    const en = scoreEnglish(v)
    if (en > bestEnScore) {
      bestEnScore = en
      bestEn = v
    }
    const he = scoreHebrew(v)
    if (he > bestHeScore) {
      bestHeScore = he
      bestHe = v
    }
  }

  englishVoice = bestEn
  hebrewVoice = bestHe
  ready = true
}

if (supported) {
  pickVoices()
  window.speechSynthesis.addEventListener('voiceschanged', pickVoices)
}

/**
 * משחרר את הקול. חייב להיקרא מתוך מטפל אירוע של לחיצה אמיתית,
 * אחרת הדפדפן יחסום את ההשמעה הראשונה.
 */
export function unlockSpeech(): void {
  if (!supported || unlocked) return
  try {
    // אמירה ריקה ושקטה שמסירה את החסימה בלי שיישמע דבר.
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
    unlocked = true
    if (!ready) pickVoices()
  } catch {
    unlocked = false
  }
}

export function isUnlocked(): boolean {
  return unlocked
}

export function stopSpeaking(): void {
  if (!supported) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* אין מה לעשות, ממשיכים */
  }
}

interface SpeakOptions {
  /** קצב. אם לא צוין, נלקח מההגדרות. */
  rate?: number
  /**
   * גובה הקול. קיים כדי שדמויות שונות יישמעו שונה.
   *
   * דפדפן נותן קול אנגלי אחד או שניים, ולכן ההבדל בין קוסם זקן
   * לדרקון קטן חייב לבוא מכאן. זה לא קישוט: ילדה שמזהה מי מדבר
   * לפי הקול מבינה את הסצנה גם כשהמילים עדיין לא לגמרי ברורות.
   */
  pitch?: number
  /** לעצור אמירה קודמת. ברירת מחדל: כן. */
  interrupt?: boolean
  onEnd?: () => void
}

function speakWith(text: string, voice: SpeechSynthesisVoice | null, lang: string, opts: SpeakOptions = {}): boolean {
  if (!supported || !unlocked) {
    opts.onEnd?.()
    return false
  }
  const settings = getProgress().settings
  if (!settings.voice) {
    opts.onEnd?.()
    return false
  }
  try {
    if (opts.interrupt !== false) window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? lang
    u.rate = opts.rate ?? settings.speechRate
    u.pitch = opts.pitch ?? 1.05
    u.volume = 1
    if (opts.onEnd) {
      u.addEventListener('end', () => opts.onEnd?.())
      u.addEventListener('error', () => opts.onEnd?.())
    }
    window.speechSynthesis.speak(u)
    return true
  } catch {
    opts.onEnd?.()
    return false
  }
}

export type { SpeakOptions }

/** מקריא מילה או משפט באנגלית, בקצב איטי. */
export function speakEnglish(text: string, opts: SpeakOptions = {}): boolean {
  return speakWith(text, englishVoice, 'en-US', opts)
}

/**
 * מקריא הוראה בעברית, אם יש קול עברי.
 * אם אין, לא קורה כלום. הטקסט תמיד מוצג על המסך במקביל.
 */
export function speakHebrew(text: string, opts: SpeakOptions = {}): boolean {
  if (!hebrewVoice) {
    opts.onEnd?.()
    return false
  }
  return speakWith(text, hebrewVoice, 'he-IL', { rate: 0.95, ...opts })
}

/** מקריא מילה באנגלית פעמיים עם הפסקה, לחיזוק. */
export function speakEnglishTwice(text: string): void {
  speakEnglish(text, {
    onEnd: () => {
      window.setTimeout(() => speakEnglish(text, { interrupt: false }), 350)
    },
  })
}

// ------------------------------------------------------- זיהוי דיבור, אופציונלי

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return typeof ctor === 'function' ? (ctor as new () => SpeechRecognitionLike) : null
}

export function isRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

/**
 * מנסה לשמוע את דניאל אומרת מילה. תוספת בלבד.
 * לעולם לא חוסמת התקדמות: כל תוצאה, כולל שגיאה, מסתיימת ב-onDone.
 */
export function listenOnce(expected: string, onDone: (heardIt: boolean, transcript: string) => void): () => void {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    onDone(false, '')
    return () => {}
  }
  let finished = false
  const finish = (ok: boolean, text: string) => {
    if (finished) return
    finished = true
    window.clearTimeout(timer)
    try {
      rec.abort()
    } catch {
      /* כבר נעצר */
    }
    onDone(ok, text)
  }

  const rec = new Ctor()
  rec.lang = 'en-US'
  rec.continuous = false
  rec.interimResults = false
  rec.maxAlternatives = 3

  rec.onresult = (e) => {
    let heard = ''
    const alts = e.results[0]
    for (let i = 0; i < alts.length; i++) heard += ' ' + alts[i].transcript
    const norm = heard.toLowerCase().replace(/[^a-z ]/g, ' ')
    finish(norm.includes(expected.toLowerCase()), heard.trim())
  }
  rec.onerror = () => finish(false, '')
  rec.onend = () => finish(false, '')

  const timer = window.setTimeout(() => finish(false, ''), 6000)

  try {
    rec.start()
  } catch {
    finish(false, '')
  }

  return () => finish(false, '')
}
