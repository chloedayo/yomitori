export interface MinedWord {
  surface: string
  reading: string
  baseForm: string
  frequency: number
  jlptLevel: string | null
  definitions: string[]
  addedToAnki: boolean
  bookId: string
  minedAt: number
}

const ANKI_URL = 'http://localhost:8765'

interface AnkiRequest {
  action: string
  version: number
  params: Record<string, any>
}

async function invoke(action: string, params: Record<string, any> = {}): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(ANKI_URL, {
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

export async function getDeckNames(): Promise<string[]> {
  try {
    return await invoke('deckNames')
  } catch {
    return []
  }
}

export async function addNote(word: MinedWord, deckName: string): Promise<number> {
  const front = `${word.surface}${word.reading ? ` (${word.reading})` : ''}`
  const back = word.definitions.length > 0 ? word.definitions.join('<br>') : 'No definition found'
  const tags = []
  if (word.jlptLevel) tags.push(`jlpt-${word.jlptLevel.toLowerCase()}`)
  tags.push(`yomitori-${word.bookId}`)

  return await invoke('addNote', {
    note: {
      deckName,
      modelName: 'Basic',
      fields: { Front: front, Back: back },
      tags,
    },
  })
}

export async function addNotes(words: MinedWord[], deckName: string): Promise<number[]> {
  const notes = words.map((word) => ({
    deckName,
    modelName: 'Basic',
    fields: {
      Front: `${word.surface}${word.reading ? ` (${word.reading})` : ''}`,
      Back: word.definitions.length > 0 ? word.definitions.join('<br>') : 'No definition found',
    },
    tags: [
      ...(word.jlptLevel ? [`jlpt-${word.jlptLevel.toLowerCase()}`] : []),
      `yomitori-${word.bookId}`,
    ],
  }))

  return await invoke('addNotes', { notes })
}
