import { useState, useEffect } from 'react'
import { MinedWord } from '../../services/ankiService'
import { ankiQueue } from '../../services/ankiQueueService'
import './style.scss'

interface WordMinerPanelProps {
  words: MinedWord[]
  onClose: () => void
  bookId: string
}

export function WordMinerPanel({ words, onClose, bookId }: WordMinerPanelProps) {
  const [filterJlpt, setFilterJlpt] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'frequency' | 'jlpt'>('frequency')
  const [minedCount, setMinedCount] = useState(0)

  useEffect(() => {
    setMinedCount(ankiQueue.getMinedCount(bookId))
    const interval = setInterval(() => {
      setMinedCount(ankiQueue.getMinedCount(bookId))
    }, 1000)
    return () => clearInterval(interval)
  }, [bookId])

  const filteredWords = words.filter(
    (w) => !filterJlpt || w.jlptLevel === filterJlpt
  )

  const sortedWords = [...filteredWords].sort((a, b) => {
    if (sortBy === 'frequency') return b.frequency - a.frequency
    return (a.jlptLevel || 'Z').localeCompare(b.jlptLevel || 'Z')
  })

  return (
    <div className="word-miner-panel">
      <div className="panel-header">
        <h2>Word Miner</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="controls">
        <div className="filter-group">
          <label>Filter JLPT:</label>
          <select value={filterJlpt || ''} onChange={(e) => setFilterJlpt(e.target.value || null)}>
            <option value="">All</option>
            <option value="N1">N1</option>
            <option value="N2">N2</option>
            <option value="N3">N3</option>
            <option value="N4">N4</option>
            <option value="N5">N5</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'frequency' | 'jlpt')}>
            <option value="frequency">Frequency</option>
            <option value="jlpt">JLPT Level</option>
          </select>
        </div>
      </div>

      <div className="word-count">
        {sortedWords.length} found
        <span className="mined-indicator">✓ {minedCount} queued</span>
      </div>

      <div className="word-list">
        {sortedWords.map((word) => (
          <div key={word.baseForm} className="word-item">
            <div className="word-content">
              <div className="word-header">
                <strong>{word.surface}</strong>
                {word.reading && <span className="reading">({word.reading})</span>}
                {word.jlptLevel && <span className={`jlpt jlpt-${word.jlptLevel}`}>{word.jlptLevel}</span>}
              </div>
              <div className="word-definition">{word.definitions[0]}</div>
              <div className="word-meta">Freq: {word.frequency}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
