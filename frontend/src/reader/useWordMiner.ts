import { useRef, useCallback } from 'react'
import { batchLookup } from '../api/jishoClient'
import { MinedWord } from '../services/ankiService'

const MIDDLEWARE_URL = 'http://localhost:3000'

export interface UsWordMinerProps {
  contentRef: React.RefObject<HTMLDivElement>
  bookId: string
}

interface TokenizedWord {
  surface: string
  baseForm: string
  partOfSpeech: string
  reading?: string
}

const JLPT_LEVELS: Record<string, string | null> = {
  '1': 'N1',
  '2': 'N2',
  '3': 'N3',
  '4': 'N4',
  '5': 'N5',
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

export function useWordMiner({ contentRef, bookId }: UsWordMinerProps) {
  const useKuromojiRef = useRef(true)
  const initPromiseRef = useRef<Promise<void> | null>(null)

  const initializeTokenizer = useCallback(async () => {
    if (initPromiseRef.current) return initPromiseRef.current

    initPromiseRef.current = (async () => {
      try {
        const response = await fetch(`${MIDDLEWARE_URL}/health`)
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
        const response = await fetch(`${MIDDLEWARE_URL}/tokenize`, {
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
      words: Map<string, { word: TokenizedWord; count: number }>
    ): Promise<MinedWord[]> => {
      const wordKeys = Array.from(words.keys())
      const jishoResults = await batchLookup(wordKeys)

      const minedWords: MinedWord[] = []
      jishoResults.forEach((entry, key) => {
        const { word, count } = words.get(key)!
        const jlptTag = entry?.jlpt?.[0]
        const jlptLevel = jlptTag ? JLPT_LEVELS[jlptTag] : null
        const definitions =
          entry?.senses?.[0]?.english_definitions?.slice(0, 3) || ['No definition found']

        minedWords.push({
          surface: word.surface,
          reading: word.reading || '',
          baseForm: word.baseForm,
          frequency: count,
          jlptLevel,
          definitions,
          addedToAnki: false,
          bookId,
          minedAt: Date.now(),
        })
      })

      return minedWords.sort((a, b) => b.frequency - a.frequency)
    },
    [bookId]
  )

  const mineWords = useCallback(async (): Promise<MinedWord[]> => {
    try {
      await initializeTokenizer()

      const text = extractText()
      if (!text.trim()) throw new Error('No text found in reader')

      const tokens = await tokenizeText(text)
      if (tokens.length === 0) throw new Error('No words could be tokenized')

      const deduped = dedupeAndCount(tokens)
      const enriched = await enrichWithDefinitions(deduped)
      console.log('Mined words:', enriched)

      return enriched
    } catch (err) {
      console.error('Mining error:', err)
      throw err
    }
  }, [initializeTokenizer, extractText, tokenizeText, dedupeAndCount, enrichWithDefinitions])

  return { mineWords }
}
