import { openDB } from 'idb'

export interface InlineAnnotation {
  id: string
  bookId: string
  selectedText: string
  noteText: string
  charPos: number
  createdAt: number
}

const DB_NAME = 'yomitori-inline-annotations'
const STORE = 'inline-annotations'

function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('bookId', 'bookId')
    },
  })
}

export async function getInlineAnnotationsByBookId(bookId: string): Promise<InlineAnnotation[]> {
  const db = await getDb()
  return db.getAllFromIndex(STORE, 'bookId', bookId)
}

export async function saveInlineAnnotation(annotation: InlineAnnotation): Promise<void> {
  const db = await getDb()
  await db.put(STORE, annotation)
}

export async function updateInlineAnnotation(id: string, noteText: string): Promise<void> {
  const db = await getDb()
  const existing = await db.get(STORE, id)
  if (existing) await db.put(STORE, { ...existing, noteText })
}

export async function deleteInlineAnnotation(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}
