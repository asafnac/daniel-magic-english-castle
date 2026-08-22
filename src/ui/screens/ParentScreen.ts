/**
 * מסך ההורים.
 *
 * המסך היחיד במשחק שלא נכתב לדניאל אלא עליה. כאן מותר להראות מספרים,
 * אחוזים ונקודות חולשה - בדיוק מה שאסור להראות לילדה, כי מדד הצלחה
 * מול העיניים הופך למידה למבחן.
 *
 * ארבע לשוניות:
 * 1. סקירה - איפה היא עומדת בגדול.
 * 2. חוזקות וחולשות - הרשימה שבאמת עונה על "איפה היא צריכה עזרה".
 * 3. רשימות מילים - הכתבה מבית הספר נכנסת לתוך המשחק.
 * 4. סנכרון - אותה התקדמות ב-iPad, בטלפון ובמחשב.
 */

import { AREAS } from '../../learning/areas'
import { BAND_LABEL, bandOf, masteryOf, summarize, type ItemStat, type MasteryBand } from '../../learning/mastery'
import { PHONEMES } from '../../learning/phonics'
import { getProgress } from '../../learning/progress'
import { FRAMES } from '../../learning/sentences'
import {
  describeSave,
  disconnectSync,
  newFamilyCode,
  peekServer,
  saveSyncConfig,
  syncConfig,
  syncNow,
  syncState,
  testConnection,
} from '../../learning/sync'
import { syncConfigured } from '../../learning/syncConfig'
import { diagnoseInstall, manualInstallHint } from '../../app/installCheck'
import {
  cacheStatus,
  downloadForOffline,
  installable,
  installed,
  isIos,
  offlinePossible,
  onInstallChange,
  promptInstall,
  resetOffline,
} from '../../app/offline'
import { findWord } from '../../learning/vocabulary'
import { SCHOOL_SETS, addSchoolSet } from '../../learning/schoolSets'
import { createList, deleteList, parseWordList, setListActive } from '../../learning/wordbank'
import { bigButton, clear, el } from '../dom'

export interface ParentDeps {
  onBack: () => void
}

type Tab = 'overview' | 'skills' | 'lists' | 'sync' | 'install'

/** פריט שאפשר להציג בטבלה, אחרי שנפתר לשם קריא. */
interface Row {
  key: string
  label: string
  detail: string
  stat: ItemStat | undefined
  mastery: number
  band: MasteryBand
}

export function buildParentScreen(deps: ParentDeps): HTMLElement {
  const screen = el('div', { class: 'screen parent-screen' })
  screen.appendChild(el('h1', { class: 'screen-title', text: 'מסך הורים' }))
  screen.appendChild(el('p', { class: 'screen-sub', text: 'המספרים כאן הם בשבילך. דניאל לא רואה אותם אף פעם' }))

  let tab: Tab = 'overview'
  const body = el('div', { class: 'parent-body' })
  const tabs = el('div', { class: 'parent-tabs', role: 'tablist' })

  const render = (): void => {
    clear(body)
    if (tab === 'overview') body.appendChild(buildOverview())
    else if (tab === 'skills') body.appendChild(buildSkills())
    else if (tab === 'lists') body.appendChild(buildLists(render))
    else if (tab === 'sync') body.appendChild(buildSync(render))
    else body.appendChild(buildInstall(render))
  }

  const tabDefs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'overview', label: 'סקירה', emoji: '📊' },
    { id: 'skills', label: 'חוזקות וחולשות', emoji: '🎯' },
    { id: 'lists', label: 'רשימות מילים', emoji: '📝' },
    { id: 'sync', label: 'סנכרון', emoji: '🔄' },
    { id: 'install', label: 'התקנה', emoji: '📲' },
  ]

  for (const def of tabDefs) {
    const btn = el('button', {
      class: `parent-tab ${def.id === tab ? 'on' : ''}`.trim(),
      type: 'button',
      role: 'tab',
    })
    btn.appendChild(el('span', { class: 'parent-tab-emoji', text: def.emoji }))
    btn.appendChild(el('span', { text: def.label }))
    btn.addEventListener('click', () => {
      tab = def.id
      for (const other of tabs.querySelectorAll('.parent-tab')) other.classList.remove('on')
      btn.classList.add('on')
      render()
    })
    tabs.appendChild(btn)
  }

  screen.appendChild(tabs)
  screen.appendChild(body)
  const back = bigButton('חזרה', deps.onBack, { emoji: '↩️', variant: 'gold' })
  screen.appendChild(el('div', { class: 'row screen-actions' }, [back]))
  render()
  window.setTimeout(() => back.focus({ preventScroll: true }), 80)
  return screen
}

