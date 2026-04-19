import { useState, useEffect, useCallback } from 'react'
import { getAllWords, searchWords, getWordCount, clearDictionary, DictionaryWord } from '../../services/dictionaryStore'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import './style.scss'

export function DictionaryView() {
  const [words, setWords] = useState<DictionaryWord[]>([])
  const [query, setQuery] = useState('')
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent')

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const results = query ? await searchWords(query) : await getAllWords()
      const sorted = [...results].sort((a, b) =>
        sortBy === 'recent' ? b.lastMinedAt - a.lastMinedAt : a.surface.localeCompare(b.surface)
      )
      setWords(sorted)
      setCount(await getWordCount())
    } finally {
      setIsLoading(false)
    }
  }, [query, sortBy])

  useEffect(() => {
    load()
  }, [load])

  const handleClear = async () => {
    if (!confirm('Clear all words from your local dictionary?')) return
    await clearDictionary()
    setWords([])
    setCount(0)
  }

  return (
    <div className="dictionary-view">
      <div className="dictionary-toolbar">
        <div className="dictionary-toolbar-left">
          <button className="dict-icon-btn" onClick={() => setSearchOpen(true)} title="Search">
            <SearchIcon sx={{ fontSize: '20px' }} />
          </button>
          <span className="dict-count">{count} words</span>
        </div>
        <div className="dictionary-toolbar-right">
          <select
            className="dict-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'alpha')}
          >
            <option value="recent">Recent</option>
            <option value="alpha">A → Z</option>
          </select>
          <button className="dict-icon-btn dict-clear-btn" onClick={handleClear} title="Clear dictionary">
            <DeleteIcon sx={{ fontSize: '20px' }} />
          </button>
        </div>
      </div>

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

      <div className="dictionary-list">
        {isLoading && <div className="dict-loading">Loading...</div>}

        {!isLoading && words.length === 0 && (
          <div className="dict-empty">
            {query ? 'No matches.' : 'No words yet — mine a book and send words to Anki to build your dictionary.'}
          </div>
        )}

        {words.map((word) => (
          <div key={word.baseForm} className="dict-word-row">
            <div className="dict-word-main">
              <span className="dict-surface">{word.surface}</span>
              {word.reading && word.reading !== word.surface && (
                <span className="dict-reading">【{word.reading}】</span>
              )}
            </div>
            <div className="dict-definition">{word.definitions[0]}</div>
            <div className="dict-meta">
              {word.bookIds.length} {word.bookIds.length === 1 ? 'book' : 'books'}
              {word.frequencies.length > 0 && (
                <span className="dict-freq"> · {word.frequencies[0].sourceName}: #{word.frequencies[0].frequency}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
