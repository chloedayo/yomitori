import { MinedWord } from '../../services/ankiService'
import './style.scss'

interface WordMinerPanelProps {
  words: MinedWord[]
  onClose: () => void
  bookId: string
}

export function WordMinerPanel({
  words,
  onClose,
}: WordMinerPanelProps) {

  const sortedWords = [...words].sort((a, b) => {
    return b.frequency - a.frequency
  })

  return (
    <div className="word-miner-overlay" onClick={onClose}>
    <div className="word-miner-panel" onClick={(e) => e.stopPropagation()}>
      <div className="panel-header">
        <h2>Word Miner</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="controls">
        <div className="filter-group">
          <label>Sorted by frequency</label>
        </div>
      </div>

      <div className="word-count">
        {sortedWords.length} found
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
    </div>
  )
}
