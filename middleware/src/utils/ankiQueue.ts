import { addNotesToAnki, AnkiNote } from './ankiClient.js'

interface QueueItem {
  notes: AnkiNote[]
  deckName: string
  bookTitle?: string
  attempts: number
  addedAt: number
}

const BATCH_SIZE = 50
const MAX_ATTEMPTS = 10
const RETRY_INTERVAL_MS = 2500

const queue: QueueItem[] = []
let flushing = false

export function enqueue(notes: AnkiNote[], deckName: string, bookTitle?: string): void {
  if (notes.length === 0) return
  const seen = new Set<string>()
  const deduped = notes.filter(n => {
    if (seen.has(n.expression)) return false
    seen.add(n.expression)
    return true
  })
  const before = queue.length
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    queue.push({ notes: deduped.slice(i, i + BATCH_SIZE), deckName, bookTitle, attempts: 0, addedAt: Date.now() })
  }
  console.log(`[ankiQueue] enqueued ${deduped.length}/${notes.length} notes (${notes.length - deduped.length} dupes dropped) in ${queue.length - before} batches — queue length=${queue.length}`)
}

async function flush(): Promise<void> {
  if (flushing || queue.length === 0) return
  flushing = true

  const item = queue[0]
  item.attempts++

  try {
    const result = await addNotesToAnki(item.notes, item.deckName, item.bookTitle)
    if (result.error) throw new Error(result.error)
    queue.shift()
    console.log(`[ankiQueue] flushed — added=${result.added} skipped=${result.skipped} remaining=${queue.length}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (item.attempts >= MAX_ATTEMPTS) {
      queue.shift()
      console.warn(`[ankiQueue] dropped batch after ${MAX_ATTEMPTS} attempts — ${msg}`)
    } else {
      console.warn(`[ankiQueue] attempt ${item.attempts}/${MAX_ATTEMPTS} failed — ${msg} — will retry`)
    }
  }

  flushing = false
}

setInterval(flush, RETRY_INTERVAL_MS)
