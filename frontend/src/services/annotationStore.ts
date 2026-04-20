import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface Annotation {
  id: string
  bookId: string
  title: string
  body: string
  charPos: number
  createdAt: number
  updatedAt: number
  syncedAt: number | null  // null = dirty
  neverSynced: boolean     // true = never POSTed to backend
  deleted?: boolean        // true = queued for DELETE
}

interface AnnotationDB extends DBSchema {
  annotations: {
    key: string
    value: Annotation
    indexes: {
      'by-bookId': string
      'by-createdAt': number
    }
  }
}

let dbPromise: Promise<IDBPDatabase<AnnotationDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AnnotationDB>('yomitori-annotations', 1, {
      upgrade(db) {
        const store = db.createObjectStore('annotations', { keyPath: 'id' })
        store.createIndex('by-bookId', 'bookId')
        store.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}

export async function getAnnotationsByBookId(bookId: string): Promise<Annotation[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('annotations', 'by-bookId', bookId)
  return all.filter(a => !a.deleted).sort((a, b) => a.createdAt - b.createdAt)
}

export async function getDirtyAnnotationsByBookId(bookId: string): Promise<Annotation[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('annotations', 'by-bookId', bookId)
  return all.filter(a => a.syncedAt === null)
}

export async function upsertAnnotation(annotation: Annotation): Promise<void> {
  const db = await getDB()
  await db.put('annotations', annotation)
}

export async function markSynced(id: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('annotations', id)
  if (!existing) return
  if (existing.deleted) {
    await db.delete('annotations', id)
  } else {
    await db.put('annotations', { ...existing, syncedAt: Date.now(), neverSynced: false })
  }
}

export async function deleteAnnotationLocally(id: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('annotations', id)
  if (!existing) return
  await db.put('annotations', { ...existing, deleted: true, syncedAt: null })
}

export async function mergeFromBackend(remotes: Omit<Annotation, 'syncedAt' | 'neverSynced' | 'deleted'>[]): Promise<void> {
  const db = await getDB()
  for (const remote of remotes) {
    const local = await db.get('annotations', remote.id)
    if (!local) {
      await db.put('annotations', {
        ...remote,
        syncedAt: Date.now(),
        neverSynced: false,
      })
    } else if (!local.deleted && remote.updatedAt > local.updatedAt) {
      await db.put('annotations', {
        ...remote,
        syncedAt: Date.now(),
        neverSynced: false,
      })
    }
  }
}
