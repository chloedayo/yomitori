import { useProxy } from '../hooks/useProxy'

export interface DictionaryEntry {
  expression: string
  reading: string
  definitions: string[]
  dictionaryName: string
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

export async function batchLookup(words: string[]): Promise<Map<string, DictionaryEntry | null>> {
  const results = new Map<string, DictionaryEntry | null>()
  for (const word of words) {
    results.set(word, await lookupWord(word))
    await new Promise(r => setTimeout(r, 100))
  }
  return results
}
