import { openDB, DBSchema, IDBPDatabase } from 'idb'

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface WordReview {
  baseForm: string
  interval: number           // days until next review
  easeFactor: number         // 1.3–4.0
  dueDate: number            // ms timestamp
  streak: number             // consecutive correct
  correctCount: number
  incorrectCount: number
  recentResults: boolean[]   // last 5 for consistency
  status: 'new' | 'learning' | 'reviewing' | 'known'
  lastReviewed: number
}

export interface QuizSession {
  id: string
  startedAt: number
  durationMs: number
  mode: 'scheduled' | 'custom'
  endless?: boolean
  hardcore?: boolean
  bestStreak?: number
  filters?: {
    frequencySource?: string
    minRank?: number
    maxRank?: number
    frequencyTag?: string
    statusFilter?: string
  }
  totalCards: number
  correct: number
  incorrect: number
}

export interface ReviewStats {
  total: number
  newCount: number
  learningCount: number
  reviewingCount: number
  knownCount: number
  dueCount: number
  totalCorrect: number
  totalIncorrect: number
  dailyStreak: number
  lastStudiedDate: string | null
}

interface ReviewDB extends DBSchema {
  reviews: {
    key: string
    value: WordReview
    indexes: { 'by-due': number; 'by-status': string }
  }
  meta: {
    key: string
    value: { key: string; value: any }
  }
}

