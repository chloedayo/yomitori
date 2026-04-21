import { useProxy } from '../hooks/useProxy'

export interface DefinitionEntry {
  dictionaryName: string
  definition: string
}

export interface WordFrequency {
  sourceName: string
  frequency: number
  frequencyTag?: string
}

export interface FrequencySource {
  id: number
  name: string
  isNumeric: boolean
}

export interface DictionaryEntry {
  expression: string
  reading: string
  definitions: string[]
  definitionEntries: DefinitionEntry[]
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

export interface DictionaryImport {
  id: string
  name: string
}

export async function fetchDictionaryImports(): Promise<DictionaryImport[]> {
  try {
    const url = useProxy('/api/dictionary/imports')
    const response = await fetch(url)
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}

export async function batchLookup(words: string[], primaryDictName?: string | null): Promise<Map<string, DictionaryEntry[]>> {
  try {
    const url = useProxy('/api/dictionary/batch-lookup')
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words, primaryDictName: primaryDictName ?? undefined })
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
