import { useEffect, useCallback, useRef } from 'react'
import { batchLookup, DictionaryEntry } from '../api/dictionaryClient'
import { useMiddlewareProxy } from '../hooks/useProxy'

export interface SelectionEntry {
  surface: string
  baseForm: string
  entry: DictionaryEntry
  alternates: DictionaryEntry[]
}

export interface SelectionRect {
  left: number
  right: number
  top: number
  bottom: number
}

export interface SelectionDefinitionState {
  entries: SelectionEntry[]
  rect: SelectionRect
  rawText: string
}

interface DeinflectCandidate {
  startPos: number
  surface: string
  baseForm: string
  reason: string
}

export function useSelectionDefinition(
  contentRef: React.RefObject<HTMLDivElement | null>,
  onDefinition: (state: SelectionDefinitionState | null) => void
) {
  const middlewareAvailable = useRef<boolean | null>(null)

  const checkMiddleware = useCallback(async () => {
    if (middlewareAvailable.current !== null) return middlewareAvailable.current
    try {
      const url = useMiddlewareProxy('/health')
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
      middlewareAvailable.current = res.ok
    } catch {
      middlewareAvailable.current = false
    }
    return middlewareAvailable.current
  }, [])

  const deinflect = useCallback(async (text: string): Promise<DeinflectCandidate[]> => {
    const available = await checkMiddleware()
    if (!available) {
      return [{ startPos: 0, surface: text, baseForm: text, reason: 'plain' }]
    }
    try {
      const url = useMiddlewareProxy('/deinflect')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) return [{ startPos: 0, surface: text, baseForm: text, reason: 'plain' }]
      const data = await res.json()
      return data.candidates || []
    } catch {
      return [{ startPos: 0, surface: text, baseForm: text, reason: 'plain' }]
    }
  }, [checkMiddleware])

  // Greedy longest-match segmentation, then for each segment also include
  // sub-components that fall entirely within that segment's span.
  // Sentences get clean segmentation; compounds (自動販売機) still show sub-parts.
  const smartMatch = useCallback((
    textLength: number,
    candidates: DeinflectCandidate[],
    dictResults: Map<string, DictionaryEntry[]>
  ): SelectionEntry[] => {
    // Build pos → candidates map, longest surface first
    const byPos = new Map<number, DeinflectCandidate[]>()
    for (const c of candidates) {
      const bucket = byPos.get(c.startPos) ?? []
      bucket.push(c)
      byPos.set(c.startPos, bucket)
    }
    for (const bucket of byPos.values()) {
      bucket.sort((a, b) => b.surface.length - a.surface.length)
    }

    // Greedy pass
    type Segment = { start: number; end: number; surface: string; baseForm: string; entry: DictionaryEntry; alternates: DictionaryEntry[] }
    const segments: Segment[] = []
    let pos = 0
    while (pos < textLength) {
      let matched = false
      for (const c of byPos.get(pos) ?? []) {
        const hits = dictResults.get(c.baseForm)
        if (hits && hits.length > 0) {
          segments.push({ start: pos, end: pos + c.surface.length, surface: c.surface, baseForm: c.baseForm, entry: hits[0], alternates: hits.slice(1) })
          pos += c.surface.length
          matched = true
          break
        }
      }
      if (!matched) pos += 1
    }

    const seenBase = new Set<string>()
    const entries: SelectionEntry[] = []
    for (const seg of segments) {
      if (seenBase.has(seg.baseForm)) continue
      seenBase.add(seg.baseForm)
      entries.push({ surface: seg.surface, baseForm: seg.baseForm, entry: seg.entry, alternates: seg.alternates })
    }
    return entries
  }, [])

  useEffect(() => {
    const element = contentRef.current
    if (!element) return

    const handleMouseUp = async () => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim()
      if (!selectedText) return

      const range = selection?.getRangeAt(0)
      const domRect = range?.getBoundingClientRect()
      const rect: SelectionRect = domRect
        ? { left: domRect.left, right: domRect.right, top: domRect.top, bottom: domRect.bottom }
        : { left: 0, right: 0, top: 0, bottom: 0 }

      const candidates = await deinflect(selectedText)
      if (candidates.length === 0) return

      // Batch-lookup all unique baseForms at once
      const uniqueBases = [...new Set(candidates.map(c => c.baseForm))]
      const dictResults = await batchLookup(uniqueBases)

      const entries = smartMatch(selectedText.length, candidates, dictResults)

      if (entries.length > 0) {
        onDefinition({ entries, rect, rawText: selectedText })
      }
    }

    element.addEventListener('mouseup', handleMouseUp)
    return () => element.removeEventListener('mouseup', handleMouseUp)
  }, [contentRef, deinflect, smartMatch, onDefinition])
}
