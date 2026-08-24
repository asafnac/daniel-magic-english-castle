/**
 * המרדף אחרי פיפ.
 *
 * זה האי הראשון של משחק נקי: אין כאן אנגלית, אין שאלה ואין ניקוד
 * לימודי. דניאל רודפת אחרי דרקון בגינה, וזהו.
 *
 * **הכלל היחיד שלא נשבר: אי אפשר להפסיד.**
 *
 * זה נשמע כמו ויתור על מתח, וזה ההפך. המתח כאן לא בא מהסיכון להיכשל
 * אלא מהמרדף עצמו - פיפ מהיר ממנה, אבל הוא נעצר לאכול תפוחים, וזה
 * הרגע שבו אפשר לתפוס אותו. הוא גם מתעייף עם הזמן.
 *
 * ואחרי כדקה קורה הדבר שסוגר את זה סופית: **פיפ מפסיק לברוח ומתחיל
 * להתקרב אליה.** הוא נמאס לו לרוץ והוא רוצה שישחקו איתו - וזה גם
 * מה שכתוב בסוף המרדף, אז זו לא רק הנדסה אלא הסיפור עצמו. מהרגע
 * הזה התפיסה מובטחת גם לילדה שמכוונת בערך.
 *
 * בלי החלק הזה, ילדה שהאצבע שלה נגררת קצת אחרי הדרקון יכולה לרדוף
 * לנצח בלי לתפוס. בדיקה שמדמה בדיוק את זה היא שגילתה את הבעיה.
 *
 * ילדה עם קושי בקשב לא צריכה עוד מקום שבו היא נכשלת. היא צריכה מקום
 * שבו כיף, והתמדה משתלמת.
 *
 * הלוגיקה כאן טהורה: אין DOM, אין canvas ואין מאזינים. המסך מצייר
 * את המצב, והבדיקות מריצות אותו בלי דפדפן.
 */

export interface Vec {
  x: number
  y: number
}

export interface Apple {
  pos: Vec
  /** נאכל כבר. נשאר במערך כדי שהציור ידע להעלים אותו ברכות. */
  eaten: boolean
}

export interface ChaseState {
  princess: Vec
  pip: Vec
  apples: Apple[]
  /** כמה שניות עברו. */
  time: number
  /** פיפ עוצר לאכול, וזה הרגע לתפוס אותו. */
  eating: number
  /** נתפס. */
  caught: boolean
  /** רמז ויזואלי: קרובה מאוד. */
  close: boolean
}

/** המגרש הוא ריבוע 0..1, כדי שהמשחק לא יהיה תלוי בגודל המסך. */
const SPEED_PRINCESS = 0.52
const SPEED_PIP = 0.60
const EAT_SECONDS = 1.5
const CATCH_DISTANCE = 0.08
const CLOSE_DISTANCE = 0.2
/** מתי פיפ מתחיל להתעייף, ומתי הוא כבר איטי ממנה בבירור. */
const TIRED_FROM = 15
const TIRED_TO = 45
const TIRED_SPEED = 0.28
/** מתי פיפ מתעייף מלברוח ומתחיל לחפש אותה. */
const FRIENDLY_FROM = 50

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp01(v: number): number {
  return v < 0.05 ? 0.05 : v > 0.95 ? 0.95 : v
}

export class ChaseGame {
  readonly state: ChaseState
  /** לאן דניאל מכוונת. המסך מעדכן את זה מהאצבע. */
  target: Vec

  constructor(private readonly random: () => number = Math.random) {
    this.state = {
      princess: { x: 0.5, y: 0.82 },
      pip: { x: 0.5, y: 0.2 },
      apples: this.scatterApples(),
      time: 0,
      eating: 0,
      caught: false,
      close: false,
    }
    this.target = { ...this.state.princess }
  }

  private scatterApples(): Apple[] {
    // פזורים בשוליים, כדי שהמרדף יעבור בכל המגרש ולא יתקבע במרכז.
    const spots: Vec[] = [
      { x: 0.16, y: 0.24 },
      { x: 0.84, y: 0.26 },
      { x: 0.2, y: 0.66 },
      { x: 0.8, y: 0.7 },
      { x: 0.5, y: 0.45 },
    ]
    return spots.map((pos) => ({ pos, eaten: false }))
  }

