import { useRef, useCallback } from 'react'
import { batchLookup } from '../api/dictionaryClient'
import { MinedWord, getDeckNames } from '../services/ankiService'
import { ankiQueue } from '../services/ankiQueueService'
import { useMiddlewareProxy } from '../hooks/useProxy'

export interface UsWordMinerProps {
  contentRef: React.RefObject<HTMLDivElement>
  bookId: string
  onMiningWord?: (word: string) => void
  frequencySource?: string | null
  minFrequencyRank?: number | null
  maxFrequencyRank?: number | null
}

interface TokenizedWord {
  surface: string
  baseForm: string
  partOfSpeech: string
  reading?: string
}


const fallbackTokenize = (text: string): TokenizedWord[] => {
  const words = text.match(/[\p{L}\p{N}]+/gu) || []
  return words
    .filter(w => w.length > 1)
    .map(word => ({
      surface: word,
      baseForm: word,
      partOfSpeech: 'unknown',
      reading: undefined,
    }))
}

export function useWordMiner({ contentRef, bookId, onMiningWord }: UsWordMinerProps) {
  const useKuromojiRef = useRef(true)
  const initPromiseRef = useRef<Promise<void> | null>(null)

  const initializeTokenizer = useCallback(async () => {
    if (initPromiseRef.current) return initPromiseRef.current

    initPromiseRef.current = (async () => {
      try {
        const url = useMiddlewareProxy('/health')
        const response = await fetch(url)
        if (response.ok) {
          console.log('✓ Connected to middleware tokenizer')
        } else {
          throw new Error('Middleware not ready')
        }
      } catch (err) {
        console.warn('Middleware unavailable, using fallback regex tokenizer')
        useKuromojiRef.current = false
      }
    })()

    return initPromiseRef.current
  }, [])

  const extractText = useCallback(() => {
    if (!contentRef.current) return ''
    const chapters = contentRef.current.querySelectorAll('.epub-chapter')
    const texts: string[] = []
    chapters.forEach((chapter) => {
      texts.push(chapter.textContent || '')
    })
    return texts.join('\n')
  }, [contentRef])

  const tokenizeText = useCallback(
    async (text: string): Promise<TokenizedWord[]> => {
      if (!useKuromojiRef.current) {
        return fallbackTokenize(text)
      }

      try {
        const url = useMiddlewareProxy('/tokenize')
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) {
          throw new Error(`Middleware error: ${response.statusText}`)
        }

        const data = await response.json()
        return data.tokens || []
      } catch (err) {
        console.error('Middleware tokenization failed, falling back:', err)
        return fallbackTokenize(text)
      }
    },
    []
  )

  const dedupeAndCount = useCallback(
    (words: TokenizedWord[]): Map<string, { word: TokenizedWord; count: number }> => {
      const map = new Map<string, { word: TokenizedWord; count: number }>()
      words.forEach((word) => {
        const key = word.baseForm
        const existing = map.get(key)
        if (existing) {
          existing.count += 1
        } else {
          map.set(key, { word, count: 1 })
        }
      })
      return map
    },
    []
  )

  const enrichWithDefinitions = useCallback(
    async (
      words: Map<string, { word: TokenizedWord; count: number }>,
      deckName: string
    ): Promise<MinedWord[]> => {
      const minedWords: MinedWord[] = []

      for (const [key, { word, count }] of words) {
        const displayWord = word.reading ? `${word.surface} (${word.reading})` : word.surface
        onMiningWord?.(displayWord)
        const dictionaryResults = await batchLookup([key])
        const entry = dictionaryResults.get(key)

        if (entry) {
          // Filter by frequency range if specified
          if (frequencySource) {
            const freq = entry.frequencies?.find(f => f.sourceName === frequencySource)
            if (!freq) {
              console.log(`Skipping ${entry.expression} - no frequency data from ${frequencySource}`)
              continue
            }

            const inRange = (
              (minFrequencyRank === null || minFrequencyRank === undefined || freq.frequency >= minFrequencyRank) &&
              (maxFrequencyRank === null || maxFrequencyRank === undefined || freq.frequency <= maxFrequencyRank)
            )

            if (!inRange) {
              console.log(`Skipping ${entry.expression} - frequency ${freq.frequency} outside range [${minFrequencyRank}, ${maxFrequencyRank}]`)
              continue
            }
          }

          const minedWord: MinedWord = {
            surface: entry.expression,
            reading: entry.reading,
            baseForm: entry.expression,
            frequency: count,
            definitions: entry.definitions,
            frequencies: entry.frequencies || [],
            addedToAnki: false,
            bookId,
            minedAt: Date.now(),
          }

          minedWords.push(minedWord)
          console.log('Queueing word to Anki:', minedWord.surface)
          ankiQueue.addToQueue(minedWord, deckName)
        }

        await new Promise(resolve => setTimeout(resolve, 500))
      }

      return minedWords.sort((a, b) => b.frequency - a.frequency)
    },
    [bookId, onMiningWord, frequencySource, minFrequencyRank, maxFrequencyRank]
  )

  const mineWords = useCallback(async (): Promise<MinedWord[]> => {
    try {
      await initializeTokenizer()

      // Get default deck for auto-queuing
      const decks = (await getDeckNames()) || []
      const defaultDeck = decks.find(d => d === '自動') || decks[0] || 'Default'
      console.log('Mining to deck:', defaultDeck)

      if (frequencySource) {
        console.log(`Frequency filtering: source=${frequencySource}, range=[${minFrequencyRank}, ${maxFrequencyRank}]`)
      }

      const text = extractText()
      if (!text.trim()) throw new Error('No text found in reader')

      const tokens = await tokenizeText(text)
      if (tokens.length === 0) throw new Error('No words could be tokenized')

      const deduped = dedupeAndCount(tokens)
      const enriched = await enrichWithDefinitions(deduped, defaultDeck)
      console.log('Mined words:', enriched)

      return enriched
    } catch (err) {
      console.error('Mining error:', err)
      throw err
    }
  }, [initializeTokenizer, extractText, tokenizeText, dedupeAndCount, enrichWithDefinitions, frequencySource, minFrequencyRank, maxFrequencyRank])

  return { mineWords }
}