// ---------------------------------------------------------------- נתונים

/** כל הפריטים שראוי להציג, עם שם קריא. */
function allRows(): Row[] {
  const save = getProgress()
  const now = Date.now()
  const rows: Row[] = []

  const add = (key: string, label: string, detail: string): void => {
    const stat = save.stats[key]
    const mastery = masteryOf(stat, now)
    rows.push({ key, label, detail, stat, mastery, band: bandOf(mastery, stat) })
  }

  // רק מילים שדניאל באמת נפגשה איתן, או שההורה הוסיף. אין טעם להציג
  // 130 מילים שרובן עוד לא הופיעו במשחק: זה מסתיר את מה שחשוב.
  const listWords = new Set(save.lists.flatMap((l) => l.wordIds))
  const wordIds = new Set<string>(listWords)
  for (const key of Object.keys(save.stats)) {
    if (key.startsWith('word:')) wordIds.add(key.slice(5))
  }
  for (const id of wordIds) {
    const word = findWord(id) ?? save.customWords.find((w) => w.id === id)
    if (!word) continue
    add(`word:${id}`, word.english, word.hebrew)
  }

  for (const phoneme of PHONEMES) {
    add(`sound:${phoneme.id}`, phoneme.grapheme, `הצליל ${phoneme.hebrew}`)
  }

  for (const frame of FRAMES) {
    add(`frame:${frame.id}`, frame.title, frame.teaches)
  }

  return rows
}

function bandClass(band: MasteryBand): string {
  return `band-${band}`
}

// ---------------------------------------------------------------- סקירה

function buildOverview(): HTMLElement {
  const save = getProgress()
  const rows = allRows()
  const met = rows.filter((r) => r.stat && r.stat.seen > 0)
  const box = el('div', { class: 'parent-section' })

  const totals = summarize(met.map((r) => r.stat))
  const attempts = met.reduce((n, r) => n + (r.stat?.seen ?? 0), 0)
  const rights = met.reduce((n, r) => n + (r.stat?.correct ?? 0), 0)
  const accuracy = attempts > 0 ? Math.round((rights / attempts) * 100) : 0

  const days = new Set(
    met
      .map((r) => r.stat?.last ?? 0)
      .filter((t) => t > 0)
      .map((t) => new Date(t).toDateString()),
  ).size

  box.appendChild(
    statRow([
      { label: 'פריטים שנפגשה איתם', value: String(met.length) },
      { label: 'שולטת', value: String(totals.solid) },
      { label: 'צריכה חיזוק', value: String(totals.shaky) },
      { label: 'דיוק כולל', value: `${accuracy}%` },
      { label: 'ימים ששיחקה', value: String(days) },
      { label: 'כוכבים', value: String(save.stars) },
    ]),
  )

  if (met.length === 0) {
    box.appendChild(
      el('p', { class: 'parent-empty', text: 'עוד אין נתונים. הם יצטברו מאליהם ברגע שדניאל תשחק.' }),
    )
    return box
  }

  box.appendChild(el('h2', { class: 'parent-h2', text: 'איך מתחלקת השליטה' }))
  box.appendChild(bandBar(totals))

  box.appendChild(el('h2', { class: 'parent-h2', text: 'התקדמות באזורים' }))
  const areaList = el('div', { class: 'parent-areas' })
  for (const area of AREAS) {
    const ap = save.areas[area.id]
    const done = Math.min(ap?.completedTasks ?? 0, area.tasks.length)
    const row = el('div', { class: 'parent-area' })
    row.appendChild(el('span', { class: 'parent-area-emoji', text: ap?.unlocked ? area.emoji : '🔒' }))
    row.appendChild(el('span', { class: 'parent-area-title', text: area.title }))
    row.appendChild(el('span', { class: 'parent-area-bar' }, [el('i', { style: { width: `${(done / area.tasks.length) * 100}%` } })]))
    row.appendChild(el('span', { class: 'parent-area-note', text: ap?.done ? 'סיימה' : `${done}/${area.tasks.length}` }))
    areaList.appendChild(row)
  }
  box.appendChild(areaList)
  return box
}

