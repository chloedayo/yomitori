const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'
const ANKI_URL = `${BACKEND_URL}/api/proxy/anki`

async function invoke(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json() as { result: unknown; error: string | null }
  if (data.error) throw new Error(data.error)
  return data.result
}

export interface AnkiNote {
  expression: string
  reading: string
  definitions: string[]
  frequency: number
  sentence?: string
}

export interface AnkiAddResult {
  added: number
  skipped: number
  error: string | null
}

export async function addNotesToAnki(
  notes: AnkiNote[],
  deckName: string,
  bookTitle?: string
): Promise<AnkiAddResult> {
  const ankiNotes = notes.map(n => ({
    deckName,
    modelName: 'Lapis',
    fields: {
      Expression: n.expression,
      ExpressionReading: n.reading,
      MainDefinition: n.definitions.length > 0 ? n.definitions.join('<br>') : 'No definition found',
      Sentence: n.sentence ?? '',
      Frequency: n.frequency.toString(),
      MiscInfo: bookTitle ?? '',
    },
    options: { allowDuplicate: false, duplicateScope: 'deck' },
    tags: bookTitle ? ['yomitori', bookTitle] : ['yomitori'],
  }))

  try {
    const models = await invoke('modelNames') as string[]
    if (!models.includes('Lapis')) {
      console.warn(`[ankiClient] model 'Lapis' not found — available: ${models.join(', ')}`)
      return { added: 0, skipped: 0, error: `model 'Lapis' not found` }
    }
    const fields = await invoke('modelFieldNames', { modelName: 'Lapis' }) as string[]
    console.log(`[ankiClient] Lapis fields: ${fields.join(', ')}`)

    const results = await invoke('addNotes', { notes: ankiNotes }) as (number | null)[]
    const added = results.filter(r => r !== null).length
    return { added, skipped: results.length - added, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('cannot create note because it is a duplicate')) {
      return { added: 0, skipped: notes.length, error: null }
    }
    return { added: 0, skipped: 0, error: msg }
  }
}
