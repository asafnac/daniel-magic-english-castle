/**
 * צליל ומוזיקה, הכל מסונתז בקוד באמצעות Web Audio API.
 *
 * אין כאן שום קובץ שמע חיצוני, ולכן אין שום שאלה של זכויות יוצרים.
 * המוזיקה היא לולאה פנטטונית רכה, שנשמעת נעימה בכל סדר תווים,
 * ולכן אי אפשר "לפספס" ולקבל צליל צורם.
 */

import { getProgress } from './progress'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let sfxBus: GainNode | null = null
let musicTimer: number | undefined
let nextNoteTime = 0
let step = 0
let musicPlaying = false

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD = 0.2

/** סולם פנטטוני. כל צירוף תווים ממנו נשמע נעים. */
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]
/** תבנית מלודית עדינה. -1 הוא שקט. */
const MELODY = [0, 2, 4, 2, 5, 4, 2, -1, 1, 3, 5, 3, 6, 5, 3, -1]
const STEP_SECONDS = 0.34

function createContext(): boolean {
  if (ctx) return true
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return false
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)

    musicBus = ctx.createGain()
    musicBus.gain.value = 0
    musicBus.connect(master)

    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.9
    sfxBus.connect(master)
    return true
  } catch {
    ctx = null
    return false
  }
}

/** חייב להיקרא מתוך לחיצה אמיתית של המשתמש. */
export function unlockAudio(): void {
  if (!createContext() || !ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
}

export function isAudioAvailable(): boolean {
  return ctx !== null
}

// ------------------------------------------------------------- אבני בניין

function envTone(
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType,
  bus: GainNode,
  glideTo?: number,
): void {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), start + duration)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.05, duration * 0.25))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(gain)
  gain.connect(bus)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

function noiseBurst(start: number, duration: number, peak: number, from: number, to: number, bus: GainNode): void {
  if (!ctx) return
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const chan = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) chan[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), start + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  src.connect(filter)
  filter.connect(gain)
  gain.connect(bus)
  src.start(start)
  src.stop(start + duration + 0.05)
}

// ------------------------------------------------------------- מוזיקת רקע

function scheduleStep(time: number): void {
  if (!ctx || !musicBus) return
  const idx = MELODY[step % MELODY.length]
  if (idx >= 0) {
    envTone(PENTA[idx], time, 0.6, 0.16, 'triangle', musicBus)
    // הרמוניה שקטה אוקטבה מתחת, נותנת חום בלי להעמיס.
    envTone(PENTA[idx] / 2, time, 0.9, 0.07, 'sine', musicBus)
  }
  // בס רך בתחילת כל תיבה.
  if (step % 8 === 0) envTone(130.81, time, 1.4, 0.09, 'sine', musicBus)
  step += 1
}

function schedulerTick(): void {
  if (!ctx) return
  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(nextNoteTime)
    nextNoteTime += STEP_SECONDS
  }
}

export function startMusic(): void {
  if (!createContext() || !ctx || !musicBus) return
  if (!getProgress().settings.music) return
  if (ctx.state === 'suspended') void ctx.resume()
  if (musicPlaying) return

  musicPlaying = true
  nextNoteTime = ctx.currentTime + 0.1
  step = 0
  musicBus.gain.cancelScheduledValues(ctx.currentTime)
  musicBus.gain.setValueAtTime(0.0001, ctx.currentTime)
  musicBus.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.5)
  musicTimer = window.setInterval(schedulerTick, LOOKAHEAD_MS)
}

export function stopMusic(): void {
  if (musicTimer !== undefined) {
    window.clearInterval(musicTimer)
    musicTimer = undefined
  }
  musicPlaying = false
  if (ctx && musicBus) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime)
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime)
    musicBus.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
  }
}

export function setMusicEnabled(on: boolean): void {
  if (on) startMusic()
  else stopMusic()
}

/** משתיק זמנית בזמן שהמשחק מדבר, כדי שהמילה תישמע בבירור. */
export function duckMusic(duck: boolean): void {
  if (!ctx || !musicBus || !musicPlaying) return
  const target = duck ? 0.035 : 0.12
  musicBus.gain.cancelScheduledValues(ctx.currentTime)
  musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime)
  musicBus.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.25)
}

// ------------------------------------------------------------- אפקטים

/**
 * מתג "מוזיקה וצלילים" בהגדרות שולט גם על אפקטי הצליל,
 * כי מבחינת דניאל זה מתג אחד: או שיש צלילים במשחק או שאין.
 * הקריינות היא מתג נפרד לגמרי.
 */
