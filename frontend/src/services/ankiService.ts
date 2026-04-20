import { useProxy } from '../hooks/useProxy';

export interface DictionaryFrequency {
  sourceName: string
  frequency: number
}

export interface MinedWord {
  surface: string
  reading: string
  baseForm: string
  frequency: number
  definitions: string[]
  definitionEntries: Array<{ dictionaryName: string; definition: string }>
  frequencies: DictionaryFrequency[]
  addedToAnki: boolean
  bookId: string
  minedAt: number
}

const ANKI_PROXY_URL = useProxy('/api/proxy/anki')

interface AnkiRequest {
  action: string
  version: number
  params: Record<string, any>
}

async function invoke(action: string, params: Record<string, any> = {}): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(ANKI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params } as AnkiRequest),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`AnkiConnect error: ${response.statusText}`)
    const result = await response.json()
    if (result.error) throw new Error(result.error)
    return result.result
  } catch (err: any) {
    const message = err?.message || String(err)
    if (message.includes('AbortError') || message.includes('timeout')) {
      const error = new Error('AnkiConnect not found. Is Anki running with AnkiConnect add-on?')
      console.error('AnkiConnect timeout:', err)
      throw error
    }
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      const error = new Error('AnkiConnect not found. Is Anki running with AnkiConnect add-on?')
      console.error('AnkiConnect network error:', err)
      throw error
    }
    console.error('AnkiConnect invoke error:', err)
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    const version = await invoke('version')
    return version === 6
  } catch {
    return false
  }
}

export async function isNoteInAnki(expression: string): Promise<boolean> {
  try {
    const result = await invoke('findNotes', { query: `Expression:"${expression}"` })
    return Array.isArray(result) && result.length > 0
  } catch {
    return false
  }
}

export async function getDeckNames(): Promise<string[]> {
  try {
    return await invoke('deckNames')
  } catch {
    return []
  }
}

export async function addNote(word: MinedWord, deckName: string): Promise<number> {
  const tags = [`yomitori`]

  return await invoke('addNote', {
    note: {
      deckName,
      modelName: 'Lapis',
      fields: {
        Expression: word.surface,
        ExpressionFurigana: word.reading,
        ExpressionReading: word.reading,
        MainDefinition: word.definitions.length > 0 ? word.definitions.join('<br>') : 'No definition found',
        Frequency: word.frequency.toString(),
      },
      tags,
    },
  })
}

export async function addNotes(words: MinedWord[], deckName: string): Promise<(number | null)[]> {
  const tags = [`yomitori`];

  const notes = words.map((word) => ({
    deckName,
    modelName: 'Lapis',
    fields: {
      Expression: word.surface,
      ExpressionFurigana: word.reading,
      ExpressionReading: word.reading,
      MainDefinition: word.definitions.length > 0 ? word.definitions.join('<br>') : 'No definition found',
      Frequency: word.frequency.toString(),
    },
    tags,
  }))

  try {
    return await invoke('addNotes', { notes })
  } catch (err: any) {
    // AnkiConnect returns top-level error (result: null) when ALL notes are duplicates
    // instead of [null, null, ...] — treat as all-duplicate, not a real failure
    if (err?.message?.includes('cannot create note because it is a duplicate')) {
      return new Array(words.length).fill(null)
    }
    throw err
  }
}
