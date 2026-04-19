import React, { useState, useEffect } from 'react'
import { MinedWord } from '../../services/ankiService'
import { checkConnection, getDeckNames, addNotes } from '../../services/ankiService'
import './style.scss'

interface WordMinerPanelProps {
  words: MinedWord[]
  onClose: () => void
  bookId: string
}

export function WordMinerPanel({ words, onClose, bookId }: WordMinerPanelProps) {
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [filterJlpt, setFilterJlpt] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'frequency' | 'jlpt'>('frequency')
  const [deckNames, setDeckNames] = useState<string[]>([])
  const [selectedDeck, setSelectedDeck] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [ankiConnected, setAnkiConnected] = useState(false)

  useEffect(() => {
    const checkAnki = async () => {
      const connected = await checkConnection()
      setAnkiConnected(connected)
      if (connected) {
        const decks = await getDeckNames()
        setDeckNames(decks)
        setSelectedDeck(decks[0] || '')
      }
    }
    checkAnki()
  }, [])

  const filteredWords = words.filter(
    (w) => !filterJlpt || w.jlptLevel === filterJlpt
  )

  const sortedWords = [...filteredWords].sort((a, b) => {
    if (sortBy === 'frequency') return b.frequency - a.frequency
    return (a.jlptLevel || 'Z').localeCompare(b.jlptLevel || 'Z')
  })

  const toggleSelect = (baseForm: string) => {
    const newSet = new Set(selectedWords)
    if (newSet.has(baseForm)) newSet.delete(baseForm)
    else newSet.add(baseForm)
    setSelectedWords(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedWords.size === sortedWords.length) {
      setSelectedWords(new Set())
    } else {
      setSelectedWords(new Set(sortedWords.map((w) => w.baseForm)))
    }
  }

  const handleAddToAnki = async () => {
    if (!selectedDeck) {
      setAddError('No deck selected')
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      const toAdd = sortedWords.filter((w) => selectedWords.has(w.baseForm))
      await addNotes(toAdd, selectedDeck)
      setSelectedWords(new Set())
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add to Anki')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="word-miner-panel">
      <div className="panel-header">
        <h2>Word Miner</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {!ankiConnected && (
        <div className="anki-warning">
          ⚠️ AnkiConnect not found. Is Anki running with AnkiConnect add-on?
        </div>
      )}

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

        {ankiConnected && (
          <div className="filter-group">
            <label>Deck:</label>
            <select value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)}>
              {deckNames.map((deck) => (
                <option key={deck} value={deck}>
                  {deck}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="word-count">
        {selectedWords.size} / {sortedWords.length} selected
      </div>

      <button className="select-all-btn" onClick={toggleSelectAll}>
        {selectedWords.size === sortedWords.length ? 'Deselect All' : 'Select All'}
      </button>

      <div className="word-list">
        {sortedWords.map((word) => (
          <div
            key={word.baseForm}
            className="word-item"
            onClick={() => toggleSelect(word.baseForm)}
          >
            <input
              type="checkbox"
              checked={selectedWords.has(word.baseForm)}
              onChange={() => toggleSelect(word.baseForm)}
            />
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

      {addError && <div className="error-message">{addError}</div>}

      <button
        className="add-to-anki-btn"
        onClick={handleAddToAnki}
        disabled={isAdding || !ankiConnected || selectedWords.size === 0}
      >
        {isAdding ? 'Adding...' : `Add ${selectedWords.size} to Anki`}
      </button>
    </div>
  )
}