function statRow(items: { label: string; value: string }[]): HTMLElement {
  const row = el('div', { class: 'parent-stats' })
  for (const item of items) {
    const cell = el('div', { class: 'parent-stat' })
    cell.appendChild(el('span', { class: 'parent-stat-value', text: item.value }))
    cell.appendChild(el('span', { class: 'parent-stat-label', text: item.label }))
    row.appendChild(cell)
  }
  return row
}

function bandBar(totals: { shaky: number; learning: number; solid: number; unseen: number }): HTMLElement {
  const total = Math.max(1, totals.shaky + totals.learning + totals.solid)
  const bar = el('div', { class: 'parent-bandbar' })
  const parts: [MasteryBand, number][] = [
    ['solid', totals.solid],
    ['learning', totals.learning],
    ['shaky', totals.shaky],
  ]
  for (const [band, count] of parts) {
    if (count === 0) continue
    const seg = el('span', { class: `parent-band ${bandClass(band)}`, style: { width: `${(count / total) * 100}%` } })
    seg.setAttribute('title', `${BAND_LABEL[band]}: ${count}`)
    bar.appendChild(seg)
  }
  const legend = el('div', { class: 'parent-legend' })
  for (const [band, count] of parts) {
    const item = el('span', { class: 'parent-legend-item' })
    item.appendChild(el('i', { class: `parent-dot ${bandClass(band)}` }))
    item.appendChild(el('span', { text: `${BAND_LABEL[band]} · ${count}` }))
    legend.appendChild(item)
  }
  return el('div', {}, [bar, legend])
}

// ---------------------------------------------------------------- מיומנויות

function buildSkills(): HTMLElement {
  const box = el('div', { class: 'parent-section' })
  const rows = allRows().filter((r) => r.stat && r.stat.seen > 0)

  if (rows.length === 0) {
    box.appendChild(el('p', { class: 'parent-empty', text: 'עוד אין מספיק נתונים. אחרי סבב או שניים זה יתמלא.' }))
    return box
  }

  const weak = rows.filter((r) => r.band === 'shaky' || r.band === 'learning').sort((a, b) => a.mastery - b.mastery)
  const strong = rows.filter((r) => r.band === 'solid').sort((a, b) => b.mastery - a.mastery)

  box.appendChild(el('h2', { class: 'parent-h2', text: 'כאן היא צריכה עזרה' }))
  box.appendChild(
    el('p', {
      class: 'parent-note',
      text: 'מסודר מהחלש ביותר. אלה גם הפריטים שהתרגול החופשי יביא לה קודם, אז לרוב אין צורך לעשות כלום.',
    }),
  )
  box.appendChild(rowTable(weak.slice(0, 20), 'הכל יושב טוב כרגע. אין פריט שדורש תשומת לב.'))

  box.appendChild(el('h2', { class: 'parent-h2', text: 'כאן היא חזקה' }))
  box.appendChild(rowTable(strong.slice(0, 20), 'עוד לא הצטברה שליטה יציבה. זה לוקח כמה מפגשים לכל פריט.'))

  const sounds = rows.filter((r) => r.key.startsWith('sound:'))
  if (sounds.length > 0) {
    box.appendChild(el('h2', { class: 'parent-h2', text: 'צלילים בלבד' }))
    box.appendChild(
      el('p', { class: 'parent-note', text: 'זה החלק שמנבא קריאה. צליל חלש כאן שווה יותר תשומת לב ממילה חלשה.' }),
    )
    box.appendChild(rowTable(sounds.sort((a, b) => a.mastery - b.mastery), ''))
  }

  return box
}

