import { useState, useEffect, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { getAllWords, searchWords, getWordCount, clearDictionary, DictionaryWord } from '../../services/dictionaryStore'
import { getAllReviews, WordReview } from '../../services/reviewStore'
import { useProxy } from '../../hooks/useProxy'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import TuneIcon from '@mui/icons-material/Tune'
import './style.scss'

const STATUS_COLOR: Record<WordReview['status'], string> = {
  new:       '#4a4a5a',
  learning:  '#f59e0b',
  reviewing: '#5a9fd4',
  known:     '#4caf50',
}

function ReviewRow({ review }: { review: WordReview }) {
  const total = review.correctCount + review.incorrectCount
  const accuracy = total > 0 ? Math.round((review.correctCount / total) * 100) : null
  return (
    <div className="dict-review-row">
      <span
        className="dict-review-status"
        style={{ background: STATUS_COLOR[review.status] }}
      >
        {review.status}
      </span>
      {review.streak > 0 && (
        <span className="dict-review-streak">🔥 {review.streak}</span>
      )}
      {accuracy !== null && (
        <span className="dict-review-accuracy">{accuracy}% ({total}×)</span>
      )}
      {review.interval > 0 && (
        <span className="dict-review-interval">∿ {review.interval}d</span>
      )}
    </div>
  )
}

const KANA_ROWS: { label: string; set: Set<string> }[] = [
  { label: 'あ', set: new Set('あいうえおアイウエオ') },
  { label: 'か', set: new Set('かきくけこがぎぐげごカキクケコガギグゲゴ') },
  { label: 'さ', set: new Set('さしすせそざじずぜぞサシスセソザジズゼゾ') },
  { label: 'た', set: new Set('たちつてとだぢづでどタチツテトダヂヅデド') },
  { label: 'な', set: new Set('なにぬねのナニヌネノ') },
  { label: 'は', set: new Set('はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ') },
  { label: 'ま', set: new Set('まみむめもマミムメモ') },
  { label: 'や', set: new Set('やゆよヤユヨゃゅょャュョ') },
  { label: 'ら', set: new Set('らりるれろラリルレロ') },
  { label: 'わ', set: new Set('わをんワヲン') },
]

function matchesKanaRow(word: DictionaryWord, rowLabel: string): boolean {
  const row = KANA_ROWS.find(r => r.label === rowLabel)
  if (!row) return true
  const first = (word.reading || word.surface)[0]
  return first ? row.set.has(first) : false
}

function matchesFrequency(
  word: DictionaryWord,
  source: string | null,
  min: number | null,
  max: number | null,
): boolean {
  if (!source) return true
  const entry = word.frequencies.find(f => f.sourceName === source)
  if (!entry) return false
  if (min !== null && entry.frequency < min) return false
  if (max !== null && entry.frequency > max) return false
  return true
}

function DictWordPopup({ word, review, onClose }: { word: DictionaryWord; review?: WordReview; onClose: () => void }) {
  const grouped = word.definitionEntries.reduce<Record<string, string[]>>((acc, de) => {
    ;(acc[de.dictionaryName] ??= []).push(de.definition)
    return acc
  }, {})
  const hasGrouped = Object.keys(grouped).length > 0

  return (
    <div className="dict-popup-overlay" onClick={onClose}>
      <div className="dict-popup" onClick={e => e.stopPropagation()}>
        <div className="dict-popup__header">
          <div className="dict-popup__title">
            <span className="dict-popup__surface">{word.surface}</span>
            {word.reading && word.reading !== word.surface && (
              <span className="dict-popup__reading">【{word.reading}】</span>
            )}
            {word.baseForm !== word.surface && (
              <span className="dict-popup__baseform">({word.baseForm})</span>
            )}
          </div>
          <button className="dict-popup__close" onClick={onClose}>✕</button>
        </div>

        <div className="dict-popup__body">
          {hasGrouped ? (
            Object.entries(grouped).map(([dictName, defs]) => (
              <div key={dictName} className="dict-popup__section">
                <div className="dict-popup__dict-name">{dictName}</div>
                <ol className="dict-popup__defs">
                  {defs.map((def, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(def) }} />
                  ))}
                </ol>
              </div>
            ))
          ) : (
            <ol className="dict-popup__defs">
              {word.definitions.map((def, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(def) }} />
              ))}
            </ol>
          )}

          {word.frequencies.length > 0 && (
            <div className="dict-popup__freqs">
              {word.frequencies.map(f => (
                <span key={f.sourceName} className="dict-popup__freq-badge">
                  {f.sourceName}: #{f.frequency}
                </span>
              ))}
            </div>
          )}

          {review && (
            <div className="dict-popup__review">
              <span className="dict-review-status" style={{ background: STATUS_COLOR[review.status] }}>{review.status}</span>
              {review.streak > 0 && <span className="dict-review-streak">🔥 {review.streak}</span>}
              {review.interval > 0 && <span className="dict-review-interval">∿ {review.interval}d</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DictionaryView() {
  const [words, setWords] = useState<DictionaryWord[]>([])
  const [query, setQuery] = useState('')
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent')
  const [kanaFilter, setKanaFilter] = useState<string | null>(null)
  const [showFreqPanel, setShowFreqPanel] = useState(false)
  const [frequencySources, setFrequencySources] = useState<Array<{ id: number; name: string }>>([])
  const [freqSource, setFreqSource] = useState<string | null>(null)
  const [freqMin, setFreqMin] = useState<number | null>(null)
  const [freqMax, setFreqMax] = useState<number | null>(null)
  const [reviewMap, setReviewMap] = useState<Map<string, WordReview>>(new Map())
  const [statusFilter, setStatusFilter] = useState<WordReview['status'] | null>(null)
  const [selectedWord, setSelectedWord] = useState<DictionaryWord | null>(null)

  useEffect(() => {
    const url = useProxy('/api/dictionary/frequency-sources')
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(setFrequencySources)
      .catch(() => {})
  }, [])


  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const results = query ? await searchWords(query) : await getAllWords()
      const currentReviews = await getAllReviews()
      const currentMap = new Map(currentReviews.map(r => [r.baseForm, r]))
      setReviewMap(currentMap)
      const filtered = results.filter(w =>
        (query || !kanaFilter || matchesKanaRow(w, kanaFilter)) &&
        matchesFrequency(w, freqSource, freqMin, freqMax) &&
        (!statusFilter || currentMap.get(w.baseForm)?.status === statusFilter)
      )
      const sorted = [...filtered].sort((a, b) =>
        sortBy === 'recent'
          ? b.lastMinedAt - a.lastMinedAt
          : (a.reading || a.surface).localeCompare(b.reading || b.surface, 'ja')
      )
      setWords(sorted)
      setCount(await getWordCount())
    } finally {
      setIsLoading(false)
    }
  }, [query, sortBy, kanaFilter, freqSource, freqMin, freqMax, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleClear = async () => {
    if (!confirm('Clear all words from your local dictionary?')) return
    await clearDictionary()
    setWords([])
    setCount(0)
  }

  const freqFilterActive = freqSource !== null

  return (
    <div className="dictionary-view">
      <div className="dictionary-toolbar">
        <div className="dictionary-toolbar-left">
          <button className="dict-icon-btn" onClick={() => setSearchOpen(true)} title="Search">
            <SearchIcon sx={{ fontSize: '20px' }} />
          </button>
          <span className="dict-count">{count} words</span>
          <div className="dict-status-filter">
            {(['new', 'learning', 'reviewing', 'known'] as const).map(s => (
              <button
                key={s}
                className={`dict-status-btn dict-status-btn--${s}${statusFilter === s ? ' dict-status-btn--active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="dictionary-toolbar-right">
          <button
            className={`dict-icon-btn${freqFilterActive ? ' dict-icon-btn--active' : ''}`}
            onClick={() => setShowFreqPanel(v => !v)}
            title="Frequency filter"
          >
            <TuneIcon sx={{ fontSize: '20px' }} />
          </button>
          <select
            className="dict-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'alpha')}
          >
            <option value="recent">Recent</option>
            <option value="alpha">あ → ん</option>
          </select>
          <button className="dict-icon-btn dict-clear-btn" onClick={handleClear} title="Clear dictionary">
            <DeleteIcon sx={{ fontSize: '20px' }} />
          </button>
        </div>
      </div>

      {showFreqPanel && (
        <div className="freq-filter-panel">
          <div className="freq-filter-row">
            <label className="freq-label">Source</label>
            <select
              className="dict-sort-select"
              value={freqSource || ''}
              onChange={e => { setFreqSource(e.target.value || null); if (!e.target.value) { setFreqMin(null); setFreqMax(null) } }}
            >
              <option value="">No filter</option>
              {frequencySources.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          {freqSource && (
            <div className="freq-filter-row">
              <label className="freq-label">Rank</label>
              <input
                className="freq-rank-input"
                type="number"
                min={1}
                placeholder="min"
                value={freqMin ?? ''}
                onChange={e => setFreqMin(e.target.value ? Number(e.target.value) : null)}
              />
              <span className="freq-sep">–</span>
              <input
                className="freq-rank-input"
                type="number"
                min={1}
                placeholder="max"
                value={freqMax ?? ''}
                onChange={e => setFreqMax(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          )}
        </div>
      )}

      {searchOpen && (
        <>
          <div className="search-overlay" onClick={() => setSearchOpen(false)} />
          <div className="search-modal">
            <div className="search-modal-header">
              <button className="search-modal-close" onClick={() => setSearchOpen(false)}>
                <CloseIcon sx={{ fontSize: '24px' }} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search surface, reading, base form..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-modal-input"
              autoFocus
            />
          </div>
        </>
      )}

      <div className="kana-filter-bar">
        <button
          className={`kana-btn${kanaFilter === null ? ' kana-btn--active' : ''}`}
          onClick={() => setKanaFilter(null)}
        >全</button>
        {KANA_ROWS.map(row => (
          <button
            key={row.label}
            className={`kana-btn${kanaFilter === row.label ? ' kana-btn--active' : ''}`}
            onClick={() => setKanaFilter(kanaFilter === row.label ? null : row.label)}
          >{row.label}</button>
        ))}
      </div>

      <div className="dictionary-list">
        {isLoading && <div className="dict-loading">Loading...</div>}

        {!isLoading && words.length === 0 && (
          <div className="dict-empty">
            {query ? 'No matches.' : 'No words yet — mine a book and send words to Anki to build your dictionary.'}
          </div>
        )}

        {words.map((word) => (
          <div key={word.baseForm} className="dict-word-row" onClick={() => setSelectedWord(word)} style={{ cursor: 'pointer' }}>
            <div className="dict-word-main">
              <span className="dict-surface">{word.surface}</span>
              {word.reading && word.reading !== word.surface && (
                <span className="dict-reading">【{word.reading}】</span>
              )}
            </div>
            <div className="dict-definition">
              {word.definitionEntries?.[0] ? (
                <>
                  <span className="dict-def-source">{word.definitionEntries[0].dictionaryName}</span>
                  <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(word.definitionEntries[0].definition) }} />
                </>
              ) : <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(word.definitions[0] ?? '') }} />}
            </div>
            <div className="dict-meta">
              {word.bookIds.length} {word.bookIds.length === 1 ? 'book' : 'books'}
              {word.frequencies.length > 0 && (
                <span className="dict-freq"> · {word.frequencies[0].sourceName}: #{word.frequencies[0].frequency}</span>
              )}
            </div>
            {reviewMap.has(word.baseForm) && (
              <ReviewRow review={reviewMap.get(word.baseForm)!} />
            )}
          </div>
        ))}
      </div>

      {selectedWord && (
        <DictWordPopup
          word={selectedWord}
          review={reviewMap.get(selectedWord.baseForm)}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  )
}
