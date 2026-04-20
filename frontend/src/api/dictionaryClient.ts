import { useProxy } from '../hooks/useProxy'

export interface WordFrequency {
  sourceName: string
  frequency: number
}

export interface DictionaryEntry {
  expression: string
  reading: string
  definitions: string[]
  dictionaryName: string
  frequencies: WordFrequency[]
}

async function dictionaryLookup(word: string): Promise<DictionaryEntry | null> {
  const url = useProxy(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Dictionary lookup failed: ${response.statusText}`)
  const results: DictionaryEntry[] = await response.json()
  return results?.[0] ?? null
}

export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  try {
    return await dictionaryLookup(word)
  } catch (err) {
    console.error('Dictionary lookup error:', err)
    return null
  }
}

export async function batchLookup(words: string[]): Promise<Map<string, DictionaryEntry[]>> {
  try {
    const url = useProxy('/api/dictionary/batch-lookup')
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words })
    })
    if (!response.ok) throw new Error(`Batch lookup failed: ${response.statusText}`)

    const data: Record<string, DictionaryEntry[]> = await response.json()
    const results = new Map<string, DictionaryEntry[]>()

    for (const word of words) {
      results.set(word, data[word] ?? [])
    }

    return results
  } catch (err) {
    console.error('Batch lookup error:', err)
    const results = new Map<string, DictionaryEntry[]>()
    for (const word of words) {
      results.set(word, [])
    }
    return results
  }
}
