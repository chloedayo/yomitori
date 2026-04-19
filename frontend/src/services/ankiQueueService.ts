import { MinedWord } from './ankiService'
import { checkConnection, addNotes } from './ankiService'
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

const BATCH_SIZE = 50

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

    const batch = this.queue.splice(0, BATCH_SIZE)
    this.saveQueue()

    try {
      const connected = await checkConnection()
      if (!connected) {
        console.warn('Anki not connected, discarding batch of', batch.length)
        this.processing = false
        return
      }

      const byDeck = new Map<string, QueueItem[]>()
      for (const item of batch) {
        const group = byDeck.get(item.deckName) ?? []
        group.push(item)
        byDeck.set(item.deckName, group)
      }

      for (const [deckName, items] of byDeck) {
        let results: (number | null)[]
        try {
          results = await addNotes(items.map(i => i.word), deckName)
        } catch {
          continue
        }

        for (let i = 0; i < items.length; i++) {
          const { word } = items[i]
          upsertWord({
            baseForm: word.baseForm,
            surface: word.surface,
            reading: word.reading,
            definitions: word.definitions,
            frequencies: word.frequencies,
            bookId: word.bookId,
            minedAt: word.minedAt,
          }).catch(() => {})

          if (results[i] !== null) {
            const bookIdx = this.stats.books.findIndex(b => b.bookId === word.bookId)
            if (bookIdx >= 0) {
              this.stats.books[bookIdx].minedCount++
            } else {
              this.stats.books.push({ bookId: word.bookId, minedCount: 1 })
            }
          }
        }
      }

      this.saveStats()
    } catch {
      // unexpected error — batch already removed from queue, discard
    }

    this.processing = false
  }
}

export const ankiQueue = new AnkiQueueService()
