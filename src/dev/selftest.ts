/**
 * בדיקה עצמית של שכבת הלמידה. קובץ זמני לפיתוח בלבד, לא חלק מהמשחק.
 * מריצים אותו בכתובת /selftest.html מול שרת הפיתוח.
 */

import { Castle } from '../game/Castle'
import { AREA_LAYOUTS, HALF_WIDTH, SPAWN, areaAt, areaEntry } from '../game/layout'
import { AREAS } from '../learning/areas'
import { eraseEverything, freshSave, getProgress, type SaveData } from '../learning/progress'
import { bandOf, freshStat, masteryOf, urgencyOf, type ItemStat } from '../learning/mastery'
import { mergeSaves } from '../learning/merge'
import { PRACTICE_ROUND, PracticeSession, candidates, practiceAvailable } from '../learning/practiceSession'
import { createList, deleteList, parseWordList } from '../learning/wordbank'
import { PHONICS_TYPES, createTask, type Task } from '../learning/questions'
import { PHONEMES, decodableWords, getPhoneme, phonemesUpTo, spellingMatchesSounds, wordsUpTo } from '../learning/phonics'
import { FRAMES, buildSentence, combinationCount, defaultPicks, neighbours } from '../learning/sentences'
import { AreaSession, type TaskSession } from '../learning/session'
import { WORDS, findWord, getWord } from '../learning/vocabulary'
import { TaskPanel } from '../ui/components/TaskPanel'
import '../styles/base.css'
import '../styles/screens.css'
import '../styles/task.css'

const lines: string[] = []
let failures = 0