function rowTable(rows: Row[], emptyText: string): HTMLElement {
  if (rows.length === 0) {
    return el('p', { class: 'parent-empty', text: emptyText })
  }
  const wrap = el('div', { class: 'parent-table-wrap' })
  const table = el('table', { class: 'parent-table' })
  const head = el('tr', {}, [
    el('th', { text: 'פריט' }),
    el('th', { text: 'מה זה' }),
    el('th', { text: 'שליטה' }),
    el('th', { text: 'נכון' }),
    el('th', { text: 'נראה' }),
  ])
  table.appendChild(el('thead', {}, [head]))

  const body = el('tbody')
  for (const row of rows) {
    const tr = el('tr')
    tr.appendChild(el('td', { class: 'parent-item', text: row.label }))
    tr.appendChild(el('td', { class: 'parent-detail', text: row.detail }))

    const bar = el('span', { class: 'parent-meter' })
    bar.appendChild(el('i', { class: bandClass(row.band), style: { width: `${Math.round(row.mastery * 100)}%` } }))
    const meter = el('td', {}, [
      el('span', { class: 'parent-mastery' }, [bar, el('span', { class: 'parent-band-label', text: BAND_LABEL[row.band] })]),
    ])
    tr.appendChild(meter)

    tr.appendChild(el('td', { class: 'parent-num', text: `${row.stat?.correct ?? 0}/${row.stat?.seen ?? 0}` }))
    tr.appendChild(el('td', { class: 'parent-num', text: agoText(row.stat?.last ?? 0) }))
    body.appendChild(tr)
  }
  table.appendChild(body)
  wrap.appendChild(table)
  return wrap
}

function agoText(at: number): string {
  if (!at) return '—'
  const days = Math.floor((Date.now() - at) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 30) return `לפני ${days} ימים`
  return `לפני ${Math.floor(days / 30)} חודשים`
}

// ---------------------------------------------------------------- רשימות