  /** כמה מהר פיפ עכשיו. יורד עם הזמן, ומתאפס כמעט לגמרי באכילה. */
  private pipSpeed(): number {
    if (this.state.eating > 0) return 0.04
    const t = this.state.time
    if (t <= TIRED_FROM) return SPEED_PIP
    const k = Math.min(1, (t - TIRED_FROM) / (TIRED_TO - TIRED_FROM))
    return SPEED_PIP + (TIRED_SPEED - SPEED_PIP) * k
  }

  /** התפוח הקרוב ביותר שעוד לא נאכל. */
  private nextApple(): Apple | null {
    let best: Apple | null = null
    let bestD = Infinity
    for (const apple of this.state.apples) {
      if (apple.eaten) continue
      const d = dist(this.state.pip, apple.pos)
      if (d < bestD) {
        bestD = d
        best = apple
      }
    }
    return best
  }

  /**
   * צעד אחד.
   *
   * dt בשניות. מוגבל מלמעלה כי לשונית שחוזרת מרקע מוסרת פער ענק,
   * וקפיצה של שנייה שלמה הייתה מעבירה את פיפ דרך חצי המגרש.
   */
  step(dtRaw: number): void {
    const s = this.state
    if (s.caught) return
    const dt = Math.min(dtRaw, 0.05)
    s.time += dt

    // הנסיכה נמשכת לאן שהאצבע. ההשהיה מכוונת: מרדף שבו הדמות
    // מודבקת לאצבע הוא לא מרדף.
    const toTarget = { x: this.target.x - s.princess.x, y: this.target.y - s.princess.y }
    const dTarget = Math.hypot(toTarget.x, toTarget.y)
    if (dTarget > 0.004) {
      const step = Math.min(SPEED_PRINCESS * dt, dTarget)
      s.princess.x = clamp01(s.princess.x + (toTarget.x / dTarget) * step)
      s.princess.y = clamp01(s.princess.y + (toTarget.y / dTarget) * step)
    }

    if (s.eating > 0) {
      s.eating = Math.max(0, s.eating - dt)
    } else {
      const away = { x: s.pip.x - s.princess.x, y: s.pip.y - s.princess.y }
      const d = Math.hypot(away.x, away.y) || 1

      // אחרי מספיק זמן הוא נמאס לו לברוח ומתחיל להתקרב אליה. זה
      // מה שהופך את הסוף לבטוח, וזה גם מה שקורה בסיפור.
      const apple = this.nextApple()
      let dir: Vec
      if (s.time > FRIENDLY_FROM) {
        const wobble = (this.random() - 0.5) * 0.6
        dir = {
          x: -away.x / d + away.y / d * wobble,
          y: -away.y / d + -away.x / d * wobble,
        }
        const dl = Math.hypot(dir.x, dir.y) || 1
        dir = { x: dir.x / dl, y: dir.y / dl }
      } else if (d > 0.34 && apple) {
        const toApple = { x: apple.pos.x - s.pip.x, y: apple.pos.y - s.pip.y }
        const da = Math.hypot(toApple.x, toApple.y) || 1
        dir = { x: toApple.x / da, y: toApple.y / da }
      } else {
        // בריחה עם סטייה קלה, אחרת הוא רץ בקו ישר לפינה ונתקע שם
        const wobble = (this.random() - 0.5) * 0.9
        dir = {
          x: away.x / d + -away.y / d * wobble,
          y: away.y / d + away.x / d * wobble,
        }
        const dl = Math.hypot(dir.x, dir.y) || 1
        dir = { x: dir.x / dl, y: dir.y / dl }
      }

      const speed = this.pipSpeed()
      s.pip.x = clamp01(s.pip.x + dir.x * speed * dt)
      s.pip.y = clamp01(s.pip.y + dir.y * speed * dt)

      // הגיע לתפוח: עוצר לאכול. זה החלון לתפוס אותו.
      if (apple && dist(s.pip, apple.pos) < 0.05) {
        apple.eaten = true
        s.eating = EAT_SECONDS
      }
    }

    const gap = dist(s.princess, s.pip)
    s.close = gap < CLOSE_DISTANCE
    if (gap < CATCH_DISTANCE) s.caught = true
  }

  /** כמה תפוחים פיפ הספיק לחסל. לתצוגה בלבד. */
  get eatenApples(): number {
    return this.state.apples.filter((a) => a.eaten).length
  }
}