function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failures += 1
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`)
}

function run(): void {
  eraseEverything()

  // ---------------------------------------------------------- מאגר המילים
  const ids = new Set(WORDS.map((w) => w.id))
  check('word ids unique', ids.size === WORDS.length, `${ids.size}/${WORDS.length}`)
  check('every color word has a hex', WORDS.filter((w) => w.category === 'colors').every((w) => !!w.color))
  check('every number word has a count', WORDS.filter((w) => w.category === 'numbers').every((w) => typeof w.count === 'number'))
  check('every letter word has a sentence', WORDS.filter((w) => w.category === 'letters').every((w) => !!w.sentence && !!w.letterEmoji))
  check('size words come in a pair of the same object', (() => {
    const sized = WORDS.filter((w) => w.sizeHint)
    return sized.length >= 2 && new Set(sized.map((w) => w.emoji)).size === 1
  })())
  check('every phrase item has a scene emoji', WORDS.filter((w) => w.category === 'phrases').every((w) => w.emoji.length > 0))
  check('phrase scenes are distinct enough to tell apart', (() => {
    const phrases = WORDS.filter((w) => w.category === 'phrases')
    return new Set(phrases.map((w) => w.emoji)).size === phrases.length
  })())

  // ---------------------------------------------------------- מנוע הצלילים
  const phonemeIds = new Set(PHONEMES.map((p) => p.id))
  check('phoneme ids unique', phonemeIds.size === PHONEMES.length, `${phonemeIds.size}/${PHONEMES.length}`)
  check('every phoneme has a spoken form that is not the letter name', PHONEMES.every((p) => p.say.length > 0 && p.say !== p.grapheme.toUpperCase()))
  check('every phoneme has a hebrew description', PHONEMES.every((p) => p.hebrew.length > 0))
  check('every phoneme anchor word exists', PHONEMES.every((p) => ids.has(p.anchor)))
  check(
    'every phoneme anchor word actually contains that sound',
    PHONEMES.every((p) => getWord(p.anchor).sounds?.includes(p.id) === true),
    PHONEMES.filter((p) => !getWord(p.anchor).sounds?.includes(p.id)).map((p) => p.id).join(','),
  )

  const decodable = decodableWords()
  check('there are decodable words at all', decodable.length >= 20, String(decodable.length))
  check(
    'every decodable word is spelled exactly by its sounds',
    decodable.every(spellingMatchesSounds),
    decodable.filter((w) => !spellingMatchesSounds(w)).map((w) => w.english).join(','),
  )
  check(
    'every decodable word uses only known sounds',
    decodable.every((w) => w.sounds.every((s) => phonemeIds.has(s))),
    decodable.filter((w) => !w.sounds.every((s) => phonemeIds.has(s))).map((w) => w.english).join(','),
  )
  // הטענה המרכזית של הסדר הזה: כבר הקבוצה הראשונה פותחת מילים אמיתיות.
  // אם זה מפסיק להיות נכון, אין שום סיבה לא ללמד לפי האלפבית.
  check('the first six sounds already open real words', wordsUpTo(1).length >= 5, String(wordsUpTo(1).length))
  check('each set of sounds opens more words than the one before', wordsUpTo(1).length < wordsUpTo(2).length && wordsUpTo(2).length < wordsUpTo(3).length,
    `${wordsUpTo(1).length}/${wordsUpTo(2).length}/${wordsUpTo(3).length}`)

  // ---------------------------------------------------------- אזורי הקריאה
  const phonicsAreas = AREAS.filter((a) => a.phonicsSet !== undefined)
  check('the castle has areas that teach reading', phonicsAreas.length >= 1, String(phonicsAreas.length))
  check(
    'reading tasks only live in areas that teach reading',
    AREAS.every((a) => a.phonicsSet !== undefined || a.tasks.every((t) => !PHONICS_TYPES.includes(t.type))),
  )

  for (const area of phonicsAreas) {
    const set = area.phonicsSet as 1 | 2 | 3
    const allowed = new Set(phonemesUpTo(set).map((p) => p.id))

    check(
      `${area.id}: every taught word can be decoded with the sounds known by now`,
      area.words.every((id) => (getWord(id).sounds ?? []).every((s) => allowed.has(s))),
      area.words.filter((id) => !(getWord(id).sounds ?? []).every((s) => allowed.has(s))).join(','),
    )

    for (const spec of area.tasks) {
      if (spec.type === 'sound-to-letter') {
        const target = spec.phoneme ? PHONEMES.find((p) => p.id === spec.phoneme) : undefined
        check(`${area.id}/${spec.phoneme}: the task names a real sound`, !!target)
        if (!target) continue
        check(`${area.id}/${spec.phoneme}: the sound belongs to this area or an earlier one`, allowed.has(target.id))
        // c ו-k עושים בדיוק אותו צליל. אם שניהם מוצעים יחד, לשאלה
        // "איזו אות עושה את הצליל הזה" יש שתי תשובות נכונות.
        const clashing = (spec.distractors ?? []).filter((d) => PHONEMES.find((p) => p.id === d)?.say === target.say)
        check(`${area.id}/${spec.phoneme}: no distractor makes the same sound as the answer`, clashing.length === 0, clashing.join(','))
        check(
          `${area.id}/${spec.phoneme}: distractors are sounds already taught`,
          (spec.distractors ?? []).every((d) => allowed.has(d)),
        )
      }

      if (spec.type === 'read-word' || spec.type === 'sound-out' || spec.type === 'blend-build') {
        const word = getWord(spec.word)
        check(`${area.id}/${spec.type}/${spec.word}: the word has a sound breakdown`, Array.isArray(word.sounds) && word.sounds.length > 0)
        check(
          `${area.id}/${spec.type}/${spec.word}: uses only sounds taught by now`,
          (word.sounds ?? []).every((s) => allowed.has(s)),
        )
      }

      // הסחות באורך שונה מאפשרות לנחות לפי אורך המילה בלי לפענח אותה
      if (spec.type === 'read-word' && spec.distractors) {
        const len = (getWord(spec.word).sounds ?? []).length
        check(
          `${area.id}/read/${spec.word}: distractors are the same length, so guessing by shape fails`,
          spec.distractors.every((d) => (getWord(d).sounds ?? []).length === len),
        )
      }
    }
  }

  // המשימה שבודקת קריאה אסור לה להשמיע את המילה מראש. ברגע שהמילה
  // נשמעת, זו כבר שאלת שמיעה, וזו בדיוק המשימה שהמשחק כבר יודע לתת.
  for (const area of phonicsAreas) {
    for (const spec of area.tasks.filter((t) => t.type === 'read-word')) {
      const task = createTask(area.id, spec)
      check(`${area.id}/read/${spec.word}: the word is not spoken before answering`, task.speakOnStart === undefined)
      check(`${area.id}/read/${spec.word}: the word is shown in writing`, task.showWord === getWord(spec.word).english.toLowerCase())
      check(`${area.id}/read/${spec.word}: sounding it out is offered as help`, (task.soundScript ?? []).length > 0)
    }
    for (const spec of area.tasks.filter((t) => t.type === 'blend-build')) {
      const task = createTask(area.id, spec)
      const build = task.build
      check(`${area.id}/build/${spec.word}: the task carries what to build`, !!build)
      if (!build) continue
      check(`${area.id}/build/${spec.word}: there are no ready made options to pick from`, task.options.length === 0)
      check(`${area.id}/build/${spec.word}: the tray holds every sound the word needs`, build.sounds.every((s) => build.tray.includes(s)))
      check(`${area.id}/build/${spec.word}: the tray also holds tiles that do not belong`, build.tray.length > build.sounds.length)
      check(`${area.id}/build/${spec.word}: the tiles spell the word exactly`, build.sounds.map((s) => getPhoneme(s).grapheme).join('') === build.text)
    }
  }

  // ---------------------------------------------------------- מנוע המשפטים
  check('frame ids unique', new Set(FRAMES.map((f) => f.id)).size === FRAMES.length)
  check('every frame has at least one slot to choose in', FRAMES.every((f) => f.slots.some((s) => !s.fixed)))
  check('every frame word exists', FRAMES.every((f) => f.slots.every((s) => (s.fixed ? ids.has(s.fixed) : (s.choices ?? []).every((c) => ids.has(c))))))
  check('every slot is either fixed or offers choices', FRAMES.every((f) => f.slots.every((s) => !!s.fixed !== !!s.choices)))

  for (const frame of FRAMES) {
    const combos = combinationCount(frame)
    // הטענה שמצדיקה את כל המנגנון: מסגרת אחת מייצרת הרבה משפטים.
    // אם צירוף אחד או שניים, זו רשימת משפטים ולא טבלת החלפה.
    check(`${frame.id}: makes many different sentences`, combos >= 6, String(combos))

    const base = buildSentence(frame.id, defaultPicks(frame))
    check(`${frame.id}: builds an english sentence`, base.english.split(' ').length === frame.slots.length, base.english)
    check(`${frame.id}: builds a hebrew translation`, base.hebrew.length > 0 && !base.hebrew.includes('undefined'), base.hebrew)

    const near = neighbours(frame.id, base.picks)
    check(`${frame.id}: has neighbours that differ by exactly one word`, near.length > 0, String(near.length))
    check(
      `${frame.id}: every neighbour really differs in exactly one slot`,
      near.every((n) => n.picks.filter((p, i) => p !== base.picks[i]).length === 1),
    )
    check(`${frame.id}: no neighbour is the sentence itself`, near.every((n) => n.english !== base.english))

    // כל צירוף חייב לייצר תמונה, אחרת יש מילה במשפט שלא משנה כלום
    const everyCombo = [base, ...near]
    check(`${frame.id}: every combination produces a scene`, everyCombo.every((s) => s.scene.emoji.length > 0))
    check(
      `${frame.id}: changing a word changes what you see or hear`,
      near.every((n) => n.english !== base.english && (n.scene.emoji !== base.scene.emoji || n.scene.color !== base.scene.color || n.scene.scale !== base.scene.scale || n.hebrew !== base.hebrew)),
    )
  }

  // מסגרות המשפט קיימות כדי לתקוף מבנים שבעברית פשוט אין, ולכן דובר
  // עברית משמיט אותם. אם המילים האלה ייעלמו מהמסגרות, נשארנו עם
  // תרגול אוצר מילים בתחפושת.
  const allFixed = new Set(FRAMES.flatMap((f) => f.slots.map((s) => s.fixed).filter((x): x is string => !!x)))
  check('some frame teaches the copula "is", which hebrew drops', allFixed.has('is'))
  check('some frame teaches the article "a", which hebrew has no equivalent for', allFixed.has('a'))
  check('some frame teaches "the"', allFixed.has('the'))
  check(
    'some frame puts an adjective before the noun, the opposite of hebrew',
    FRAMES.some((f) => {
      const adj = f.slots.findIndex((s) => s.role === 'size' || s.role === 'colour')
      const noun = f.slots.findIndex((s) => s.role === 'noun')
      return adj >= 0 && noun >= 0 && adj < noun
    }),
  )
  check(
    'when two adjectives meet, size always comes before colour',
    FRAMES.filter((f) => f.slots.some((s) => s.role === 'size') && f.slots.some((s) => s.role === 'colour')).every(
      (f) => f.slots.findIndex((s) => s.role === 'size') < f.slots.findIndex((s) => s.role === 'colour'),
    ),
  )

  // ---------------------------------------------------------- אזורי המשפט
  const sentenceAreas = AREAS.filter((a) => a.teachesSentences)
  check('the castle has areas that teach sentences', sentenceAreas.length >= 1, String(sentenceAreas.length))
  check(
    'sentence tasks only live in areas that teach sentences',
    AREAS.every((a) => a.teachesSentences || a.tasks.every((t) => t.type !== 'sentence-pick' && t.type !== 'sentence-build')),
  )

  for (const area of sentenceAreas) {
    for (const spec of area.tasks) {
      if (spec.type !== 'sentence-pick' && spec.type !== 'sentence-build') continue
      const frame = FRAMES.find((f) => f.id === spec.frame)
      check(`${area.id}: task names a real frame`, !!frame, spec.frame ?? '(none)')
      if (!frame) continue
      check(`${area.id}/${spec.frame}: picks cover every slot`, (spec.picks ?? []).length === frame.slots.length, String((spec.picks ?? []).length))
      check(
        `${area.id}/${spec.frame}: every pick is legal for its slot`,
        (spec.picks ?? []).every((p, i) => {
          const slot = frame.slots[i]
          return slot.fixed ? slot.fixed === p : (slot.choices ?? []).includes(p)
        }),
        (spec.picks ?? []).join(' '),
      )

      const task = createTask(area.id, spec)
      check(`${area.id}/${spec.frame}: the task carries the built sentence`, !!task.sentence)
      if (spec.type === 'sentence-pick') {
        check(`${area.id}/${spec.frame}: every option is a whole scene`, task.options.every((o) => !!o.scene))
        check(
          `${area.id}/${spec.frame}: the wrong options differ by one word only`,
          task.options.filter((o) => !o.correct).every((o) => {
            const other = o.english?.split(' ') ?? []
            const mine = task.sentence?.english.split(' ') ?? []
            return other.length === mine.length && other.filter((w, i) => w !== mine[i]).length === 1
          }),
        )
      }
      if (spec.type === 'sentence-build') {
        const build = task.sentenceBuild
        check(`${area.id}/${spec.frame}: build task carries its slots`, !!build)
        if (!build) continue
        check(`${area.id}/${spec.frame}: no ready made options to pick from`, task.options.length === 0)
        const needed = build.slots.map((s, i) => (s.fixed ? null : build.picks[i])).filter((x): x is string => x !== null)
        check(`${area.id}/${spec.frame}: the tray holds every word the sentence needs`, needed.every((w) => build.tray.includes(w)))
        check(`${area.id}/${spec.frame}: the tray also holds words that do not belong`, build.tray.length > needed.length)
        check(`${area.id}/${spec.frame}: the fixed words are given, not asked for`, build.slots.some((s) => !!s.fixed))
      }
    }
  }

  // ---------------------------------------------------------- מעקב שליטה
  eraseEverything()
  {
    const now = Date.UTC(2026, 0, 10)
    const DAY = 24 * 60 * 60 * 1000
    const make = (over: Partial<ItemStat>): ItemStat => ({ ...freshStat('word', 'x'), ...over })

    check('a word never met has no mastery', masteryOf(undefined, now) === 0)
    const fresh = make({ seen: 1, correct: 1, streak: 1, last: now, lastCorrect: now })
    const practised = make({ seen: 6, correct: 6, streak: 6, last: now, lastCorrect: now })
    check('answering right repeatedly beats answering right once', masteryOf(practised, now) > masteryOf(fresh, now))

    const guessed = make({ seen: 4, correct: 1, wrong: 3, streak: 0, last: now, lastCorrect: now - DAY })
    check('mostly wrong stays weak', masteryOf(guessed, now) < 0.4, String(masteryOf(guessed, now)))
    check('a weak item is called out as needing work', bandOf(masteryOf(guessed, now), guessed) === 'shaky')
    check('a solid item is called solid', bandOf(masteryOf(practised, now), practised) === 'solid')

    // ידע נשחק. בלי הדעיכה הזאת מילה שנלמדה פעם אחת לפני חצי שנה
    // הייתה נחשבת ידועה לנצח, והתרגול לא היה מחזיר אליה לעולם.
    const stale = make({ seen: 6, correct: 6, streak: 6, last: now - 120 * DAY, lastCorrect: now - 120 * DAY })
    check('knowledge fades when it is not revisited', masteryOf(stale, now) < masteryOf(practised, now), `${masteryOf(stale, now)} < ${masteryOf(practised, now)}`)

    check('something just answered is not asked again immediately', urgencyOf(make({ seen: 2, correct: 2, streak: 2, last: now, lastCorrect: now }), now) < 0.1)
    const shakyOld = make({ seen: 4, correct: 1, wrong: 3, streak: 0, last: now - 3 * DAY, lastCorrect: now - 9 * DAY })
    const solidOld = make({ seen: 9, correct: 9, streak: 9, last: now - 3 * DAY, lastCorrect: now - 3 * DAY })
    check('the weak item is practised before the solid one', urgencyOf(shakyOld, now) > urgencyOf(solidOld, now))
  }

  // ---------------------------------------------------------- מיזוג בין מכשירים
  {
    const base = freshSave()
    const dayOne: SaveData = {
      ...base,
      stars: 30,
      wordsLearned: ['cat', 'dog'],
      areas: { ...base.areas, 'colors-garden': { unlocked: true, done: true, completedTasks: 12, stars: 17 } },
      stats: { 'word:cat': { ...freshStat('word', 'cat'), seen: 6, correct: 6, streak: 6, bestStreak: 6, last: 5000, lastCorrect: 5000 } },
    }
    const dayTwo: SaveData = {
      ...freshSave(),
      stars: 44,
      wordsLearned: ['cat', 'fish'],
      areas: { ...base.areas, 'animals-yard': { unlocked: true, done: false, completedTasks: 5, stars: 5 } },
      stats: { 'word:cat': { ...freshStat('word', 'cat'), seen: 3, correct: 1, wrong: 2, streak: 0, bestStreak: 1, last: 9000, lastCorrect: 3000 } },
    }

    const merged = mergeSaves(dayOne, dayTwo)
    check('merge never loses stars', merged.stars === 44, String(merged.stars))
    check('merge keeps every word learned on either device', ['cat', 'dog', 'fish'].every((w) => merged.wordsLearned.includes(w)))
    check('an area finished on one device stays finished', merged.areas['colors-garden'].done === true)
    check('an area started on the other device comes along', merged.areas['animals-yard'].completedTasks === 5)
    check('mastery counters take the max and never inflate', merged.stats['word:cat'].seen === 6 && merged.stats['word:cat'].correct === 6)
    check('a broken streak from the newer device wins', merged.stats['word:cat'].streak === 0)

    // שלוש התכונות שמאפשרות לסנכרן שוב ושוב בלי שהמספרים יזחלו
    const flipped = mergeSaves(dayTwo, dayOne)
    // השוואה לפי תוכן ולא לפי סדר מפתחות. הטענה כאן היא שהמיזוג לא
    // משנה נתונים, ולא שהוא משמר סדר שדות באובייקט.
    const monotonic = (s: SaveData) => stableJson({ stars: s.stars, words: s.wordsLearned.slice().sort(), areas: s.areas, stats: s.stats })
    check('merging in either order gives the same learning data', monotonic(merged) === monotonic(flipped))
    check('merging a save with itself changes nothing', monotonic(mergeSaves(dayOne, dayOne)) === monotonic(dayOne))
    check('merging twice changes nothing more', monotonic(mergeSaves(merged, dayTwo)) === monotonic(merged))

    // מחיקה חייבת לשרוד סנכרון, אחרת רשימה שנמחקה חוזרת לחיים
    const withList: SaveData = { ...freshSave(), lists: [{ id: 'l1', title: 'הכתבה', wordIds: ['cat'], created: 100, active: true }] }
    const afterDelete: SaveData = { ...freshSave(), lists: [], deletedLists: ['l1'] }
    check('a deleted list does not come back from the other device', mergeSaves(afterDelete, withList).lists.length === 0)
  }

  // ---------------------------------------------------------- רשימות של ההורה
  eraseEverything()
  {
    const parsed = parseWordList('cat, חתול\ndog: כלב\nhouse - בית\n\n  fish\t דג ')
    check('a pasted word list is understood', parsed.length === 4, String(parsed.length))
    check('the english side is read correctly', parsed.map((p) => p.english).join(',') === 'cat,dog,house,fish', parsed.map((p) => p.english).join(','))
    check('the hebrew side is read correctly', parsed[0].hebrew === 'חתול' && parsed[3].hebrew === 'דג')

    const listId = createList('הכתבה שבוע 3', [{ english: 'cat', hebrew: 'חתול' }, { english: 'zebra', hebrew: 'זברה' }])
    const save = getProgress()
    const list = save.lists.find((l) => l.id === listId)
    check('the list was saved', !!list)
    check('a word the game already knows is reused, not duplicated', list?.wordIds.includes('cat') === true)
    check('a word the game did not know was created', save.customWords.some((w) => w.english === 'zebra'))
    check('a parent word becomes an ordinary word in the bank', !!findWord(save.customWords[0].id))
    check('a parent word can be turned into a real task', (() => {
      try {
        return !!createTask('free-practice', { type: 'listen-pick-image', word: save.customWords[0].id })
      } catch {
        return false
      }
    })())

    deleteList(listId)
    check('deleting a list removes it', getProgress().lists.length === 0)
    check('deleting a list leaves a tombstone so sync cannot resurrect it', getProgress().deletedLists.includes(listId))
    check('deleting a list does not delete words the game shipped with', !!findWord('cat'))
    check('deleting a list removes the words it invented', getProgress().customWords.length === 0)
  }

  // ---------------------------------------------------------- תרגול מסתגל
  eraseEverything()
  {
    check('with no history there is nothing to practise', practiceAvailable() === 0, String(practiceAvailable()))

    // משחקים אזור שלם, ואז בודקים שהתרגול יודע לבנות סבב ממנו
    const warmup = new AreaSession(AREAS[0].id)
    for (let i = 0; i < 40 && !warmup.isFinished; i++) {
      answerCorrectly(warmup)
      if (warmup.advance().areaCompleted) break
    }
    check('playing an area fills the mastery data', Object.keys(getProgress().stats).length > 0, String(Object.keys(getProgress().stats).length))
    check('now there is something to practise', practiceAvailable() > 0, String(practiceAvailable()))

    const pool = candidates()
    check('the practice pool is sorted, most urgent first', pool.every((c, i) => i === 0 || pool[i - 1].urgency >= c.urgency))
    check('the pool only holds things she has actually met', pool.every((c) => !!getProgress().stats[`${c.kind}:${c.id}`]))

    const round = new PracticeSession()
    check('a practice round has tasks', !round.isEmpty)
    check('a practice round is short on purpose', round.position.total <= PRACTICE_ROUND, String(round.position.total))
    check('practice tasks are marked as revision, so the wording is gentler', round.task.isPractice === true)

    let steps = 0
    let finished = false
    while (steps < 40 && !finished) {
      steps += 1
      answerCorrectly(round)
      finished = round.advance().areaCompleted
    }
    check('a practice round can be finished', finished, `steps=${steps}`)
    check('finishing practice reports how it went', round.completion.title.length > 0 && round.completion.text.includes('מתוך'))

    // מילה מרשימה של ההורה נכנסת לתרגול גם אם עוד לא נפגשה איתה
    const listId2 = createList('הכתבה', [{ english: 'zebra', hebrew: 'זברה' }])
    const zebra = getProgress().customWords.find((w) => w.english === 'zebra')
    check('a brand new word from the parent still enters practice', candidates().some((c) => c.id === zebra?.id), zebra?.id ?? '(none)')
    check('it is marked as coming from the list', candidates().find((c) => c.id === zebra?.id)?.fromList === 'הכתבה')
    deleteList(listId2)
  }
  eraseEverything()

  // ---------------------------------------------------------- הגדרות האזורים
  for (const area of AREAS) {
    check(`${area.id}: task count between 8 and 12`, area.tasks.length >= 8 && area.tasks.length <= 12, String(area.tasks.length))
    for (const spec of area.tasks) {
      try {
        getWord(spec.word)
      } catch {
        check(`${area.id}: task word "${spec.word}" exists`, false)
      }
      // במשימת צליל-לאות ההסחות הן מזהי צלילים, לא מזהי מילים
      const distractorsAreSounds = spec.type === 'sound-to-letter'
      for (const d of spec.distractors ?? []) {
        if (distractorsAreSounds) {
          check(`${area.id}: distractor sound "${d}" exists`, PHONEMES.some((ph) => ph.id === d))
          continue
        }
        try {
          getWord(d)
        } catch {
          check(`${area.id}: distractor "${d}" exists`, false)
        }
      }
      for (const p of spec.pairWords ?? []) {
        try {
          getWord(p)
        } catch {
          check(`${area.id}: pair word "${p}" exists`, false)
        }
      }
    }
    check(`${area.id}: every taught word exists`, area.words.every((w) => ids.has(w)))
  }

  // ---------------------------------------------------------- מחוללי משימות
  for (const area of AREAS) {
    for (const spec of area.tasks) {
      const task = createTask(area.id, spec)
      const correct = task.options.filter((o) => o.correct)
      // בנייה היא הפקה ולא בחירה, ולכן אין לה אפשרויות מוכנות בכלל
      if (task.type === 'say-it' || task.type === 'match-word-object' || task.type === 'blend-build' || task.type === 'sentence-build') {
        check(`${area.id}/${spec.type}/${spec.word}: no options needed`, task.options.length === 0)
        if (task.type === 'match-word-object') {
          check(`${area.id}/match/${spec.word}: has pairs`, (task.pairs?.length ?? 0) >= 2)
        }
      } else {
        check(`${area.id}/${spec.type}/${spec.word}: exactly one correct option`, correct.length === 1, String(correct.length))
        const optionIds = new Set(task.options.map((o) => o.id))
        check(`${area.id}/${spec.type}/${spec.word}: options are distinct`, optionIds.size === task.options.length)
      }
      check(`${area.id}/${spec.type}/${spec.word}: has 3 hints`, task.hints.length === 3)
      if (spec.type === 'color-pick') {
        const shapes = new Set(task.options.map((o) => o.shape))
        check(`${area.id}/color/${spec.word}: every option has a distinct shape`, shapes.size === task.options.length)
        check(`${area.id}/color/${spec.word}: every option has a hebrew label`, task.options.every((o) => !!o.label))
      }
      if (spec.type === 'counting' && (spec.variant ?? 'count-objects') === 'count-objects') {
        check(`${area.id}/counting/${spec.word}: stimulus matches the number`, task.stimulus?.repeat === getWord(spec.word).count)
      }
      if (spec.type === 'phrase-match') {
        // אם שתי סצנות נראות אותו דבר, המשימה אינה פתירה בעיניים
        const scenes = new Set(task.options.map((o) => o.emoji))
        check(`${area.id}/phrase/${spec.word}: every scene looks different`, scenes.size === task.options.length, `${scenes.size}/${task.options.length}`)
        check(`${area.id}/phrase/${spec.word}: speaks the whole phrase`, task.speakOnStart === getWord(spec.word).english)
      }
      if (spec.type === 'size-pick') {
        // גדול וקטן חייבים להיות אותו עצם, אחרת זה מלמד צורה ולא גודל
        const glyphs = new Set(task.options.map((o) => o.emoji))
        check(`${area.id}/size/${spec.word}: both options are the same object`, glyphs.size === 1)
        const scales = task.options.map((o) => o.scale ?? 0)
        check(`${area.id}/size/${spec.word}: the two options differ in scale`, new Set(scales).size === 2, scales.join(','))
        check(`${area.id}/size/${spec.word}: both options carry a hebrew label`, task.options.every((o) => !!o.label))
      }
    }
  }

  // ---------------------------------------------------------- סבב משימות מלא
  eraseEverything()
  const area = AREAS[0]
  const session = new AreaSession(area.id)

  // ארבע טעויות ברצף מחזירות אותנו לאותה משימה, לא למשחק מהתחלה
  const firstKey = session.task.key
  const wrongId = session.task.options.find((o) => !o.correct)!.id
  let last = session.answer(wrongId)
  check('mistake 1: 3 diamonds left', last.diamonds === 3, String(last.diamonds))
  check('mistake 1: gentle hint shown', !!last.hint)
  last = session.answer(wrongId)
  check('mistake 2: hebrew meaning revealed', last.hint?.includes(getWord(session.task.wordId).hebrew) === true, last.hint)
  last = session.answer(wrongId)
  check('mistake 3: distractors reduced to two', last.hideDistractors === session.task.options.length - 2)
  last = session.answer(wrongId)
  check('mistake 4: out of diamonds', last.outOfDiamonds && last.diamonds === 0)
  session.restartCurrentTask()
  check('restart keeps the same task', session.task.key === firstKey)
  check('restart gives four fresh diamonds', session.lives.value === 4, String(session.lives.value))
  check('restart starts from a strong hint', session.lives.hint >= 2, String(session.lives.hint))
  check('nothing was lost from progress', getProgress().areas[area.id].completedTasks === 0)

  // מסיימים את כל האזור בתשובות נכונות
  let guard = 0
  let completed = 0
  let unlocked: string | undefined
  while (guard++ < 60) {
    answerCorrectly(session)
    const outcome = session.advance()
    completed += 1
    if (outcome.areaCompleted) {
      unlocked = outcome.unlockedAreaId
      break
    }
  }
  check('area finished within a sane number of tasks', completed >= area.tasks.length && completed <= area.tasks.length + 3, String(completed))
  check('next area unlocked', unlocked === AREAS[1].id, String(unlocked))
  check('area marked done', getProgress().areas[area.id].done === true)
  check('stars awarded', getProgress().stars >= area.tasks.length, String(getProgress().stars))
  check('words recorded as learned', getProgress().wordsLearned.length > 0, String(getProgress().wordsLearned.length))

  // ---------------------------------------------------------- חזרה חכמה
  eraseEverything()
  const s2 = new AreaSession(AREAS[0].id)
  const missedWord = s2.task.wordId
  const missedType = s2.task.type
  s2.answer(s2.task.options.find((o) => !o.correct)!.id)
  check('mistake put the word in the practice queue', getProgress().needPractice.some((e) => e.id === missedWord))
  s2.answer(s2.task.options.find((o) => o.correct)!.id)
  s2.advance()
  let sawPractice = false
  let practiceType = ''
  for (let i = 0; i < 8; i++) {
    if (s2.task.isPractice && s2.task.wordId === missedWord) {
      sawPractice = true
      practiceType = s2.task.type
      break
    }
    answerCorrectly(s2)
    s2.advance()
  }
  check('the missed word came back for practice', sawPractice)
  check('practice used a different task type', practiceType !== '' && practiceType !== missedType, `${missedType} -> ${practiceType}`)

  // ---------------------------------------------------------- שמירה
  eraseEverything()
  const before = getProgress()
  before.stars = 42
  localStorage.setItem('dmec:v1', JSON.stringify(before))
  const reread = JSON.parse(localStorage.getItem('dmec:v1') ?? '{}')
  check('progress round-trips through localStorage', reread.stars === 42)
  localStorage.setItem('dmec:v1', '{{{ not json')
  check('corrupt save does not throw', (() => {
    try {
      JSON.parse(localStorage.getItem('dmec:v1') ?? '')
      return false
    } catch {
      return true
    }
  })())
  eraseEverything()

  runWorldChecks()
  runPanelChecks()

  lines.unshift(failures === 0 ? `ALL ${lines.length} CHECKS PASSED` : `${failures} FAILURES out of ${lines.length}`)
}

/**
 * בדיקות העולם התלת-ממדי בלי לולאת רינדור: בונים את הטירה, ומדמים
 * הליכה צעד אחר צעד מול מנוע ההתנגשות האמיתי.
 */
function runWorldChecks(): void {
  eraseEverything()
  const castle = new Castle()
  const col = castle.collision

  const RADIUS = 0.55
  const SPEED = 7.2
  const DT = 1 / 60

  /** מהלך קדימה או לצדדים למשך מספר שניות, ומחזיר את המיקום הסופי. */
  const walk = (from: { x: number; z: number }, dir: { x: number; z: number }, seconds: number) => {
    let { x, z } = from
    const steps = Math.round(seconds / DT)
    for (let i = 0; i < steps; i++) {
      const next = col.move(x, z, dir.x * SPEED * DT, dir.z * SPEED * DT, RADIUS)
      x = next.x
      z = next.z
    }
    return { x, z }
  }

  const garden = AREA_LAYOUTS[0]
  const gateZ = garden.gate!.z

  // מהחצר קדימה אל תוך גן הצבעים
  const afterWalk = walk(SPAWN, { x: 0, z: -1 }, 4)
  check('walks from the courtyard into the first area', afterWalk.z < garden.zStart - 2, `z=${afterWalk.z.toFixed(1)}`)

  // הקיר הצדדי עוצר, ולא נותן לצאת מהעולם
  const intoWall = walk({ x: 0, z: garden.zStart - 5 }, { x: 1, z: 0 }, 6)
  check('side wall blocks the player', intoWall.x < HALF_WIDTH, `x=${intoWall.x.toFixed(1)}`)
  check('player never leaves the world', Math.abs(intoWall.x) <= HALF_WIDTH)

  // אפשר להחליק לאורך קיר ולא להיתקע בו
  const slide = walk({ x: HALF_WIDTH - 1, z: garden.zStart - 5 }, { x: 0.7, z: -0.7 }, 2)
  check('player slides along a wall instead of sticking', slide.z < garden.zStart - 6, `z=${slide.z.toFixed(1)}`)

  // השער נעול, ולכן אי אפשר לעבור לאזור הבא
  check('gate starts locked', !castle.isGateOpen(garden.id))
  const atLockedGate = walk({ x: 0, z: garden.zEnd + 4 }, { x: 0, z: -1 }, 4)
  check('locked gate blocks the player', atLockedGate.z > gateZ, `z=${atLockedGate.z.toFixed(1)} gate=${gateZ}`)

  // אי אפשר לעקוף את השער מהצד
  const bypass = walk({ x: 0, z: garden.zEnd + 3 }, { x: 1, z: -1 }, 5)
  check('locked gate cannot be walked around', bypass.z > gateZ, `z=${bypass.z.toFixed(1)}`)

  // אחרי פתיחת השער אפשר להמשיך
  castle.openGateFrom(garden.id)
  check('gate reports itself open', castle.isGateOpen(garden.id))
  const afterGate = walk({ x: 0, z: garden.zEnd + 4 }, { x: 0, z: -1 }, 4)
  check('open gate lets the player through', afterGate.z < gateZ, `z=${afterGate.z.toFixed(1)}`)

  // כל אזור מגיע לדמות המנחה שלו
  for (const layout of AREA_LAYOUTS) {
    const guide = castle.guides.find((g) => g.areaId === layout.id)
    check(`${layout.id}: has a guide`, !!guide)
    if (!guide) continue
    const inside = guide.z <= layout.zStart && guide.z >= layout.zEnd && Math.abs(guide.x) < layout.halfWidth
    check(`${layout.id}: guide stands inside its area`, inside, `z=${guide.z}`)
    const reached = walk({ x: guide.x, z: layout.zStart - 2 }, { x: 0, z: -1 }, 6)
    const distance = Math.hypot(reached.x - guide.x, reached.z - guide.z)
    check(`${layout.id}: walking forward reaches the guide`, distance < 3.4, `distance=${distance.toFixed(1)}`)
  }

  // המצלמה נמשכת פנימה כשקיר חוסם אותה, ולא חודרת דרכו
  const free = col.freeDistance(0, gateZ - 1, 0, 1, 11.5, 0.6)
  check('camera pulls in when a wall is behind the player', free < 11.5, `free=${free.toFixed(1)}`)
  const openField = col.freeDistance(0, garden.zStart - 10, 0, 1, 11.5, 0.6)
  check('camera stays far in open space', openField > 8, `free=${openField.toFixed(1)}`)

  // כל אזור בפריסה תואם לאזור בתוכן
  check('layout covers every learning area', AREA_LAYOUTS.length === AREAS.length)
  for (const layout of AREA_LAYOUTS) {
    check(`${layout.id}: entry point is inside the area`, areaEntry(layout.id).z <= layout.zStart && areaEntry(layout.id).z >= layout.zEnd)
  }
  check('spawn is in the courtyard, not inside an area', areaAt(SPAWN.z) === undefined)

  castle.dispose()
  eraseEverything()
}

/**
 * בדיקות ה-DOM של פאנל המשימה. פותחים אותו באמת, לוחצים באמת,
 * ובודקים שהמסך מגיב כמו שילדה בת שמונה תחווה אותו.
 */
function runPanelChecks(): void {
  eraseEverything()
  const host = document.createElement('div')
  document.body.appendChild(host)

  let exits = 0
  let corrects = 0
  let wrongs = 0
  const panel = new TaskPanel(host, {
    onExit: () => (exits += 1),
    onCorrect: () => (corrects += 1),
    onWrong: () => (wrongs += 1),
    onAreaComplete: () => {},
  })

  check('panel starts hidden', panel.root.hidden === true)
  check('hidden panel is really not displayed', getComputedStyle(panel.root).display === 'none')

  const session = new AreaSession(AREAS[0].id)
  panel.open(session)

  check('panel is visible after opening', panel.root.hidden === false)
  check('prompt is shown in hebrew', (host.querySelector('.task-prompt-text')?.textContent ?? '').length > 10)
  check('hebrew instruction has its own speaker button', !!host.querySelector('.speaker-btn.he'))
  check('four diamonds are shown', host.querySelectorAll('.diamond').length === 4)
  check('no diamond is lost yet', host.querySelectorAll('.diamond.lost').length === 0)
  check('progress text is shown', (host.querySelector('.task-progress-text')?.textContent ?? '').includes('מתוך'))
  check('there is a replay speaker button', !!host.querySelector('.task-replay .speaker-btn'))
  check('hint is hidden at the start', host.querySelector<HTMLElement>('.task-hint')?.hidden === true)

  const optionButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.option'))
  check('options are rendered', optionButtons.length >= 3, String(optionButtons.length))
  check('no english text is shown by default', host.querySelectorAll('.option-english').length === 0)

  // אף אפשרות לא נבדלת רק בצבע
  const shapes = new Set(Array.from(host.querySelectorAll('.swatch')).map((s) => s.className))
  check('color options each carry a distinct shape class', shapes.size === optionButtons.length, `${shapes.size}/${optionButtons.length}`)
  check('color options carry a hebrew label', host.querySelectorAll('.option-label').length === optionButtons.length)

  // לחיצה על תשובה שגויה
  const correctId = session.task.options.find((o) => o.correct)!.id
  const wrongBtn = optionButtons.find((b) => b.dataset.id !== correctId)!
  wrongBtn.click()

  check('wrong answer notified the world', wrongs === 1)
  check('wrong answer marked the option', wrongBtn.classList.contains('wrong'))
  check('wrong answer showed a cross, not only a colour', !!wrongBtn.querySelector('.option-mark'))
  check('wrong answer removed one diamond', host.querySelectorAll('.diamond.lost').length === 1)
  check('wrong answer revealed a hint', host.querySelector<HTMLElement>('.task-hint')?.hidden === false)
  const hintText = host.querySelector('.task-hint')?.textContent ?? ''
  check('hint is encouraging, never says failed', !/נכשל|טעית|לא נכון/.test(hintText), hintText)
  check('input is locked while the wrong answer animates', clickIsIgnored(host, correctId, session))

  panel.close()
  host.remove()

  // מסך נקי לבדיקת התשובה הנכונה, כדי שהבדיקה לא תהיה תלויה בהמתנה
  // לנעילת הקלט של התשובה השגויה. בדיקה שתלויה בטיימר היא בדיקה
  // שנוטה להיעלם בשקט, וזה בדיוק מה שמסתיר באגים.
  const host2 = document.createElement('div')
  document.body.appendChild(host2)
  const panel2 = new TaskPanel(host2, {
    onExit: () => (exits += 1),
    onCorrect: () => (corrects += 1),
    onWrong: () => (wrongs += 1),
    onAreaComplete: () => {},
  })
  const session2 = new AreaSession(AREAS[0].id)
  panel2.open(session2)

  const correctId2 = session2.task.options.find((o) => o.correct)!.id
  const correctBtn = host2.querySelector<HTMLButtonElement>(`.option[data-id="${correctId2}"]`)!
  correctBtn.click()

  check('correct answer notified the world', corrects === 1)
  check('correct answer marked the option', correctBtn.classList.contains('correct'))
  const fb = host2.querySelector('.feedback')
  check('feedback card appeared', !!fb)
  check('feedback shows the english word', (fb?.querySelector('.feedback-en')?.textContent ?? '') === getWord(correctId2).english)
  check('feedback shows the hebrew meaning', (fb?.querySelector('.feedback-he')?.textContent ?? '') === getWord(correctId2).hebrew)
  check('feedback has a speaker to hear it again', !!fb?.querySelector('.speaker-btn'))
  check('feedback offers a continue button', !!fb?.querySelector('.big-btn'))
  check('a star was awarded', getProgress().stars > 0, String(getProgress().stars))

  host2.querySelector<HTMLButtonElement>('.task-top .big-btn')!.click()
  check('exit button works from any task', exits === 1)
  panel2.close()
  check('closed panel is hidden again', panel2.root.hidden === true)
  host2.remove()

  eraseEverything()
  playThroughEveryArea()
  playTheWholeCastleInOrder()
}

/**
 * משחקת את כל הטירה ברצף, מהצבעים ועד האותיות, בלי לאפס בין אזורים.
 * זו הבדיקה שמוכיחה שכל אזור באמת פותח את הבא אחריו ושכל שער נפתח,
 * ולא רק המעבר הראשון מהצבעים לחיות.
 */
function playTheWholeCastleInOrder(): void {
  eraseEverything()
  const host = document.createElement('div')
  document.body.appendChild(host)

  let unlockedByFinishing: (string | undefined)[] = []
  const panel = new TaskPanel(host, {
    onExit: () => {},
    onCorrect: () => {},
    onWrong: () => {},
    onAreaComplete: (unlocked) => unlockedByFinishing.push(unlocked),
  })

  // רק האזור הראשון פתוח בהתחלה
  check('only the first area starts unlocked', AREAS.filter((a) => getProgress().areas[a.id].unlocked).length === 1)

  for (const area of AREAS) {
    check(`${area.id}: is unlocked by the time we reach it`, getProgress().areas[area.id].unlocked === true)

    const session = new AreaSession(area.id)
    panel.open(session)
    let finished = false
    let steps = 0
    while (!finished && steps < 40) {
      steps += 1
      const task = session.task
      answerCorrectlyOnScreen(host, task)
      host.querySelector<HTMLButtonElement>('.feedback .big-btn')?.click()
      const card = host.querySelector('.area-complete')
      if (card) {
        card.querySelector<HTMLButtonElement>('.big-btn')?.click()
        finished = true
      }
    }
    check(`${area.id}: finished while playing the castle in order`, finished, `steps=${steps}`)
    check(`${area.id}: marked done`, getProgress().areas[area.id].done === true)
  }

  panel.close()
  host.remove()

  // כל האזורים פתוחים וסומנו כהושלמו. הבדיקות נגזרות מאורך AREAS
  // ולא ממספר קבוע, כדי שהוספת אזור בעתיד לא תפיל אותן סתם.
  const last = AREAS.length - 1
  check('every area ends up unlocked', AREAS.every((a) => getProgress().areas[a.id].unlocked), `${AREAS.filter((a) => getProgress().areas[a.id].unlocked).length}/${AREAS.length}`)
  check('every area ends up done', AREAS.every((a) => getProgress().areas[a.id].done))
  check(
    'each finished area unlocked exactly the next one',
    unlockedByFinishing.slice(0, last).join(',') === AREAS.slice(1).map((a) => a.id).join(','),
    unlockedByFinishing.join(','),
  )
  check('finishing the last area unlocks nothing further', unlockedByFinishing[last] === undefined)
  check('most of the castle vocabulary was learned', getProgress().wordsLearned.length >= 60, String(getProgress().wordsLearned.length))

  // והשערים בעולם התלת-ממדי נפתחים בהתאם להתקדמות השמורה
  const castle = new Castle()
  for (const area of AREAS.slice(0, last)) {
    check(`${area.id}: its gate is open in a freshly built castle`, castle.isGateOpen(area.id))
  }
  castle.dispose()
  eraseEverything()
}

/**
 * משחקת אזור שלם דרך ה-DOM בלבד, בדיוק כמו ילדה מול המסך.
 * זו הבדיקה שתופסת משימה שאי אפשר לעבור אותה, כמו הבאג שבו
 * הכפתור "שמעתי ואמרתי" נספר כטעות ותקע את המשחק בלולאה.
 */
function playThroughEveryArea(): void {
  for (const area of AREAS) {
    eraseEverything()
    const host = document.createElement('div')
    document.body.appendChild(host)
    let areaDone = false
    const panel = new TaskPanel(host, {
      onExit: () => {},
      onCorrect: () => {},
      onWrong: () => {},
      onAreaComplete: () => (areaDone = true),
    })
    const session = new AreaSession(area.id)
    panel.open(session)

    const seenTypes = new Set<string>()
    let steps = 0
    let stuckAt = ''

    while (!areaDone && steps < 40) {
      steps += 1
      const task = session.task
      seenTypes.add(task.type)
      const diamondsBefore = session.lives.value
      const doneBefore = session.position.done

      // לוחצים על התשובה הנכונה, בדיוק כמו שילדה הייתה לוחצת
      answerCorrectlyOnScreen(host, task)

      // התשובה הנכונה חייבת לפתוח כרטיס משוב. אם לא, המשימה תקועה.
      const feedback = host.querySelector('.feedback')
      if (!feedback) {
        stuckAt = `${task.type} (${task.wordId}) diamonds ${diamondsBefore} -> ${session.lives.value}`
        break
      }
      feedback.querySelector<HTMLButtonElement>('.big-btn')?.click()

      // המשימה האחרונה באזור מציגה כרטיס סיום, ורק לחיצה עליו מסיימת את האזור
      const completeCard = host.querySelector('.area-complete')
      if (completeCard) {
        check(`${area.id}: completion card names the area`, (completeCard.textContent ?? '').includes(area.title))
        completeCard.querySelector<HTMLButtonElement>('.big-btn')?.click()
        break
      }

      if (session.position.done === doneBefore && !task.isPractice) {
        stuckAt = `${task.type} did not advance`
        break
      }
    }

    check(`${area.id}: every task can be completed through the screen`, stuckAt === '', stuckAt)
    check(`${area.id}: the area finishes`, areaDone, `steps=${steps}`)
    check(`${area.id}: no diamond was lost on a correct run`, getProgress().mistakes === 0, String(getProgress().mistakes))
    for (const spec of area.tasks) seenTypes.add(spec.type)
    check(`${area.id}: exercised its task types`, seenTypes.size >= new Set(area.tasks.map((t) => t.type)).size)

    panel.close()
    host.remove()
  }
  eraseEverything()
}

/**
 * עונה נכון על משימה ברמת הסשן, בלי מסך.
 * כל סוג משימה חדש חייב להתווסף כאן, אחרת סבב שלם ייתקע עליו.
 */
function answerCorrectly(session: TaskSession): void {
  const t = session.task
  if (t.type === 'say-it') {
    session.confirmSaid()
    return
  }
  if (t.type === 'match-word-object') {
    for (const pair of t.pairs ?? []) session.answerPair(pair.id, pair.id)
    return
  }
  if (t.type === 'blend-build') {
    session.answerBuilt(t.build?.text ?? '')
    return
  }
  if (t.type === 'sentence-build') {
    session.answerBuilt(t.sentenceBuild?.text ?? '')
    return
  }
  session.answer(t.options.find((o) => o.correct)!.id)
}

/** אותו דבר, אבל דרך לחיצות אמיתיות על המסך. */
function answerCorrectlyOnScreen(host: HTMLElement, task: Task): void {
  if (task.type === 'say-it') {
    host.querySelector<HTMLButtonElement>('.say-it .big-btn')?.click()
    return
  }
  if (task.type === 'match-word-object') {
    for (const pair of task.pairs ?? []) {
      host.querySelector<HTMLButtonElement>(`.match-card.word[data-id="${pair.id}"]`)?.click()
      host.querySelector<HTMLButtonElement>(`.match-card.object[data-id="${pair.id}"]`)?.click()
    }
    return
  }
  if (task.type === 'blend-build') {
    // בונים את המילה אריח אחרי אריח, לפי הסדר הנכון
    for (const soundId of task.build?.sounds ?? []) {
      const grapheme = getPhoneme(soundId).grapheme
      const tile = Array.from(host.querySelectorAll<HTMLButtonElement>('.blend-tile')).find(
        (t) => t.textContent === grapheme && !t.classList.contains('used') && !t.disabled,
      )
      tile?.click()
    }
    return
  }
  if (task.type === 'sentence-build') {
    // מניחים כרטיס אחר כרטיס, בסדר של המשבצות שאפשר לבחור בהן
    const build = task.sentenceBuild
    for (const [i, slot] of (build?.slots ?? []).entries()) {
      if (slot.fixed) continue
      const wanted = getWord(build!.picks[i]).english
      const card = Array.from(host.querySelectorAll<HTMLButtonElement>('.word-card')).find(
        (c) => c.textContent === wanted && !c.classList.contains('used') && !c.disabled,
      )
      card?.click()
    }
    return
  }
  if (task.type === 'two-words') {
    const id = task.options.find((o) => o.correct)!.id
    const sib = host.querySelector<HTMLButtonElement>(`.option[data-id="${id}"]`)?.nextElementSibling
    if (sib instanceof HTMLButtonElement) sib.click()
    return
  }
  const id = task.options.find((o) => o.correct)!.id
  host.querySelector<HTMLButtonElement>(`.option[data-id="${id}"]`)?.click()
}

/** JSON עם מפתחות ממוינים, להשוואת תוכן בלי תלות בסדר השדות. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {}
      for (const k of Object.keys(val as Record<string, unknown>).sort()) sorted[k] = (val as Record<string, unknown>)[k]
      return sorted
    }
    return val
  })
}

/** מוודא שלחיצה נוספת בזמן האנימציה לא נספרת. */
function clickIsIgnored(host: HTMLElement, correctId: string, session: AreaSession): boolean {
  const before = session.lives.value
  const btn = Array.from(host.querySelectorAll<HTMLButtonElement>('.option')).find((b) => b.dataset.id !== correctId)
  btn?.click()
  return session.lives.value === before
}

try {
  run()
} catch (err) {
  lines.unshift(`THREW: ${String(err)}`)
}

const out = document.getElementById('out')
if (out) out.textContent = lines.join('\n')