function buildLists(refresh: () => void): HTMLElement {
  const save = getProgress()
  const box = el('div', { class: 'parent-section' })

  // דפי האותיות מוכנים מראש, לפני תיבת ההקלדה ולא אחריה: זה המסלול
  // שיהיה בשימוש בפועל. הקלדת שבע מילים עם תרגום על טאבלט היא בדיוק
  // מה שגורם לכך שדף עבודה פשוט לא נכנס למשחק.
  box.appendChild(el('h2', { class: 'parent-h2', text: 'דפי האותיות מבית הספר' }))
  box.appendChild(
    el('p', {
      class: 'parent-note',
      text: 'לחיצה אחת מוסיפה את כל המילים של הדף. דניאל תתרגל אותן גם כמילים וגם בשאלה שהדף שואל: איזו תמונה מתחילה בצליל הזה.',
    }),
  )

  const added = new Set(save.lists.map((l) => l.title))
  const sets = el('div', { class: 'parent-sets' })
  for (const set of SCHOOL_SETS) {
    const already = added.has(set.title)
    const btn = bigButton(
      already ? `${set.letter} · נוסף` : `${set.letter} · ${set.words.length} מילים`,
      () => {
        if (already) return
        addSchoolSet(set)
        refresh()
      },
      { emoji: already ? '✅' : '➕', variant: already ? 'small ghost' : 'small sky' },
    )
    if (already) btn.disabled = true
    sets.appendChild(btn)
  }
  box.appendChild(sets)

  box.appendChild(el('h2', { class: 'parent-h2', text: 'רשימת מילים משלך' }))
  box.appendChild(
    el('p', {
      class: 'parent-note',
      text: 'הדביקי או הקלידי מילה בכל שורה. אפשר להוסיף תרגום אחרי פסיק. מילה שכבר קיימת במשחק תתחבר למה שדניאל כבר יודעת עליה במקום להתחיל מאפס.',
    }),
  )

  const title = el('input', { class: 'parent-input' }) as HTMLInputElement
  title.type = 'text'
  title.placeholder = 'שם הרשימה, למשל: הכתבה 12.3'
  title.setAttribute('aria-label', 'שם הרשימה')

  const text = el('textarea', { class: 'parent-textarea' }) as HTMLTextAreaElement
  text.rows = 6
  text.placeholder = 'cat, חתול\ndog, כלב\nhouse, בית'
  text.setAttribute('aria-label', 'המילים ברשימה')

  const preview = el('p', { class: 'parent-note', role: 'status' })
  const updatePreview = (): void => {
    const parsed = parseWordList(text.value)
    preview.textContent = parsed.length === 0 ? '' : `${parsed.length} מילים: ${parsed.map((p) => p.english).join(', ')}`
  }
  text.addEventListener('input', updatePreview)

  const add = bigButton('להוסיף רשימה', () => {
    const parsed = parseWordList(text.value)
    if (parsed.length === 0) {
      preview.textContent = 'לא זיהיתי אף מילה. שורה אחת לכל מילה.'
      return
    }
    createList(title.value, parsed)
    refresh()
  }, { emoji: '➕', variant: 'sky' })

  box.appendChild(title)
  box.appendChild(text)
  box.appendChild(preview)
  box.appendChild(add)

  box.appendChild(el('h2', { class: 'parent-h2', text: 'הרשימות שקיימות' }))
  if (save.lists.length === 0) {
    box.appendChild(el('p', { class: 'parent-empty', text: 'עוד אין רשימות.' }))
    return box
  }

  for (const list of save.lists) {
    const card = el('div', { class: 'parent-list' })
    card.appendChild(el('span', { class: 'parent-list-title', text: list.title }))
    card.appendChild(el('span', { class: 'parent-list-count', text: `${list.wordIds.length} מילים` }))

    const words = list.wordIds
      .map((id) => findWord(id)?.english ?? save.customWords.find((w) => w.id === id)?.english ?? id)
      .join(', ')
    card.appendChild(el('span', { class: 'parent-list-words', text: words }))

    const toggle = bigButton(list.active ? 'פעילה בתרגול' : 'לא בתרגול', () => {
      setListActive(list.id, !list.active)
      refresh()
    }, { emoji: list.active ? '✅' : '⏸️', variant: 'small ghost' })
    const remove = bigButton('למחוק', () => {
      deleteList(list.id)
      refresh()
    }, { emoji: '🗑️', variant: 'small ghost' })

    card.appendChild(el('div', { class: 'row' }, [toggle, remove]))
    box.appendChild(card)
  }

  return box
}

// ---------------------------------------------------------------- סנכרון

