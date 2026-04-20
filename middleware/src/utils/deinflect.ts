import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface DeinflectCandidate {
  startPos: number  // character offset in original text
  surface: string   // original substring (text[startPos..startPos+surface.length])
  baseForm: string  // deinflected form to look up in dictionary
  reason: string    // conjugation type label
}

const MAX_SUBSTR_LEN = 12

interface Rule {
  in: string
  out: string
  reason: string
}

function loadRules(): { rules: Rule[]; trailingParticles: string[] } {
  const path = process.env.DEINFLECT_RULES_PATH
    ?? resolve(__dirname, '../../deinflect-rules.json')
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'))
    console.log(`[deinflect] loaded ${raw.rules.length} rules from ${path}`)
    return raw
  } catch (err) {
    console.error(`[deinflect] failed to load rules from ${path}:`, err)
    throw err
  }
}

const { rules: RULES, trailingParticles: TRAILING_PARTICLES } = loadRules()

function stripParticles(text: string): string[] {
  const results: string[] = []
  for (const p of TRAILING_PARTICLES) {
    if (text.endsWith(p) && text.length > p.length) {
      results.push(text.slice(0, text.length - p.length))
    }
  }
  return results
}

// Returns all base form candidates for a single word (no startPos)
function deinflectWord(word: string): { baseForm: string; reason: string }[] {
  const seen = new Set<string>()
  const results: { baseForm: string; reason: string }[] = []

  const add = (baseForm: string, reason: string) => {
    if (baseForm.length === 0 || seen.has(baseForm)) return
    seen.add(baseForm)
    results.push({ baseForm, reason })
  }

  const applyRules = (candidate: string) => {
    for (const rule of RULES) {
      if (candidate.endsWith(rule.in) && candidate.length > rule.in.length) {
        add(candidate.slice(0, candidate.length - rule.in.length) + rule.out, rule.reason)
      }
    }
    add(candidate, 'plain')
  }

  applyRules(word)
  for (const stripped of stripParticles(word)) {
    applyRules(stripped)
  }

  return results
}

// Extracts all unique baseForms from a large text by chunking internally.
// Used by the word miner — single call replaces N chunk calls from frontend.
export function extractBaseForms(text: string, chunkSize = 500): string[] {
  const seen = new Set<string>()
  for (let i = 0; i < text.length; i += chunkSize) {
    for (const { baseForm } of deinflect(text.slice(i, i + chunkSize))) {
      seen.add(baseForm)
    }
  }
  return [...seen]
}

// Generates candidates for every substring in text, tagged with startPos.
// Frontend uses these to greedy-match against dictionary results.
export function deinflect(text: string): DeinflectCandidate[] {
  const results: DeinflectCandidate[] = []
  const indexByKey = new Map<string, number>()

  for (let i = 0; i < text.length; i++) {
    const maxJ = Math.min(text.length, i + MAX_SUBSTR_LEN)
    for (let j = maxJ; j > i; j--) {
      const surface = text.slice(i, j)
      for (const { baseForm, reason } of deinflectWord(surface)) {
        const key = `${i}|${baseForm}`
        const existing = indexByKey.get(key)
        if (existing === undefined) {
          indexByKey.set(key, results.length)
          results.push({ startPos: i, surface, baseForm, reason })
        } else if (surface.length < results[existing].surface.length) {
          // Prefer shorter surface so greedy matches the exact form, not particle-padded
          results[existing] = { startPos: i, surface, baseForm, reason }
        }
      }
    }
  }

  return results
}