let dbPromise: Promise<IDBPDatabase<ReviewDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ReviewDB>('yomitori-reviews', 1, {
      upgrade(db) {
        const store = db.createObjectStore('reviews', { keyPath: 'baseForm' })
        store.createIndex('by-due', 'dueDate')
        store.createIndex('by-status', 'status')
        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

// ── ARIA: Adaptive Response Interval Algorithm ──────────────────────────────
// Extends SM2 with three layers:
//   1. Speed weighting  — quick answers earn an ease bonus
//   2. Consistency factor — rolling 5-window rewards stable recall
//   3. Difficulty penalty — historically hard words get shorter intervals
//    ...so hard words never drift to the back of the queue

function ariaSchedule(
  review: WordReview,
  correct: boolean,
  responseTimeRatio: number   // timeUsed / timeLimit, >1 = timed out
): WordReview {
  // 1. Quality score
  let quality: number
  if (!correct) {
    quality = 0.0
  } else if (responseTimeRatio < 0.3) {
    quality = 1.0    // fast recall
  } else if (responseTimeRatio < 0.7) {
    quality = 0.75   // comfortable recall
  } else {
    quality = 0.5    // slow but correct
  }

  // 2. Ease factor  (SM2-style, range 1.3–4.0)
  const newEF = Math.max(1.3, Math.min(4.0,
    review.easeFactor + 0.15 * (quality - 0.6)
  ))

  // 3. Update lifetime counts
  const newCorrect = review.correctCount + (correct ? 1 : 0)
  const newIncorrect = review.incorrectCount + (correct ? 0 : 1)
  const newStreak = correct ? review.streak + 1 : 0

  // 4. Consistency factor — rolling window of last 5
  const recentResults: boolean[] = [...review.recentResults.slice(-4), correct]
  const recentRate = recentResults.filter(Boolean).length / recentResults.length
  const consistencyBonus = 1.0 + 0.2 * (recentRate - 0.5)  // 0.9–1.1

  // 5. Difficulty penalty — lifetime hard ratio
  const difficulty = newIncorrect / (newCorrect + newIncorrect + 1)
  const difficultyPenalty = 1 - difficulty * 0.3  // 0.7–1.0

  // 6. New interval
  let newInterval: number
  if (!correct) {
    newInterval = 1
  } else if (newStreak === 1) {
    newInterval = 1
  } else if (newStreak === 2) {
    newInterval = 3
  } else {
    newInterval = Math.max(1, Math.round(
      review.interval * newEF * consistencyBonus * difficultyPenalty
    ))
  }
  newInterval = Math.min(newInterval, 180)

  // 7. Status
  let status: WordReview['status']
  if (newInterval >= 21 && newStreak >= 5) {
    status = 'known'
  } else if (newInterval >= 7) {
    status = 'reviewing'
  } else if (newCorrect > 0 || newIncorrect > 0) {
    status = 'learning'
  } else {
    status = 'new'
  }

  return {
    ...review,
    interval: newInterval,
    easeFactor: newEF,
    dueDate: Date.now() + newInterval * 86400000,
    streak: newStreak,
    correctCount: newCorrect,
    incorrectCount: newIncorrect,
    recentResults,
    status,
    lastReviewed: Date.now(),
  }
}

// ── Due card selection ───────────────────────────────────────────────────────
// Priority: % overdue first (urgency), then difficulty (hard words up front)
// Injects new words at ~15% of session size to keep learning moving

export async function getDueCards(sessionSize: number | null): Promise<WordReview[]> {
  const db = await getDB()
  const all = await db.getAll('reviews')
  const now = Date.now()

  const due = all.filter(r => r.dueDate <= now && r.status !== 'new')
  due.sort((a, b) => {
    const aUrgency = (now - a.dueDate) / (a.interval * 86400000)
    const bUrgency = (now - b.dueDate) / (b.interval * 86400000)
    if (Math.abs(aUrgency - bUrgency) > 0.5) return bUrgency - aUrgency
    const aDiff = a.incorrectCount / (a.correctCount + a.incorrectCount + 1)
    const bDiff = b.incorrectCount / (b.correctCount + b.incorrectCount + 1)
    return bDiff - aDiff
  })

  const limit = sessionSize ?? due.length
  const newSlots = Math.floor(limit * 0.15)
  const dueCards = due.slice(0, limit - newSlots)
  const remainingSlots = limit - dueCards.length
  const newCards = all.filter(r => r.status === 'new').slice(0, remainingSlots)
  const combined = [...dueCards, ...newCards]

  // Shuffle new words into the deck at intervals rather than end
  for (let i = newCards.length - 1; i >= 0; i--) {
    const pos = Math.floor(Math.random() * Math.min(combined.length, 5))
    const card = combined.pop()!
    combined.splice(pos, 0, card)
  }

  return sessionSize ? combined.slice(0, sessionSize) : combined
}

export async function upsertReview(baseForm: string): Promise<WordReview> {
  const db = await getDB()
  const existing = await db.get('reviews', baseForm)
  if (existing) return existing
  const fresh: WordReview = {
    baseForm,
    interval: 0,
    easeFactor: 2.5,
    dueDate: Date.now(),
    streak: 0,
    correctCount: 0,
    incorrectCount: 0,
    recentResults: [],
    status: 'new',
    lastReviewed: 0,
  }
  await db.put('reviews', fresh)
  return fresh
}

export async function submitAnswer(
  baseForm: string,
  correct: boolean,
  responseTimeRatio: number
): Promise<WordReview> {
  const db = await getDB()
  const review = await db.get('reviews', baseForm)
  if (!review) throw new Error(`No review for ${baseForm}`)
  const updated = ariaSchedule(review, correct, responseTimeRatio)
  await db.put('reviews', updated)
  await updateStreak(correct)
  await incrementActivity()
  return updated
}

export async function syncWordsFromDictionary(baseForms: string[]): Promise<void> {
  const db = await getDB()
  for (const baseForm of baseForms) {
    const existing = await db.get('reviews', baseForm)
    if (!existing) await upsertReview(baseForm)
  }
}

// ── Stats ────────────────────────────────────────────────────────────────────

async function incrementActivity() {
  const db = await getDB()
  const today = localDate()
  const meta = await db.get('meta', 'activity')
  const dates: Record<string, number> = meta?.value?.dates ?? {}
  dates[today] = (dates[today] ?? 0) + 1
  await db.put('meta', { key: 'activity', value: { dates } })
}

export async function getDailyActivity(): Promise<Record<string, number>> {
  const db = await getDB()
  const meta = await db.get('meta', 'activity')
  return meta?.value?.dates ?? {}
}

export async function resetStats(): Promise<void> {
  const db = await getDB()
  await db.clear('reviews')
  await db.delete('meta', 'streak')
  await db.delete('meta', 'activity')
}

export async function exportReviewData(): Promise<{ reviews: WordReview[]; meta: Record<string, unknown> }> {
  const db = await getDB()
  const reviews = await db.getAll('reviews')
  const metaEntries = await db.getAll('meta')
  const meta: Record<string, unknown> = {}
  for (const entry of metaEntries) meta[entry.key] = entry.value
  return { reviews, meta }
}

export async function importReviewData(data: { reviews: WordReview[]; meta: Record<string, unknown> }): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['reviews', 'meta'], 'readwrite')
  await tx.objectStore('reviews').clear()
  await tx.objectStore('meta').clear()
  for (const review of data.reviews) await tx.objectStore('reviews').put(review)
  for (const [key, value] of Object.entries(data.meta)) await tx.objectStore('meta').put({ key, value })
  await tx.done
}

async function updateStreak(correct: boolean) {
  const db = await getDB()
  const today = localDate()
  const streakMeta = await db.get('meta', 'streak')
  const lastDate = streakMeta?.value?.lastDate ?? null
  const streak = streakMeta?.value?.streak ?? 0

  if (!correct) return
  const yesterday = localDate(new Date(Date.now() - 86400000))
  const newStreak = lastDate === today ? streak
    : lastDate === yesterday ? streak + 1
    : 1
  await db.put('meta', { key: 'streak', value: { streak: newStreak, lastDate: today } })
}

let _pendingSave: Promise<void> = Promise.resolve()
export function awaitPendingSave(): Promise<void> { return _pendingSave }

export function saveSession(session: QuizSession): Promise<void> {
  _pendingSave = (async () => {
    const db = await getDB()
    const meta = await db.get('meta', 'sessions')
    const sessions: QuizSession[] = meta?.value?.sessions ?? []
    sessions.unshift(session)
    if (sessions.length > 100) sessions.length = 100
    await db.put('meta', { key: 'sessions', value: { sessions } })
  })()
  return _pendingSave
}

export async function getSessionHistory(): Promise<QuizSession[]> {
  const db = await getDB()
  const meta = await db.get('meta', 'sessions')
  return meta?.value?.sessions ?? []
}

export async function getAllReviews(): Promise<WordReview[]> {
  const db = await getDB()
  return db.getAll('reviews')
}

export async function getReviewStats(): Promise<ReviewStats> {
  const db = await getDB()
  const all = await db.getAll('reviews')
  const now = Date.now()
  const streakMeta = await db.get('meta', 'streak')
  const today = localDate()
  const streak = streakMeta?.value?.lastDate === today ? streakMeta.value.streak : 0

  return {
    total: all.length,
    newCount: all.filter(r => r.status === 'new').length,
    learningCount: all.filter(r => r.status === 'learning').length,
    reviewingCount: all.filter(r => r.status === 'reviewing').length,
    knownCount: all.filter(r => r.status === 'known').length,
    dueCount: all.filter(r => r.dueDate <= now && r.status !== 'new').length,
    totalCorrect: all.reduce((s, r) => s + r.correctCount, 0),
    totalIncorrect: all.reduce((s, r) => s + r.incorrectCount, 0),
    dailyStreak: streak,
    lastStudiedDate: streakMeta?.value?.lastDate ?? null,
  }
}