function buildSync(refresh: () => void): HTMLElement {
  const config = syncConfig()
  const box = el('div', { class: 'parent-section' })

  box.appendChild(el('h2', { class: 'parent-h2', text: 'אותה התקדמות בכל מכשיר' }))
  box.appendChild(
    el('p', {
      class: 'parent-note',
      text: 'בלי הגדרה, ההתקדמות נשמרת רק על המכשיר הזה. עם כתובת שרת וקוד משפחה, דניאל יכולה לשחק ב-iPad ובטלפון ולהמשיך מאותו מקום. אין כאן חשבון, אימייל או סיסמה: הקוד הוא כל מה שיש, והוא לא מכיל שום פרט אישי.',
    }),
  )

  const status = el('p', { class: `parent-sync-state state-${syncState().state}`, role: 'status', text: syncState().message })

  const url = el('input', { class: 'parent-input' }) as HTMLInputElement
  url.type = 'url'
  url.value = config.url
  url.placeholder = 'https://…workers.dev/'
  url.setAttribute('aria-label', 'כתובת השרת')
  // כתובת וקוד הם טקסט לועזי בתוך דף בעברית. בלי כיוון מפורש הדפדפן
  // מזיז את הלוכסן הסופי לתחילת השורה, וההורה רואה כתובת שנראית שגויה
  // ומתחיל "לתקן" אותה.
  url.dir = 'ltr'

  const code = el('input', { class: 'parent-input code' }) as HTMLInputElement
  code.type = 'text'
  code.value = config.code
  code.placeholder = 'קוד המשפחה'
  code.setAttribute('aria-label', 'קוד המשפחה')
  code.dir = 'ltr'
  // מקלדת של טאבלט מציעה תיקון אוטומטי ואות ראשונה גדולה. על קוד
  // אקראי שני אלה עושים רק נזק.
  code.autocapitalize = 'characters'
  code.autocomplete = 'off'
  code.spellcheck = false

  // ההשוואה בין המכשיר הזה לשרת. זה החלק שמונע בהלה: הורה שפותח את
  // המשחק במכשיר שדניאל לא שיחקה בו רואה מסך ריק, ובלי השורות האלה
  // אין לו דרך להבחין בין "המכשיר הזה עוד לא סונכרן" לבין "הכל נמחק".
  const compare = el('div', { class: 'parent-compare', role: 'status' })
  // שומר על תשובה ישנה שהגיעה באיחור מלדרוס תשובה חדשה יותר.
  let compareToken = 0

  const showCompare = (): void => {
    if (!syncConfigured(syncConfig())) {
      clear(compare)
      return
    }
    const token = ++compareToken
    clear(compare)
    compare.appendChild(el('p', { class: 'parent-note', text: 'בודק מה יש בשרת…' }))
    void peekServer().then((res) => {
      if (token !== compareToken) return
      clear(compare)
      const here = describeSave(getProgress())
      compare.appendChild(compareLine('כאן', here ?? '—'))
      if (!res.ok) {
        compare.appendChild(el('p', { class: 'parent-sync-state state-error', text: res.message }))
        return
      }
      compare.appendChild(compareLine('בשרת', describeSave(res.save) ?? 'עדיין ריק'))
      compare.appendChild(compareLine('עודכן', res.updatedAt ? whenText(res.updatedAt) : '—'))
      if (res.save) {
        compare.appendChild(
          el('p', {
            class: 'parent-note strong',
            text: 'ההתקדמות קיימת בשרת. לחיצה על "לסנכרן עכשיו" תוריד אותה למכשיר הזה, ולא תמחק שום דבר משני הצדדים.',
          }),
        )
      }
    })
  }

  const makeCode = bigButton('לייצר קוד חדש', () => {
    code.value = newFamilyCode()
    status.textContent = 'קוד חדש נוצר. כדאי לשמור אותו, ולהקליד אותו גם במכשירים האחרים. לחצי "לסנכרן עכשיו" כדי לשמור אותו כאן.'
  }, { emoji: '🎲', variant: 'small ghost' })

  const test = bigButton('לבדוק חיבור', () => {
    status.textContent = 'בודק…'
    void testConnection(url.value, code.value).then((r) => {
      status.textContent = r.message
    })
  }, { emoji: '🔌', variant: 'small ghost' })

  // כפתור אחד שגם שומר וגם מסנכרן, ותמיד לפי מה שעל המסך.
  // גרסה שדרשה "לשמור" קודם ואז לא עשתה כלום היא בדיוק מה שגורם
  // לכפתור להיראות שבור.
  const syncButton = bigButton('לסנכרן עכשיו', () => {
    if (!url.value.trim() || !code.value.trim()) {
      status.textContent = 'צריך גם כתובת שרת וגם קוד משפחה לפני שאפשר לסנכרן.'
      return
    }
    saveSyncConfig(url.value, code.value)
    status.textContent = 'מסנכרן…'
    void syncNow().then((r) => {
      status.textContent = r.message
      showCompare()
      refresh()
    })
  }, { emoji: '🔄', variant: 'sky' })

  box.appendChild(el('label', { class: 'parent-label', text: 'כתובת השרת' }))
  box.appendChild(url)
  box.appendChild(el('label', { class: 'parent-label', text: 'קוד המשפחה' }))
  box.appendChild(code)
  box.appendChild(el('div', { class: 'row' }, [makeCode, test]))
  box.appendChild(syncButton)
  box.appendChild(status)
  box.appendChild(compare)

  if (syncConfigured(config) && config.lastAt > 0) {
    box.appendChild(el('p', { class: 'parent-note', text: `סונכרן לאחרונה ${agoText(config.lastAt)}.` }))
  }

  if (syncConfigured(config)) {
    box.appendChild(
      bigButton('לנתק את המכשיר הזה', () => {
        disconnectSync()
        status.textContent = syncState().message
        refresh()
      }, { emoji: '🔌', variant: 'small ghost' }),
    )
  }

  box.appendChild(
    el('p', {
      class: 'parent-note',
      text: 'השרת חייב להיות מאחורי HTTPS. הדפדפן חוסם ממילא פנייה לכתובת לא מאובטחת מדף מאובטח, וזה טוב: הקוד לא אמור לעבור גלוי ברשת. הקוד עצמו נשמר רק על המכשיר, לא בתוך קובץ ההתקדמות.',
    }),
  )

  showCompare()
  return box
}

