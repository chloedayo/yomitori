export interface JishoSearchResult {
  data: JishoEntry[]
}

export interface JishoEntry {
  slug: string
  is_common: boolean
  tags: string[]
  jlpt: string[]
  japanese: JapaneseForm[]
  senses: Sense[]
}

export interface JapaneseForm {
  word?: string
  reading?: string
}

export interface Sense {
  english_definitions: string[]
  parts_of_speech: string[]
  tags: string[]
  restrictions: string[]
}

async function jishoProxy(word: string): Promise<JishoSearchResult> {
  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Jisho lookup failed: ${response.statusText}`)
  return response.json()
}

export async function lookupWord(word: string): Promise<JishoEntry | null> {
  try {
    const result = await jishoProxy(word)
    return result.data?.[0] ?? null
  } catch (err) {
    console.error('Jisho lookup error:', err)
    return null
  }
}

export async function batchLookup(words: string[]): Promise<Map<string, JishoEntry | null>> {
  const results = new Map<string, JishoEntry | null>()
  for (const word of words) {
    results.set(word, await lookupWord(word))
    await new Promise(r => setTimeout(r, 100)) // rate limit
  }
  return results
}
