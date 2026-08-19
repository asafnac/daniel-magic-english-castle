/**
 * הגדרות הסנכרון: כתובת השרת וקוד המשפחה.
 *
 * הקובץ הזה קיים כדי לענות על שאלה אחת: איפה הקוד יושב. התשובה היא
 * **מפתח localStorage נפרד, ולעולם לא בתוך השמירה.**
 *
 * זו לא קפדנות לשמה. השמירה היא מה שנשלח לשרת, מה שנשמר בגיבוי ומה
 * שהורה מייצא כדי להסתכל עליו. הקוד הוא הסוד היחיד שמגן על ההתקדמות
 * של דניאל. קוד בתוך השמירה הוא סיסמה בתוך קובץ שההורה חושב שהוא דוח,
 * והוא היה עובר לשרת בכל דחיפה - כלומר השרת היה מקבל את המפתח לתא
 * שהוא עצמו מגן עליו.
 *
 * הפרדה נוספת שיוצאת מזה בחינם: הקוד שייך למכשיר, לא לילדה. מיזוג בין
 * שני מכשירים לא נוגע בו, ומכשיר שמסנכרן לא יכול לשנות את הכתובת של
 * מכשיר אחר.
 */

const KEY = 'dmec:sync'

export interface SyncConfig {
  /** כתובת השרת. ריק פירושו שהמשחק עובד מקומית בלבד. */
  url: string
  /** קוד המשפחה. מזהה אקראי, בלי שם, בלי סיסמה ובלי שום פרט אישי. */
  code: string
  /** מתי הסתיים סנכרון מוצלח אחרון. */
  lastAt: number
  /** מה נכשל בפעם האחרונה, בעברית. ריק כשהכל תקין. */
  lastError: string
}

function empty(): SyncConfig {
  return { url: '', code: '', lastAt: 0, lastError: '' }
}

export function readSyncConfig(): SyncConfig {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<SyncConfig>
    return {
      url: typeof parsed.url === 'string' ? parsed.url : '',
      code: typeof parsed.code === 'string' ? parsed.code : '',
      lastAt: typeof parsed.lastAt === 'number' && Number.isFinite(parsed.lastAt) ? parsed.lastAt : 0,
      lastError: typeof parsed.lastError === 'string' ? parsed.lastError : '',
    }
  } catch {
    // אחסון חסום, מצב פרטי או JSON פגום. בלי סנכרון, עם משחק שעובד.
    return empty()
  }
}

export function writeSyncConfig(patch: Partial<SyncConfig>): SyncConfig {
  const next = { ...readSyncConfig(), ...patch }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* המשחק ממשיך גם בלי לזכור את ההגדרה */
  }
  return next
}

/** האם יש כתובת וקוד, כלומר האם בכלל יש למה לפנות. */
export function syncConfigured(config: SyncConfig = readSyncConfig()): boolean {
  return config.url.trim().length > 0 && config.code.trim().length > 0
}

/**
 * שמירה ישנה החזיקה את הקוד בתוכה. מעבירים אותו פעם אחת למקום הנכון.
 *
 * נקרא מתוך טעינת השמירה, ובכוונה לא דורס הגדרה קיימת: אם כבר יש קוד
 * במפתח הנפרד, הוא העדכני, ושמירה שהגיעה משרת לא אמורה לשנות אותו.
 */
export function adoptLegacySyncConfig(legacy: unknown): void {
  if (!legacy || typeof legacy !== 'object') return
  const l = legacy as { url?: unknown; code?: unknown; lastSync?: unknown }
  if (typeof l.url !== 'string' || typeof l.code !== 'string') return
  if (!l.url && !l.code) return
  const current = readSyncConfig()
  if (current.url || current.code) return
  writeSyncConfig({
    url: l.url,
    code: l.code,
    lastAt: typeof l.lastSync === 'number' && Number.isFinite(l.lastSync) ? l.lastSync : 0,
  })
}
