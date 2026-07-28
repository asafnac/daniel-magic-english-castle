/**
 * מערכת יהלומי החיים.
 *
 * ארבעה יהלומים בתחילת כל משימה. טעות מורידה יהלום אחד.
 * כשנגמרים היהלומים לא חוזרים לתחילת המשחק ולא מתחילים שלב מחדש,
 * אלא רק את המשימה הנוכחית, עם ארבעה יהלומים חדשים ורמז חזק יותר.
 */

export const MAX_DIAMONDS = 4

export class Lives {
  private diamonds = MAX_DIAMONDS
  /** כמה טעויות נעשו במשימה הנוכחית, כולל סבבים קודמים. קובע את עוצמת הרמז. */
  private hintLevel = 0
  /** כמה פעמים נגמרו היהלומים במשימה הזאת. */
  private restarts = 0

  get value(): number {
    return this.diamonds
  }

  get max(): number {
    return MAX_DIAMONDS
  }

  /** רמת הרמז הנוכחית: 0 = בלי רמז, 1 עד 3 = רמזים מדורגים. */
  get hint(): number {
    return Math.min(this.hintLevel, 3)
  }

  get restartCount(): number {
    return this.restarts
  }

  /** מתחילים משימה חדשה לגמרי. */
  startTask(): void {
    this.diamonds = MAX_DIAMONDS
    this.hintLevel = 0
    this.restarts = 0
  }

  /** מורידים יהלום. מחזיר true אם נגמרו היהלומים. */
  loseOne(): boolean {
    this.diamonds = Math.max(0, this.diamonds - 1)
    this.hintLevel += 1
    return this.diamonds === 0
  }

  /**
   * מתחילים מחדש את אותה משימה אחרי שנגמרו היהלומים.
   * היהלומים מתמלאים, אבל הרמז נשאר חזק, כדי שהפעם יהיה קל יותר.
   */
  restartSameTask(): void {
    this.diamonds = MAX_DIAMONDS
    this.restarts += 1
    // מתחילים ישר מרמז 2, שהוא הרמז שחושף את המשמעות בעברית.
    this.hintLevel = Math.max(this.hintLevel, 2)
  }

  /**
   * כמה אפשרויות שגויות להסתיר. מתחיל רק ברמז השלישי,
   * כדי שהמשימה תיהפך קלה ממש לפני שהתסכול מגיע.
   */
  hiddenDistractors(totalOptions: number): number {
    if (this.hint < 3) return 0
    return Math.max(0, totalOptions - 2)
  }
}
