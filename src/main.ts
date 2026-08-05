/**
 * נקודת הכניסה.
 *
 * בודקת שהדפדפן תומך ב-WebGL, טוענת את ההתקדמות השמורה,
 * ומרימה את המשחק. כל תקלה בשלב הזה מסתיימת במסך עברי ידידותי
 * ולא במסך לבן.
 */

import './styles/base.css'
import './styles/screens.css'
import './styles/task.css'
import { App } from './app/App'
import { loadProgress } from './learning/progress'
import { startSync } from './learning/sync'
import { syncCustomWords } from './learning/wordbank'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function showFatal(title: string, body: string): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = ''
  const box = document.createElement('div')
  box.className = 'screen fatal-screen'
  box.innerHTML = `
    <div class="card fatal-card">
      <div class="fatal-emoji">🏰</div>
      <h1 class="screen-title"></h1>
      <p class="screen-sub"></p>
      <button class="big-btn gold" type="button"><span class="big-btn-emoji">🔄</span><span class="big-btn-label">לנסות שוב</span></button>
    </div>`
  const h = box.querySelector('h1')
  const p = box.querySelector('p')
  if (h) h.textContent = title
  if (p) p.textContent = body
  box.querySelector('button')?.addEventListener('click', () => window.location.reload())
  app.appendChild(box)
  hideBoot()
}

function hideBoot(): void {
  const boot = document.getElementById('boot')
  if (!boot) return
  boot.classList.add('hide')
  window.setTimeout(() => boot.remove(), 500)
}

function start(): void {
  const app = document.getElementById('app')
  if (!app) return

  if (!hasWebGL()) {
    showFatal(
      'הדפדפן הזה לא יכול להציג את הטירה',
      'המשחק צריך דפדפן שתומך בתלת-ממד. אפשר לנסות לפתוח אותו ב-Chrome או ב-Edge מעודכנים.',
    )
    return
  }

  try {
    const save = loadProgress()
    // מילים שההורה הוסיף הופכות למילים רגילות במאגר לפני שהמשחק עולה,
    // כדי שכל השאר לא יצטרך לדעת שהן שונות.
    syncCustomWords(save)
    new App(app)
    hideBoot()
    // הסנכרון עולה אחרי המשחק ולא לפניו. אם השרת איטי או לא זמין,
    // דניאל כבר משחקת, וזה בדיוק הסדר הנכון.
    startSync()
  } catch (err) {
    console.error(err)
    showFatal('משהו השתבש בדרך לטירה', 'אפשר לנסות לרענן את הדף. ההתקדמות שלך שמורה.')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true })
} else {
  start()
}
