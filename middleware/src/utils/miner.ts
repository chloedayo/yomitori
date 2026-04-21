import { tokenizeText } from './tokenizer.js'
import { AnkiAddResult } from './ankiClient.js'
import { enqueue } from './ankiQueue.js'

export interface WordEntry {
  expression: string
  reading: string
  definitions: string[]
  frequencies: { sourceName: string; frequency: number; frequencyTag?: string }[]
  dictionaryName: string
}

export interface MineResult {
  words: WordEntry[]
  anki: AnkiAddResult
}

const BATCH = 1000
const CONCURRENCY = 8
const SENT_RE = /[^。！？….\n\r]*[。！？….][^\S\n\r]*|[^。！？….\n\r]+$/gm
const KANA_ONLY_RE = /^[\u3040-\u30ff]+$/

async function lookupBatch(
  batch: string[],
  backendUrl: string,
  results: Map<string, WordEntry | null>,
  primaryDictName: string | null
): Promise<void> {
  try {
    const res = await fetch(`${backendUrl}/api/dictionary/batch-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: batch, primaryDictName: primaryDictName ?? undefined, primaryDictOnly: primaryDictName != null }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) { for (const w of batch) results.set(w, null); return }
    const data = await res.json() as Record<string, WordEntry[]>
    for (const word of batch) results.set(word, data[word]?.[0] ?? null)
  } catch {
    for (const w of batch) results.set(w, null)
  }
}

async function batchLookupBackend(
  words: string[],
  backendUrl: string,
  primaryDictName: string | null
): Promise<Map<string, WordEntry | null>> {
  const results = new Map<string, WordEntry | null>()
  const batches: string[][] = []
  for (let i = 0; i < words.length; i += BATCH) batches.push(words.slice(i, i + BATCH))

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    await Promise.all(batches.slice(i, i + CONCURRENCY).map(b => lookupBatch(b, backendUrl, results, primaryDictName)))
  }

  return results
}

function buildSentenceMap(text: string): Map<string, string> {
  const sentenceMap = new Map<string, string>()
  const sentences = (text.match(SENT_RE) ?? []).map(s => s.trim()).filter(s => s.length > 1)
  for (const sentence of sentences) {
    for (const token of tokenizeText(sentence)) {
      if (!KANA_ONLY_RE.test(token.baseForm) && !sentenceMap.has(token.baseForm))
        sentenceMap.set(token.baseForm, sentence)
    }
  }
  return sentenceMap
}

export async function mineWords(
  text: string,
  backendUrl: string,
  frequencySource: string | null,
  minFrequencyRank: number | null,
  maxFrequencyRank: number | null,
  frequencyTagFilter: string | null,
  bookTitle: string | null,
  primaryDictName: string | null
): Promise<MineResult> {
  console.log(`[miner] received ${text.length} chars — tokenizing with Kuromoji`)

  const sentenceMap = buildSentenceMap(text)
  const allBaseForms = new Set<string>(sentenceMap.keys())

  const totalBatches = Math.ceil(allBaseForms.size / BATCH)
  console.log(`[miner] tokenize done — ${allBaseForms.size} unique baseForms → ${totalBatches} batches (${CONCURRENCY} parallel)`)

  const dictResults = await batchLookupBackend([...allBaseForms], backendUrl, primaryDictName)

  console.log(`[miner] lookup done — filtering`)

  const words: WordEntry[] = []
  const wordBaseForms: string[] = []

  for (const [baseForm, entry] of dictResults.entries()) {
    if (!entry) continue

    if (frequencySource) {
      const freq = entry.frequencies?.find(f => f.sourceName === frequencySource)
      if (freq) {
        if (frequencyTagFilter != null) {
          if (freq.frequencyTag !== frequencyTagFilter) continue
        } else {
          const inRange =
            (minFrequencyRank == null || freq.frequency >= minFrequencyRank) &&
            (maxFrequencyRank == null || freq.frequency <= maxFrequencyRank)
          if (!inRange) continue
        }
      }
    }

    words.push(entry)
    wordBaseForms.push(baseForm)
  }

  console.log(`[miner] ${words.length} words — queuing to Anki`)

  const deckName = process.env.ANKI_DECK_NAME || '自動'

  const ankiNotes = words.map((w, i) => ({
    expression: w.expression,
    reading: w.reading,
    definitions: w.definitions,
    frequency: w.frequencies?.find(f => f.sourceName === frequencySource)?.frequency
      ?? w.frequencies?.[0]?.frequency
      ?? 0,
    sentence: sentenceMap.get(wordBaseForms[i]) ?? '',
  }))

  enqueue(ankiNotes, deckName, bookTitle ?? undefined)
  console.log(`[miner] done — ${words.length} words queued for Anki`)

  return { words, anki: { added: 0, skipped: 0, error: null } }
}
