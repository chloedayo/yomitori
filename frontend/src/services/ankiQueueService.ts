import { MinedWord } from './ankiService'
import { checkConnection, addNote } from './ankiService'
import { upsertWord } from './dictionaryStore'

const STATS_KEY = 'yomitori-stats'
const QUEUE_KEY = 'yomitori-anki-queue'

export interface MiningStats {
  books: Array<{ bookId: string; minedCount: number }>
}

interface QueueItem {
  word: MinedWord
  deckName: string
}

class AnkiQueueService {
  private queue: QueueItem[] = []
  private processing = false
  private stats: MiningStats = { books: [] }

  constructor() {
    this.loadStats()
    this.loadQueue()
    this.startProcessing()
  }

  private loadStats() {
    try {
      const saved = localStorage.getItem(STATS_KEY)
      this.stats = saved ? JSON.parse(saved) : { books: [] }
    } catch {
      this.stats = { books: [] }
    }
  }

  private saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(this.stats))
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem(QUEUE_KEY)
      this.queue = saved ? JSON.parse(saved) : []
    } catch {
      this.queue = []
    }
  }

  private saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
  }

  addToQueue(word: MinedWord, deckName: string) {
    this.queue.push({ word, deckName })
    this.saveQueue()
  }

  addMultiple(words: MinedWord[], deckName: string) {
    words.forEach(word => this.addToQueue(word, deckName))
  }

  getQueueLength(): number {
    return this.queue.length
  }

  getMinedCount(bookId: string): number {
    return this.stats.books.find(b => b.bookId === bookId)?.minedCount ?? 0
  }

  clearQueue() {
    this.queue = []
    localStorage.removeItem(QUEUE_KEY)
  }

  private async startProcessing() {
    setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processNext()
      }
    }, 500)
  }

  private async processNext() {
    if (this.queue.length === 0) return

    this.processing = true
    const item = this.queue[0]

    try {
      const connected = await checkConnection()
      if (!connected) {
        console.warn('Anki not connected, discarding word:', item.word.surface)
        this.queue.shift()
        this.saveQueue()
        this.processing = false
        return
      }

      await addNote(item.word, item.deckName)

      // Persist to local dictionary
      upsertWord({
        baseForm: item.word.baseForm,
        surface: item.word.surface,
        reading: item.word.reading,
        definitions: item.word.definitions,
        frequencies: item.word.frequencies,
        bookId: item.word.bookId,
        minedAt: item.word.minedAt,
      }).catch(() => {})

      // Update stats
      const bookIdx = this.stats.books.findIndex(b => b.bookId === item.word.bookId)
      if (bookIdx >= 0) {
        this.stats.books[bookIdx].minedCount++
      } else {
        this.stats.books.push({ bookId: item.word.bookId, minedCount: 1 })
      }
      this.saveStats()

      // Remove from queue
      this.queue.shift()
      this.saveQueue()

      console.log(`✓ Added to Anki: ${item.word.surface}`)
    } catch (err) {
      console.error('Failed to add word to Anki:', err, item.word)
      // Don't retry, just discard on error
      this.queue.shift()
      this.saveQueue()
    }

    this.processing = false
  }
}

export const ankiQueue = new AnkiQueueService()
