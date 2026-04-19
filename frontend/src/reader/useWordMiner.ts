import { useRef, useCallback } from 'react'
import * as kuromoji from 'kuromoji'
import { batchLookup } from '../api/jishoClient'
import { MinedWord } from '../services/ankiService'

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

export function useWordMiner({ contentRef, bookId }: UsWordMinerProps) {
  const tokenizerRef = useRef<any | null>(null)
  const useKuromorjiRef = useRef(true)

  const initializeTokenizer = useCallback(async () => {
    if (tokenizerRef.current) return
    try {
      tokenizerRef.current = await (kuromoji as any).builder({ dicPath: '/node_modules/kuromoji/dict' }).build()
    } catch {
      try {
        tokenizerRef.current = await (kuromoji as any).builder({ dicPath: 'node_modules/kuromoji/dict' }).build()
      } catch (err) {
        console.warn('Kuromoji unavailable in browser, using simple tokenizer:', err)
        useKuromorjiRef.current = false
      }
    }
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
    (text: string): TokenizedWord[] => {
      if (useKuromorjiRef.current && tokenizerRef.current) {
        const tokens = tokenizerRef.current.tokenize(text)
        return tokens
          .filter((token: any) => {
            const pos = token.pos[0]
            return (pos === '名詞' || pos === '動詞' || pos === '形容詞') && token.surface.length > 1
          })
          .map((token: any) => ({
            surface: token.surface,
            baseForm: token.basic_form || token.surface,
            partOfSpeech: token.pos[0],
            reading: token.reading_form,
          }))
      }

      // Fallback: simple tokenizer (split on whitespace + punctuation)
      const words = text.match(/[\p{L}\p{N}]+/gu) || []
      return words
        .filter(w => w.length > 1)
        .map(word => ({
          surface: word,
          baseForm: word,
          partOfSpeech: 'unknown',
          reading: undefined,
        }))
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

      const tokens = tokenizeText(text)
      if (tokens.length === 0) throw new Error('No words could be tokenized')

      const deduped = dedupeAndCount(tokens)
      const enriched = await enrichWithDefinitions(deduped)

      return enriched
    } catch (err) {
      console.error('Mining error:', err)
      throw err
    }
  }, [initializeTokenizer, extractText, tokenizeText, dedupeAndCount, enrichWithDefinitions])

  return { mineWords }
}
