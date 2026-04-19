import { useEffect, useState, useRef } from 'react'
import { EpubReader, type EpubReaderHandle } from './EpubReader'
import { ReaderUI } from './ReaderUI'
import { SettingsModal } from './SettingsModal'
import { WordMinerPanel } from './WordMinerPanel/WordMinerPanel'
import { useCustomCSS } from './useCustomCSS'
import { useWordMiner } from './useWordMiner'
import { useLibrary } from '../hooks/useLibrary'
import { useProxy } from '../hooks/useProxy'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { MinedWord } from '../services/ankiService'
import { ankiQueue } from '../services/ankiQueueService'
import './reader.css'

export function ReaderPage() {
  const [file, setFile] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentCharPos, setCurrentCharPos] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const fontSize = 18
  const [isVertical, setIsVertical] = useState(() => {
    const stored = localStorage.getItem('yomitori-text-orientation')
    return stored !== 'horizontal'
  })
  const contentRef = useRef<HTMLDivElement>(null)
  const readerRef = useRef<EpubReaderHandle>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [bookTitle, setBookTitle] = useState<string | null>(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [bookmarkPos, setBookmarkPos] = useState<number | null>(null)
  const { css, error: cssError, scopeCSS, handleSaveCSS, handleReset } = useCustomCSS()
  const { getBookmark, saveBookmark, clearBookmark, toggleFavorite, isFavorite } = useLibrary()
  const [currentMiningWord, setCurrentMiningWord] = useState<string | null>(null)
  const [frequencySource, setFrequencySource] = useLocalStorage<string | null>('yomitori-frequency-source', null)
  const [minFrequencyRank, setMinFrequencyRank] = useLocalStorage<number | null>('yomitori-frequency-min', null)
  const [maxFrequencyRank, setMaxFrequencyRank] = useLocalStorage<number | null>('yomitori-frequency-max', null)
  const { mineWords, cancelMining } = useWordMiner({
    contentRef,
    bookId: bookId || '',
    onMiningWord: setCurrentMiningWord,
    frequencySource,
    minFrequencyRank,
    maxFrequencyRank,
  })
  const [minedWords, setMinedWords] = useState<MinedWord[]>([])
  const [showWordMiner, setShowWordMiner] = useState(false)
  const [isMining, setIsMining] = useState(false)
  const [frequencySources, setFrequencySources] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    const fetchFrequencySources = async () => {
      try {
        const url = useProxy('/api/dictionary/frequency-sources')
        const response = await fetch(url)
        if (response.ok) {
          const sources = await response.json()
          setFrequencySources(sources)
        }
      } catch (err) {
        console.error('Error fetching frequency sources:', err)
      }
    }
    fetchFrequencySources()
  }, [])

  useEffect(() => {
    if (!bookId) return
    const stored = localStorage.getItem(`yomitori-mined-words-${bookId}`)
    if (stored) {
      try {
        const words = JSON.parse(stored) as MinedWord[]
        setMinedWords(words)
      } catch {
        // ignore parse errors
      }
    }
  }, [bookId])

  const handleToggleOrientation = () => {
    const newMode = !isVertical
    setIsVertical(newMode)
    localStorage.setItem(
      'yomitori-text-orientation',
      newMode ? 'vertical' : 'horizontal'
    )
  }

  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams(window.location.search)
        const fileParam = params.get('file')

        let id: string

        if (fileParam) {
          throw new Error('File parameter no longer supported—use book ID instead')
        } else if (params.get('id')) {
          id = params.get('id')!
        } else {
          throw new Error('No book ID provided')
        }

        setBookId(id)

        const bookmark = getBookmark(id)
        if (bookmark !== null) {
          setBookmarkPos(bookmark)
          setShowRestorePrompt(true)
        }

        // Fetch book metadata for title
        const metaUrl = useProxy(`/api/books/${id}`)
        const metaResponse = await fetch(metaUrl)
        if (metaResponse.ok) {
          const book = await metaResponse.json()
          setBookTitle(book.title ?? null)
        }

        // Fetch file from API endpoint (CORS-safe via proxy)
        const url = useProxy(`/api/books/${id}/file`)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch book: ${response.status}`)
        }

        const blob = await response.blob()
        setFile(blob)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadBook()
  }, [])

  const handleSaveBookmark = () => {
    if (bookId) {
      saveBookmark(bookId, currentCharPos, totalChars)
      setBookmarkPos(currentCharPos)
    }
  }

  const handleRestoreBookmark = () => {
    if (bookmarkPos !== null && readerRef.current) {
      readerRef.current.scrollToCharPos(bookmarkPos)
      setShowRestorePrompt(false)
    }
  }

  const handleStartFresh = () => {
    if (readerRef.current) {
      readerRef.current.scrollToCharPos(0)
    }
    setShowRestorePrompt(false)
  }

  const handleJumpToBookmark = () => {
    if (bookmarkPos !== null && readerRef.current) {
      readerRef.current.scrollToCharPos(bookmarkPos)
    }
  }

  const handleJumpToBeginning = () => {
    if (readerRef.current) {
      readerRef.current.scrollToCharPos(0)
    }
  }

  const handleRemoveBookmark = () => {
    if (bookId) {
      clearBookmark(bookId)
      setBookmarkPos(null)
    }
  }

  const handleToggleFavorite = () => {
    if (bookId) {
      toggleFavorite(bookId)
    }
  }

  const handleGoBack = () => {
    window.location.href = '/'
  }

  const handleToggleMining = async () => {
    if (isMining) {
      cancelMining()
      ankiQueue.clearQueue()
      setIsMining(false)
      setCurrentMiningWord(null)
      return
    }

    setIsMining(true)
    setCurrentMiningWord(null)
    try {
      const words = await mineWords()
      setMinedWords(words)
      if (bookId) {
        localStorage.setItem(`yomitori-mined-words-${bookId}`, JSON.stringify(words))
      }
    } catch (err) {
      console.error('Mining failed:', err)
    } finally {
      setIsMining(false)
      setCurrentMiningWord(null)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#e0e0e0',
          fontSize: '18px',
        }}
      >
        Loading book...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ff6b6b',
          fontSize: '18px',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        Error: {error}
      </div>
    )
  }

  if (!file) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#e0e0e0',
          fontSize: '18px',
        }}
      >
        No file loaded
      </div>
    )
  }

  return (
    <>
      {showRestorePrompt && (
        <div style={styles.overlay}>
          <div style={styles.prompt}>
            <h3 style={styles.promptTitle}>Resume Reading?</h3>
            <p style={styles.promptText}>You have a bookmark for this book.</p>
            <div style={styles.promptButtons}>
              <button style={styles.btnSecondary} onClick={handleStartFresh}>
                Start Fresh
              </button>
              <button style={styles.btnPrimary} onClick={handleRestoreBookmark}>
                Resume
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="reader-container">
        <div className="reader-content" ref={contentRef}>
        <EpubReader
          ref={readerRef}
          file={file}
          fontSize={fontSize}
          onCharPosChange={setCurrentCharPos}
          onTotalCharsChange={setTotalChars}
          isVertical={isVertical}
          customCSS={css}
          scopeCSS={scopeCSS}
        />
      </div>
      <ReaderUI
        currentCharPos={currentCharPos}
        totalChars={totalChars}
        isVertical={isVertical}
        bookmarkPos={bookmarkPos}
        bookTitle={bookTitle}
        onToggleOrientation={handleToggleOrientation}
        onOpenCSSModal={() => setIsModalOpen(true)}
        onSaveBookmark={handleSaveBookmark}
        onRemoveBookmark={handleRemoveBookmark}
        onJumpToBookmark={handleJumpToBookmark}
        onJumpToBeginning={handleJumpToBeginning}
        onToggleFavorite={handleToggleFavorite}
        onGoBack={handleGoBack}
        onMineWords={handleToggleMining}
        onShowWordMiner={() => setShowWordMiner(true)}
        isMining={isMining}
        minedWordCount={minedWords.length}
        currentMiningWord={currentMiningWord}
        isFavorited={bookId ? isFavorite(bookId) : false}
        hasBookmark={bookmarkPos !== null}
      />
      <SettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentCSS={css}
        onSave={handleSaveCSS}
        onReset={handleReset}
        error={cssError}
        frequencySource={frequencySource}
        onFrequencySourceChange={setFrequencySource}
        minFrequencyRank={minFrequencyRank}
        onMinFrequencyRankChange={setMinFrequencyRank}
        maxFrequencyRank={maxFrequencyRank}
        onMaxFrequencyRankChange={setMaxFrequencyRank}
        frequencySources={frequencySources}
      />
      {showWordMiner && bookId && (
        <WordMinerPanel
          words={minedWords}
          onClose={() => setShowWordMiner(false)}
          bookId={bookId}
        />
      )}
      </div>
    </>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  prompt: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #404040',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  promptTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    color: '#e8e8e8',
  },
  promptText: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#a8a8a8',
  },
  promptButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  btnSecondary: {
    padding: '10px 20px',
    backgroundColor: '#2d2d2d',
    color: '#e8e8e8',
    border: '1px solid #404040',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    flex: 1,
  },
  btnPrimary: {
    padding: '10px 20px',
    backgroundColor: '#5a9fd4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    flex: 1,
  },
}
