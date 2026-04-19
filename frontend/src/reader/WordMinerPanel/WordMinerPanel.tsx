import { useState, useEffect } from 'react'
import { MinedWord } from '../../services/ankiService'
import { ankiQueue } from '../../services/ankiQueueService'
import './style.scss'

interface WordMinerPanelProps {
  words: MinedWord[]
  onClose: () => void
  bookId: string
  frequencySource: string | null
  onFrequencySourceChange: (source: string | null) => void
  minFrequencyRank: number | null
  onMinFrequencyRankChange: (rank: number | null) => void
  maxFrequencyRank: number | null
  onMaxFrequencyRankChange: (rank: number | null) => void
}

export function WordMinerPanel({
  words,
  onClose,
  bookId,
  frequencySource,
  onFrequencySourceChange,
  minFrequencyRank,
  onMinFrequencyRankChange,
  maxFrequencyRank,
  onMaxFrequencyRankChange,
}: WordMinerPanelProps) {
  const [minedCount, setMinedCount] = useState(0)

  useEffect(() => {
    setMinedCount(ankiQueue.getMinedCount(bookId))
    const interval = setInterval(() => {
      setMinedCount(ankiQueue.getMinedCount(bookId))
    }, 1000)
    return () => clearInterval(interval)
  }, [bookId])

  const sortedWords = [...words].sort((a, b) => {
    return b.frequency - a.frequency
  })

  return (
    <div className="word-miner-panel">
      <div className="panel-header">
        <h2>Word Miner</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="controls">
        <div className="filter-group">
          <label>Frequency filtering</label>
          <select value={frequencySource || ''} onChange={(e) => onFrequencySourceChange(e.target.value || null)}>
            <option value="">No filter</option>
            {[...new Set(words.flatMap(w => w.frequencies.map(f => f.sourceName)))].map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
        {frequencySource && (
          <div className="filter-group">
            <label>Frequency range</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="Min"
                value={minFrequencyRank ?? ''}
                onChange={(e) => onMinFrequencyRankChange(e.target.value ? parseInt(e.target.value) : null)}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={maxFrequencyRank ?? ''}
                onChange={(e) => onMaxFrequencyRankChange(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </div>
        )}
        <div className="filter-group">
          <label>Sorted by frequency</label>
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
