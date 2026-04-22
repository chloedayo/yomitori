import { useState, useEffect, useCallback } from 'react'
import {
  Annotation,
  getAnnotationsByBookId,
  getDirtyAnnotationsByBookId,
  upsertAnnotation,
  deleteAnnotationLocally,
  markSynced,
  mergeFromBackend,
} from '../services/annotationStore'
import { resolvePath } from '../lib/resolvePath'

export function useAnnotations(bookId: string | null) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [dirtyCount, setDirtyCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    if (!bookId) return
    const local = await getAnnotationsByBookId(bookId)
    setAnnotations(local)
    const dirty = await getDirtyAnnotationsByBookId(bookId)
    setDirtyCount(dirty.length)
  }, [bookId])

  useEffect(() => {
    if (!bookId) return
    let cancelled = false

    const load = async () => {
      const local = await getAnnotationsByBookId(bookId)
      if (!cancelled) setAnnotations(local)

      try {
        const url = resolvePath(`/api/annotations?bookId=${encodeURIComponent(bookId)}`)
        const res = await fetch(url)
        if (res.ok && !cancelled) {
          const remote = await res.json()
          await mergeFromBackend(remote)
          const merged = await getAnnotationsByBookId(bookId)
          if (!cancelled) setAnnotations(merged)
        }
      } catch {
        // offline — use local cache
      }

      if (!cancelled) {
        const dirty = await getDirtyAnnotationsByBookId(bookId)
        setDirtyCount(dirty.length)
      }
    }

    load()
    return () => { cancelled = true }
  }, [bookId])

  const createAnnotation = useCallback(async (
    title: string,
    body: string,
    charPos: number,
  ) => {
    if (!bookId) return
    const now = Date.now()
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      bookId,
      title,
      body,
      charPos,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      neverSynced: true,
    }
    await upsertAnnotation(annotation)
    await refresh()
  }, [bookId, refresh])

  const updateAnnotation = useCallback(async (
    id: string,
    title: string,
    body: string,
    charPos: number,
  ) => {
    const existing = annotations.find(a => a.id === id)
    if (!existing) return
    await upsertAnnotation({
      ...existing,
      title,
      body,
      charPos,
      updatedAt: Date.now(),
      syncedAt: null,
    })
    await refresh()
  }, [annotations, refresh])

  const deleteAnnotation = useCallback(async (id: string) => {
    await deleteAnnotationLocally(id)
    await refresh()
  }, [refresh])

  const saveToBackend = useCallback(async () => {
    if (!bookId) return
    setSyncing(true)
    try {
      const dirty = await getDirtyAnnotationsByBookId(bookId)
      for (const annotation of dirty) {
        if (annotation.deleted) {
          if (!annotation.neverSynced) {
            const url = resolvePath(`/api/annotations/${annotation.id}`)
            await fetch(url, { method: 'DELETE' })
          }
        } else if (annotation.neverSynced) {
          const url = resolvePath('/api/annotations')
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: annotation.id,
              bookId: annotation.bookId,
              title: annotation.title,
              body: annotation.body,
              charPos: annotation.charPos,
              createdAt: annotation.createdAt,
              updatedAt: annotation.updatedAt,
            }),
          })
        } else {
          const url = resolvePath(`/api/annotations/${annotation.id}`)
          await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: annotation.title,
              body: annotation.body,
              charPos: annotation.charPos,
              updatedAt: annotation.updatedAt,
            }),
          })
        }
        await markSynced(annotation.id)
      }
      await refresh()
    } finally {
      setSyncing(false)
    }
  }, [bookId, refresh])

  return {
    annotations,
    dirtyCount,
    syncing,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    saveToBackend,
  }
}