function compareLine(label: string, value: string): HTMLElement {
  return el('p', { class: 'parent-compare-line' }, [
    el('span', { class: 'parent-compare-label', text: `${label}:` }),
    el('span', { class: 'parent-compare-value', text: value }),
  ])
}

/** תאריך מהשרת, בעברית. */
function whenText(iso: string): string {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return iso
  return `${agoText(at)}, ${new Date(at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
}

// ---------------------------------------------------------------- התקנה

function buildInstall(refresh: () => void): HTMLElement {
  const box = el('div', { class: 'parent-section' })

  box.appendChild(el('h2', { class: 'parent-h2', text: 'להתקין על המכשיר' }))
  box.appendChild(
    el('p', {
      class: 'parent-note',
      text: 'התקנה שמה את הטירה כאייקון במסך הבית, פותחת אותה במסך מלא בלי שורת כתובת, ומאפשרת לשחק גם בלי רשת - באוטו, בנסיעה או כשהאינטרנט נופל.',
    }),
  )

  const status = el('p', { class: 'parent-sync-state', role: 'status' })

  if (installed()) {
    status.textContent = 'המשחק כבר מותקן על המכשיר הזה. 🎉'
  } else if (isIos()) {
    status.textContent = 'באייפון ובאייפד ההתקנה ידנית, ורק דרך ספארי. באייפון זה גם מגן על ההתקדמות - ספארי מוחק נתונים של אתרים שלא נכנסים אליהם שבוע, ואפליקציה במסך הבית פטורה מזה.'
  } else if (installable()) {
    status.textContent = 'הדפדפן מוכן להתקין. לחיצה אחת וזה שם.'
  } else {
    status.textContent = 'הדפדפן עוד לא הציע להתקין. אפשר להתקין ידנית מהתפריט שלו, וזה עובד תמיד.'
  }

  if (!installed() && !isIos()) {
    box.appendChild(
      bigButton('להתקין את הטירה', () => {
        void promptInstall().then((r) => {
          status.textContent = r.message
        })
      }, { emoji: '📲', variant: 'sky' }),
    )
  }
  box.appendChild(status)

  // הדרך הידנית מוצגת תמיד ולא כנפילה לאחור, כי היא זו שעובדת בכל
  // מקרה: היא לא תלויה בהצעה שכרום שולח מתי שבא לו, והיא הדרך
  // היחידה שקיימת באייפד.
  if (!installed()) {
    box.appendChild(el('p', { class: 'parent-note strong', text: manualInstallHint() }))
  }

  // כשההתקנה לא עובדת, "הדפדפן לא הציע" הוא לא הסבר. הכפתור הזה
  // בודק על המכשיר הזה מה בדיוק חסר, ואומר את זה בעברית.
  if (!installed()) {
    const report = el('div', { class: 'parent-compare', role: 'status' })
    box.appendChild(
      bigButton('לבדוק למה אי אפשר להתקין', () => {
        clear(report)
        report.appendChild(el('p', { class: 'parent-note', text: 'בודק…' }))
        void diagnoseInstall(installable()).then((lines) => {
          clear(report)
          for (const line of lines) {
            report.appendChild(
              el('p', { class: 'parent-compare-line' }, [
                el('span', { class: 'parent-compare-label', text: line.ok === true ? '✅' : line.ok === false ? '❌' : 'ℹ️' }),
                el('span', { class: 'parent-compare-value' }, [
                  el('strong', { text: `${line.label}: ` }),
                  el('span', { text: line.detail }),
                ]),
              ]),
            )
          }
        })
      }, { emoji: '🔎', variant: 'small ghost' }),
    )
    box.appendChild(report)
  }

  box.appendChild(el('h2', { class: 'parent-h2', text: 'לשחק בלי רשת' }))
  const offlineNote = el('p', { class: 'parent-note', role: 'status', text: 'בודק…' })
  box.appendChild(offlineNote)

  if (!offlinePossible()) {
    offlineNote.textContent = 'מצב לא-מקוון דורש כתובת מאובטחת. בגרסה שרצה בפיתוח הוא כבוי, ובאתר עצמו הוא פועל.'
  } else {
    void cacheStatus().then((s) => {
      offlineNote.textContent = s
        ? `שמורים על המכשיר ${s.cached} מתוך ${s.total} קבצים.`
        : 'המשחק עוד לא סיים להתכונן. אחרי רענון אחד זה יופיע כאן.'
    })
    box.appendChild(
      bigButton('להוריד הכל עכשיו', () => {
        offlineNote.textContent = 'מוריד…'
        void downloadForOffline().then((r) => {
          offlineNote.textContent = r.message
        })
      }, { emoji: '⬇️', variant: 'small ghost' }),
    )
    box.appendChild(
      bigButton('לנקות ולהתחיל מחדש', () => {
        offlineNote.textContent = 'מנקה ומרענן…'
        void resetOffline()
      }, { emoji: '🧹', variant: 'small ghost' }),
    )
    box.appendChild(
      el('p', {
        class: 'parent-note',
        text: 'הניקוי מוחק רק את העותק השמור של המשחק ומרענן. ההתקדמות של דניאל לא נמצאת שם והיא לא נוגעת בה.',
      }),
    )
  }

  // ההצעה של הדפדפן עשויה להגיע דווקא כשהמסך הזה פתוח. בלי זה
  // ההורה היה ממשיך לראות "עוד לא הציע" בזמן שהכפתור כבר אפשרי.
  const stop = onInstallChange(() => {
    stop()
    // רק אם המסך הזה עדיין על המסך. הורה שיצא בינתיים לא אמור לגלות
    // שהלשונית קופצת מתחת לאצבע שלו.
    if (box.isConnected) refresh()
  })

  return box
}
