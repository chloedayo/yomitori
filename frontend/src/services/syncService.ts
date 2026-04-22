import { exportReviewData, importReviewData } from './reviewStore'
import { exportDictionaryData, importDictionaryData } from './dictionaryStore'
import { resolvePath } from '../lib/resolvePath'

const CLIENT_ID_KEY = 'yomitori-client-id'
const LAST_SYNC_KEY = 'yomitori-last-sync'

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

function setLastSyncTime(t: string) {
  localStorage.setItem(LAST_SYNC_KEY, t)
}

// Push reviews + meta only (called silently after each quiz session)
export async function pushReviews(): Promise<void> {
  const clientId = getClientId()
  const reviewData = await exportReviewData()
  const url = resolvePath('/api/sync/save')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, reviewsJson: JSON.stringify(reviewData) }),
  })
  if (res.ok) {
    const { savedAt } = await res.json()
    setLastSyncTime(savedAt)
  }
}

// Full backup: reviews + dictionary
export async function pushFull(): Promise<void> {
  const clientId = getClientId()
  const [reviewData, dictData] = await Promise.all([exportReviewData(), exportDictionaryData()])
  const url = resolvePath('/api/sync/save')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      reviewsJson: JSON.stringify(reviewData),
      dictionaryJson: JSON.stringify(dictData),
    }),
  })
  if (res.ok) {
    const { savedAt } = await res.json()
    setLastSyncTime(savedAt)
  } else {
    throw new Error(`Backup failed: ${res.status}`)
  }
}

// Restore from backend
export async function pullState(): Promise<void> {
  const clientId = getClientId()
  const url = resolvePath(`/api/sync/load/${clientId}`)
  const res = await fetch(url)
  if (res.status === 404) throw new Error('No backup found for this device')
  if (!res.ok) throw new Error(`Restore failed: ${res.status}`)
  const data = await res.json()
  if (data.reviewsJson) await importReviewData(JSON.parse(data.reviewsJson))
  if (data.dictionaryJson) await importDictionaryData(JSON.parse(data.dictionaryJson))
  if (data.savedAt) setLastSyncTime(data.savedAt)
}

// Export full JSON file download
export async function exportJSON(): Promise<void> {
  const [reviewData, dictData] = await Promise.all([exportReviewData(), exportDictionaryData()])
  const blob = new Blob([JSON.stringify({ reviewData, dictData, exportedAt: new Date().toISOString() }, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `yomitori-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

// Import from JSON file
export async function importJSON(file: File): Promise<void> {
  const text = await file.text()
  const data = JSON.parse(text)
  if (data.reviewData) await importReviewData(data.reviewData)
  if (data.dictData) await importDictionaryData(data.dictData)
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  const already = await navigator.storage.persisted()
  if (already) return true
  return navigator.storage.persist()
}
