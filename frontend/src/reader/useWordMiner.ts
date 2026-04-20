import { useRef, useCallback } from 'react'
import { MinedWord } from '../services/ankiService'
import { upsertWord } from '../services/dictionaryStore'
import { useMiddlewareProxy } from '../hooks/useProxy'

export interface UsWordMinerProps {
  contentRef: React.RefObject<HTMLDivElement>
  bookId: string
  bookTitle?: string | null
  onMiningWord?: (word: string) => void
  frequencySource?: string | null
  minFrequencyRank?: number | null
  maxFrequencyRank?: number | null
}

interface WordEntry {
  expression: string
  reading: string
  definitions: string[]
  frequencies: { sourceName: string; frequency: number }[]
  dictionaryName: string
}

export function useWordMiner({
  contentRef,
  bookId,
  bookTitle,
  onMiningWord,
  frequencySource,
  minFrequencyRank,
  maxFrequencyRank,
}: UsWordMinerProps) {
  const cancelledRef = useRef(false)

  const cancelMining = useCallback(() => {
    cancelledRef.current = true
  }, [])

  const extractText = useCallback(() => {
    if (!contentRef.current) return ''
    const chapters = contentRef.current.querySelectorAll('.epub-chapter')
    return Array.from(chapters).map(c => c.textContent || '').join('\n')
  }, [contentRef])

  const mineWords = useCallback(async (): Promise<MinedWord[]> => {
    cancelledRef.current = false
    try {
      const text = extractText()
      if (!text.trim()) throw new Error('No text found in reader')

      console.log(`[miner] sending ${text.length} chars (${(new Blob([text]).size / 1024).toFixed(1)} KB) to middleware`)
      onMiningWord?.('Mining…')

      const url = useMiddlewareProxy('/mine-words')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, frequencySource, minFrequencyRank, maxFrequencyRank, bookTitle }),
        signal: AbortSignal.timeout(300000),
      })

      if (!res.ok) throw new Error(`Mining failed: ${res.statusText}`)
      const data = await res.json() as { words: WordEntry[] }

      if (cancelledRef.current) return []

      const minedAt = Date.now()
      const minedWords: MinedWord[] = data.words.map(entry => ({
        surface: entry.expression,
        reading: entry.reading,
        baseForm: entry.expression,
        frequency: entry.frequencies?.find(f => f.sourceName === frequencySource)?.frequency
          ?? entry.frequencies?.[0]?.frequency
          ?? 0,
        definitions: entry.definitions,
        frequencies: entry.frequencies || [],
        addedToAnki: false,
        bookId,
        minedAt,
      }))

      minedWords.sort((a, b) => b.frequency - a.frequency)

      await Promise.all(
        minedWords.map(word =>
          upsertWord({
            baseForm: word.baseForm,
            surface: word.surface,
            reading: word.reading,
            definitions: word.definitions,
            frequencies: word.frequencies,
            bookId: word.bookId,
            minedAt: word.minedAt,
          }).catch(() => {})
        )
      )

      return minedWords
    } catch (err) {
      console.error('Mining error:', err)
      throw err
    }
  }, [extractText, bookId, bookTitle, onMiningWord, frequencySource, minFrequencyRank, maxFrequencyRank])

  return { mineWords, cancelMining }
}
