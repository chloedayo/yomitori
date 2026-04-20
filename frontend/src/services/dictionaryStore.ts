import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface DictionaryWord {
  baseForm: string
  surface: string
  reading: string
  definitions: string[]
  definitionEntries: Array<{ dictionaryName: string; definition: string }>
  frequencies: Array<{ sourceName: string; frequency: number }>
  bookIds: string[]
  minedAt: number
  lastMinedAt: number
}

interface YomitoriDictionaryDB extends DBSchema {
  words: {
    key: string
    value: DictionaryWord
    indexes: {
      'by-surface': string
      'by-reading': string
      'by-minedAt': number
    }
  }
}

let dbPromise: Promise<IDBPDatabase<YomitoriDictionaryDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<YomitoriDictionaryDB>('yomitori-dictionary', 1, {
      upgrade(db) {
        const store = db.createObjectStore('words', { keyPath: 'baseForm' })
        store.createIndex('by-surface', 'surface')
        store.createIndex('by-reading', 'reading')
        store.createIndex('by-minedAt', 'minedAt')
      },
    })
  }
  return dbPromise
}

export async function upsertWord(word: Omit<DictionaryWord, 'bookIds' | 'minedAt' | 'lastMinedAt'> & { bookId: string; minedAt: number }) {
  const db = await getDB()
  const existing = await db.get('words', word.baseForm)

  if (existing) {
    const bookIds = existing.bookIds.includes(word.bookId)
      ? existing.bookIds
      : [...existing.bookIds, word.bookId]
    await db.put('words', {
      ...existing,
      bookIds,
      lastMinedAt: word.minedAt,
      definitions: word.definitions,
      definitionEntries: word.definitionEntries,
      frequencies: word.frequencies,
      surface: word.surface,
      reading: word.reading,
    })
  } else {
    await db.put('words', {
      baseForm: word.baseForm,
      surface: word.surface,
      reading: word.reading,
      definitions: word.definitions,
      definitionEntries: word.definitionEntries,
      frequencies: word.frequencies,
      bookIds: [word.bookId],
      minedAt: word.minedAt,
      lastMinedAt: word.minedAt,
    })
  }
}

export async function getAllWords(): Promise<DictionaryWord[]> {
  const db = await getDB()
  return db.getAll('words')
}

export async function searchWords(query: string): Promise<DictionaryWord[]> {
  const all = await getAllWords()
  const q = query.toLowerCase()
  return all.filter(
    (w) =>
      w.surface.toLowerCase().includes(q) ||
      w.reading.toLowerCase().includes(q) ||
      w.baseForm.toLowerCase().includes(q)
  )
}

export async function getWordCount(): Promise<number> {
  const db = await getDB()
  return db.count('words')
}

export async function getWordsByBookId(bookId: string): Promise<DictionaryWord[]> {
  const db = await getDB()
  const all = await db.getAll('words')
  return all.filter(w => w.bookIds.includes(bookId))
}

export async function getWord(baseForm: string): Promise<DictionaryWord | undefined> {
  const db = await getDB()
  return db.get('words', baseForm)
}

export async function clearDictionary(): Promise<void> {
  const db = await getDB()
  await db.clear('words')
}

export async function exportDictionaryData(): Promise<DictionaryWord[]> {
  return getAllWords()
}

export async function importDictionaryData(words: DictionaryWord[]): Promise<void> {
  const db = await getDB()
  await db.clear('words')
  for (const word of words) await db.put('words', word)
}
