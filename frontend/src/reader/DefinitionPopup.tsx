import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { SelectionEntry, SelectionRect } from './useSelectionDefinition'
import { addNote, getDeckNames, checkConnection, canAddBatch } from '../services/ankiService'
import { upsertWord, getWord } from '../services/dictionaryStore'
import { lookupWord, DictionaryEntry } from '../api/dictionaryClient'
import './DefinitionPopup.css'

function DefinitionHtml({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
}

interface DefinitionPopupProps {
  entries: SelectionEntry[]
  rect: SelectionRect
  rawText: string
  isVertical: boolean
  bookId: string | null
  onDismiss: () => void
  onAnnotate?: (selectedText: string) => void
  onInlineAnnotate?: (rawText: string) => void
}

type ActionStatus = 'idle' | 'loading' | 'ok' | 'err' | 'offline'

interface EntryStatus {
  anki: ActionStatus
  dict: ActionStatus
}

interface KanjiResult {
  kanji: string
  entry: DictionaryEntry | null
  loading: boolean
}

const MAX_DEFINITIONS = 3
const KANJI_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

function ExpressionWithKanji({
  expression,
  onKanjiClick,
}: {
  expression: string
  onKanjiClick: (kanji: string) => void
}) {
  return (
    <span className="definition-popup__expression">
      {[...expression].map((char, i) =>
        KANJI_RE.test(char) ? (
          <span
            key={i}
            className="definition-popup__kanji"
            onClick={e => { e.stopPropagation(); onKanjiClick(char) }}
          >
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        )
      )}
    </span>
  )
}

export function DefinitionPopup({ entries, rect, rawText, isVertical, bookId, onDismiss, onAnnotate, onInlineAnnotate }: DefinitionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const deckNameRef = useRef<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, EntryStatus>>({})
  const [altStatuses, setAltStatuses] = useState<Record<string, EntryStatus>>({})
  const [kanjiResults, setKanjiResults] = useState<Record<string, KanjiResult>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [seeAlsoOpen, setSeeAlsoOpen] = useState<Record<string, boolean>>({})
  const [expandedAlts, setExpandedAlts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onDismiss])

  useLayoutEffect(() => {
    const el = popupRef.current
    if (!el) return

    el.style.visibility = 'hidden'
    el.style.left = '0px'
    el.style.top = '0px'

    const vw = window.innerWidth
    const vh = window.innerHeight
    const pw = el.offsetWidth
    const ph = el.offsetHeight

    let left: number
    let top: number

    if (isVertical) {
      left = rect.left - pw - 10
      if (left < 8) left = rect.right + 10
      if (left + pw > vw - 8) left = 8
      top = rect.top
      if (top + ph > vh - 8) top = vh - ph - 8
      if (top < 8) top = 8
    } else {
      left = rect.left + (rect.right - rect.left) / 2 - pw / 2
      top = rect.top - ph - 10
      if (top < 8) top = rect.bottom + 10
      if (left + pw > vw - 8) left = vw - pw - 8
      if (left < 8) left = 8
    }

    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.visibility = 'visible'
  }, [rect, isVertical, entries])

  useEffect(() => {
    setKanjiResults({})
    setCollapsed({})
    setSeeAlsoOpen({})
    setExpandedAlts(new Set())
    setStatuses({})
    setAltStatuses({})

    let cancelled = false

    async function checkInitialStatuses() {
      const ankiOnline = await checkConnection()
      if (cancelled) return

      // Collect all expressions for one batch call
      const allExpressions: string[] = []
      for (const { entry, alternates } of entries) {
        allExpressions.push(entry.expression)
        alternates.forEach(alt => allExpressions.push(alt.expression))
      }

      const ankiMap = ankiOnline ? await canAddBatch(allExpressions) : {}
      if (cancelled) return

      for (const { baseForm, entry, alternates } of entries) {
        if (cancelled) return

        const saved = await getWord(baseForm)
        if (cancelled) return
        if (saved) {
          setStatuses(prev => ({ ...prev, [baseForm]: { ...{ anki: 'idle', dict: 'idle' }, ...prev[baseForm], dict: 'ok' } }))
        }

        if (!ankiOnline) {
          setStatuses(prev => ({ ...prev, [baseForm]: { ...{ anki: 'idle', dict: 'idle' }, ...prev[baseForm], anki: 'offline' } }))
        } else if (ankiMap[entry.expression] === false) {
          setStatuses(prev => ({ ...prev, [baseForm]: { ...{ anki: 'idle', dict: 'idle' }, ...prev[baseForm], anki: 'ok' } }))
        }

        for (let j = 0; j < alternates.length; j++) {
          if (cancelled) return
          const alt = alternates[j]
          const altKey = `${baseForm}::${j}::${alt.expression}`
          if (!ankiOnline) {
            setAltStatuses(prev => ({ ...prev, [altKey]: { ...{ anki: 'idle', dict: 'idle' }, ...prev[altKey], anki: 'offline' } }))
          } else if (ankiMap[alt.expression] === false) {
            setAltStatuses(prev => ({ ...prev, [altKey]: { ...{ anki: 'idle', dict: 'idle' }, ...prev[altKey], anki: 'ok' } }))
          }
        }
      }
    }

    checkInitialStatuses()
    return () => { cancelled = true }
  }, [entries])

  const handleKanjiClick = useCallback(async (kanji: string) => {
    if (kanjiResults[kanji]) return
    setKanjiResults(prev => ({ ...prev, [kanji]: { kanji, entry: null, loading: true } }))
    const entry = await lookupWord(kanji)
    setKanjiResults(prev => ({ ...prev, [kanji]: { kanji, entry, loading: false } }))
  }, [kanjiResults])

  const setStatus = useCallback((baseForm: string, key: 'anki' | 'dict', value: ActionStatus) => {
    setStatuses(prev => ({
      ...prev,
      [baseForm]: { ...{ anki: 'idle', dict: 'idle' }, ...prev[baseForm], [key]: value },
    }))
  }, [])

  const setAltStatus = useCallback((altKey: string, key: 'anki' | 'dict', value: ActionStatus) => {
    setAltStatuses(prev => ({
      ...prev,
      [altKey]: { ...{ anki: 'idle', dict: 'idle' }, ...prev[altKey], [key]: value },
    }))
  }, [])

  const handleAddAnki = useCallback(async (entry: SelectionEntry) => {
    setStatus(entry.baseForm, 'anki', 'loading')
    try {
      if (!deckNameRef.current) {
        const decks = await getDeckNames()
        deckNameRef.current = decks.find(d => d === '自動') || decks[0] || 'Default'
      }
      await addNote(
        {
          surface: entry.entry.expression,
          reading: entry.entry.reading,
          baseForm: entry.baseForm,
          frequency: entry.entry.frequencies?.[0]?.frequency ?? 0,
          definitions: entry.entry.definitions,
          definitionEntries: entry.entry.definitionEntries ?? [],
          frequencies: entry.entry.frequencies ?? [],
          addedToAnki: false,
          bookId: bookId || '',
          minedAt: Date.now(),
        },
        deckNameRef.current
      )
      setStatus(entry.baseForm, 'anki', 'ok')
    } catch {
      setStatus(entry.baseForm, 'anki', 'err')
    }
  }, [bookId, setStatus])

  const handleAddDict = useCallback(async (entry: SelectionEntry) => {
    setStatus(entry.baseForm, 'dict', 'loading')
    try {
      await upsertWord({
        baseForm: entry.baseForm,
        surface: entry.entry.expression,
        reading: entry.entry.reading,
        definitions: entry.entry.definitions,
        definitionEntries: entry.entry.definitionEntries ?? [],
        frequencies: entry.entry.frequencies ?? [],
        bookId: bookId || '',
        minedAt: Date.now(),
      })
      setStatus(entry.baseForm, 'dict', 'ok')
    } catch {
      setStatus(entry.baseForm, 'dict', 'err')
    }
  }, [bookId, setStatus])

  const handleAltAddAnki = useCallback(async (alt: DictionaryEntry, baseForm: string, altKey: string) => {
    setAltStatus(altKey, 'anki', 'loading')
    try {
      if (!deckNameRef.current) {
        const decks = await getDeckNames()
        deckNameRef.current = decks.find(d => d === '自動') || decks[0] || 'Default'
      }
      await addNote(
        {
          surface: alt.expression,
          reading: alt.reading,
          baseForm,
          frequency: alt.frequencies?.[0]?.frequency ?? 0,
          definitions: alt.definitions,
          definitionEntries: alt.definitionEntries ?? [],
          frequencies: alt.frequencies ?? [],
          addedToAnki: false,
          bookId: bookId || '',
          minedAt: Date.now(),
        },
        deckNameRef.current
      )
      setAltStatus(altKey, 'anki', 'ok')
    } catch {
      setAltStatus(altKey, 'anki', 'err')
    }
  }, [bookId, setAltStatus])

  const handleAltAddDict = useCallback(async (alt: DictionaryEntry, baseForm: string, altKey: string) => {
    setAltStatus(altKey, 'dict', 'loading')
    try {
      await upsertWord({
        baseForm,
        surface: alt.expression,
        reading: alt.reading,
        definitions: alt.definitions,
        definitionEntries: alt.definitionEntries ?? [],
        frequencies: alt.frequencies ?? [],
        bookId: bookId || '',
        minedAt: Date.now(),
      })
      setAltStatus(altKey, 'dict', 'ok')
    } catch {
      setAltStatus(altKey, 'dict', 'err')
    }
  }, [bookId, setAltStatus])

  const toggleAlt = useCallback((altKey: string) => {
    setExpandedAlts(prev => {
      const next = new Set(prev)
      next.has(altKey) ? next.delete(altKey) : next.add(altKey)
      return next
    })
  }, [])

  return (
    <div ref={popupRef} className="definition-popup">
      <div className="definition-popup__topbar">
        <div className="definition-popup__topbar-left">
          {onAnnotate && entries.length > 0 && (
            <button
              className="definition-popup__note-btn"
              onClick={() => { onAnnotate(entries[0].entry.expression); onDismiss() }}
              aria-label="Add note"
            >+ Note</button>
          )}
          {onInlineAnnotate && rawText && (
            <button
              className="definition-popup__note-btn"
              onClick={() => { onInlineAnnotate(rawText); onDismiss() }}
              aria-label="Add inline annotation"
            >✏ Inline</button>
          )}
        </div>
        <button className="definition-popup__dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
      </div>
      <div className="definition-popup__body">
        {entries.map(({ surface, baseForm, entry, alternates }, i) => {
          const st = statuses[baseForm] ?? { anki: 'idle', dict: 'idle' }
          const isCollapsed = collapsed[baseForm] ?? false
          const isSeeAlsoOpen = seeAlsoOpen[baseForm] ?? false

          const entryKanji = [...entry.expression].filter(c => KANJI_RE.test(c))
          const activeKanji = entryKanji.filter(k => kanjiResults[k])

          return (
            <div
              key={baseForm}
              className={`definition-popup__entry${i < entries.length - 1 ? ' definition-popup__entry--divider' : ''}`}
            >
              <div className="definition-popup__header">
                <ExpressionWithKanji expression={entry.expression} onKanjiClick={handleKanjiClick} />
                {entry.reading && entry.reading !== entry.expression && (
                  <span className="definition-popup__reading">【{entry.reading}】</span>
                )}
                {surface !== entry.expression && (
                  <span className="definition-popup__surface">（{surface}）</span>
                )}
                <button
                  className="definition-popup__collapse"
                  onClick={() => setCollapsed(prev => ({ ...prev, [baseForm]: !isCollapsed }))}
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >{isCollapsed ? '▸' : '▾'}</button>
              </div>
              {!isCollapsed && <>
              <ol className="definition-popup__definitions">
                {(entry.definitionEntries?.length > 0 ? entry.definitionEntries : entry.definitions.map(d => ({ dictionaryName: entry.dictionaryName, definition: d }))).slice(0, MAX_DEFINITIONS).map((de, j) => (
                  <li key={j}>
                    {entry.definitionEntries?.length > 1 && (
                      <span className="definition-popup__dict-label">{de.dictionaryName}</span>
                    )}
                    <DefinitionHtml html={de.definition} />
                  </li>
                ))}
              </ol>

              {alternates.length > 0 && (
                <div className="definition-popup__see-also">
                  <button
                    className="definition-popup__see-also-toggle"
                    onClick={() => setSeeAlsoOpen(prev => ({ ...prev, [baseForm]: !isSeeAlsoOpen }))}
                  >
                    {isSeeAlsoOpen ? '▾' : '▸'} see also ({alternates.length})
                  </button>
                  {isSeeAlsoOpen && alternates.map((alt, j) => {
                    const altKey = `${baseForm}::${j}::${alt.expression}`
                    const isAltExpanded = expandedAlts.has(altKey)
                    const altSt = altStatuses[altKey] ?? { anki: 'idle', dict: 'idle' }
                    return (
                      <div key={j} className={`definition-popup__alt${isAltExpanded ? ' definition-popup__alt--expanded' : ''}`}>
                        <div className="definition-popup__alt-header">
                          <button
                            className="definition-popup__alt-toggle"
                            onClick={() => toggleAlt(altKey)}
                          >
                            <span className="definition-popup__alt-arrow">{isAltExpanded ? '▾' : '▸'}</span>
                            <span className="definition-popup__see-also-expr">{alt.expression}</span>
                            {alt.reading && alt.reading !== alt.expression && (
                              <span className="definition-popup__see-also-reading">【{alt.reading}】</span>
                            )}
                          </button>
                          {isAltExpanded && (
                            <div className="definition-popup__alt-inline-actions">
                              <button
                                className={`definition-popup__alt-btn definition-popup__alt-btn--anki ${altSt.anki !== 'idle' ? `is-${altSt.anki}` : ''}`}
                                onClick={() => handleAltAddAnki(alt, baseForm, altKey)}
                                disabled={altSt.anki !== 'idle' && altSt.anki !== 'err'}
                              >
                                {altSt.anki === 'loading' ? '…' : altSt.anki === 'ok' ? '✓' : altSt.anki === 'err' ? '✗A' : altSt.anki === 'offline' ? '–' : '+A'}
                              </button>
                              <button
                                className={`definition-popup__alt-btn definition-popup__alt-btn--dict ${altSt.dict !== 'idle' ? `is-${altSt.dict}` : ''}`}
                                onClick={() => handleAltAddDict(alt, baseForm, altKey)}
                                disabled={altSt.dict !== 'idle' && altSt.dict !== 'err'}
                              >
                                {altSt.dict === 'loading' ? '…' : altSt.dict === 'ok' ? '✓' : altSt.dict === 'err' ? '✗D' : '+D'}
                              </button>
                            </div>
                          )}
                        </div>
                        {isAltExpanded && (
                          <div className="definition-popup__alt-body">
                            <ol className="definition-popup__alt-definitions">
                              {(alt.definitionEntries?.length > 0 ? alt.definitionEntries : alt.definitions.map(d => ({ dictionaryName: alt.dictionaryName, definition: d }))).slice(0, MAX_DEFINITIONS).map((de, k) => (
                                <li key={k}>
                                  {alt.definitionEntries?.length > 1 && (
                                    <span className="definition-popup__dict-label">{de.dictionaryName}</span>
                                  )}
                                  <DefinitionHtml html={de.definition} />
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {activeKanji.map(k => {
                const r = kanjiResults[k]
                return (
                  <div key={k} className="definition-popup__kanji-result">
                    <span className="definition-popup__kanji-result-char">{k}</span>
                    {r.loading ? (
                      <span className="definition-popup__kanji-result-body">…</span>
                    ) : r.entry ? (
                      <span className="definition-popup__kanji-result-body">
                        {r.entry.reading && <span className="definition-popup__kanji-result-reading">【{r.entry.reading}】</span>}
                        <DefinitionHtml html={r.entry.definitions[0]} />
                      </span>
                    ) : (
                      <span className="definition-popup__kanji-result-body definition-popup__kanji-result-body--none">no entry</span>
                    )}
                  </div>
                )
              })}

              <div className="definition-popup__actions">
                <button
                  className={`definition-popup__action-btn definition-popup__action-btn--anki ${st.anki !== 'idle' ? `is-${st.anki}` : ''}`}
                  onClick={() => handleAddAnki({ surface, baseForm, entry, alternates })}
                  disabled={st.anki !== 'idle' && st.anki !== 'err'}
                >
                  {st.anki === 'loading' ? '…' : st.anki === 'ok' ? '✓ Anki' : st.anki === 'err' ? '✗ Anki' : st.anki === 'offline' ? '– Anki' : '+ Anki'}
                </button>
                <button
                  className={`definition-popup__action-btn definition-popup__action-btn--dict ${st.dict !== 'idle' ? `is-${st.dict}` : ''}`}
                  onClick={() => handleAddDict({ surface, baseForm, entry, alternates })}
                  disabled={st.dict !== 'idle' && st.dict !== 'err'}
                >
                  {st.dict === 'loading' ? '…' : st.dict === 'ok' ? '✓ Dict' : st.dict === 'err' ? '✗ Dict' : '+ Dict'}
                </button>
              </div>
              {entry.dictionaryName && (
                <div className="definition-popup__source">{entry.dictionaryName}</div>
              )}
              </>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