function sfxAllowed(): GainNode | null {
  if (!createContext() || !ctx || !sfxBus) return null
  if (!getProgress().settings.music) return null
  if (ctx.state === 'suspended') void ctx.resume()
  return sfxBus
}

/** צליל הצלחה: ארפג'ו עולה, שמח ולא צורם. */
export function sfxSuccess(): void {
  const bus = sfxAllowed()
  if (!bus || !ctx) return
  const t = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => envTone(f, t + i * 0.09, 0.45, 0.22, 'triangle', bus))
  envTone(1567.98, t + 0.34, 0.7, 0.08, 'sine', bus)
}

/** צליל ניסיון נוסף: רך, יורד מעט, בלי שום תחושת אזעקה. */
export function sfxRetry(): void {
  const bus = sfxAllowed()
  if (!bus || !ctx) return
  const t = ctx.currentTime
  envTone(392.0, t, 0.22, 0.16, 'sine', bus)
  envTone(329.63, t + 0.16, 0.32, 0.14, 'sine', bus)
}

/** צליל איסוף כוכב או יהלום: פעמון קצר ונוצץ. */
export function sfxStar(): void {
  const bus = sfxAllowed()
  if (!bus || !ctx) return
  const t = ctx.currentTime
  envTone(1318.51, t, 0.35, 0.18, 'sine', bus)
  envTone(1975.53, t + 0.05, 0.28, 0.1, 'sine', bus)
}

/** צליל ירידת יהלום: נשיפה עדינה, לא מפחידה. */
export function sfxDiamondLost(): void {
  const bus = sfxAllowed()
  if (!bus || !ctx) return
  const t = ctx.currentTime
  envTone(587.33, t, 0.3, 0.12, 'sine', bus, 392.0)
}

/** צליל פתיחת שער: שאיפה מסוננת ואז פעמון חגיגי. */
export function sfxGate(): void {
  const bus = sfxAllowed()
  if (!bus || !ctx) return
  const t = ctx.currentTime
  noiseBurst(t, 0.9, 0.1, 300, 2600, bus)
  envTone(392.0, t + 0.5, 0.7, 0.16, 'triangle', bus)
  envTone(587.33, t + 0.65, 0.7, 0.14, 'triangle', bus)
  envTone(783.99, t + 0.8, 0.9, 0.14, 'triangle', bus)
}

/** צליל לחיצה קטן ונעים. */
export function sfxClick(): void {
  const bus = sfxAllowed()
  if (!bus || !ctx) return
  envTone(880, ctx.currentTime, 0.09, 0.09, 'sine', bus)
}

// ------------------------------------------------------------- הקלטות אמיתיות

/**
 * נקודת החיבור להקלטות אמיתיות.
 *
 * כרגע כל המילים מוקראות בקריינות של הדפדפן, וזה עובד בלי אף קובץ
 * ובלי תלות ברשת. אם יתווספו הקלטות של מורה, מייבאים אותן כאן:
 *
 *   import helloMp3 from '../assets/audio/hello.mp3'
 *   export const RECORDED_AUDIO: Record<string, string> = { hello: helloMp3 }
 *
 * המשחק יעדיף אוטומטית הקלטה על הקריינות הסינתטית עבור כל מילה שיש
 * לה audioKey שמופיע כאן. מילה בלי הקלטה ממשיכה לעבוד כרגיל, ולכן
 * אפשר להוסיף הקלטות בהדרגה ולא הכול בבת אחת.
 */
export const RECORDED_AUDIO: Record<string, string> = {}

export function hasRecording(audioKey: string | undefined): boolean {
  return !!audioKey && audioKey in RECORDED_AUDIO
}

/** מנגן הקלטה. מחזיר false אם אין הקלטה או אם הניגון נכשל. */
export function playRecording(audioKey: string | undefined, onEnd?: () => void): boolean {
  if (!audioKey || !(audioKey in RECORDED_AUDIO)) return false
  try {
    const el = new Audio(RECORDED_AUDIO[audioKey])
    el.addEventListener('ended', () => onEnd?.())
    el.addEventListener('error', () => onEnd?.())
    void el.play()
    return true
  } catch {
    return false
  }
}

/** צליל סיום אזור: פאנפרה קצרה ושמחה. */
export function sfxAreaComplete(): void {
  const bus = sfxAllowed()
  if (!bus || !ctx) return
  const t = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]
  notes.forEach((f, i) => envTone(f, t + i * 0.13, 0.6, 0.2, 'triangle', bus))
}
