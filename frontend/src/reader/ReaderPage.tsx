import { useEffect, useState, useRef, useCallback } from 'react'
import { EpubReader, type EpubReaderHandle } from './EpubReader'
import { ReaderUI } from './ReaderUI'
import { SettingsModal } from './SettingsModal'
import { WordMinerPanel } from './WordMinerPanel/WordMinerPanel'
import { DefinitionPopup } from './DefinitionPopup'
import { useCustomCSS } from './useCustomCSS'
import { useWordMiner } from './useWordMiner'
import { useLibrary } from '../hooks/useLibrary'
import { useProxy } from '../hooks/useProxy'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { MinedWord } from '../services/ankiService'
import { ankiQueue } from '../services/ankiQueueService'
import { getWordsByBookId, DictionaryWord } from '../services/dictionaryStore'
import { SelectionDefinitionState } from './useSelectionDefinition'
import { AnnotationsPanel } from './AnnotationsPanel'
import { useAnnotations } from '../hooks/useAnnotations'
import { useAnnotationSettings } from '../hooks/useAnnotationSettings'
import { useInlineAnnotations, injectInlineAnnotation, injectAllInlineAnnotations, InlineAnnotationEditRequest } from '../hooks/useInlineAnnotations'
import { InlineAnnotationInput } from './InlineAnnotationInput'
import './reader.css'

function dictWordToMined(w: DictionaryWord, bookId: string): MinedWord {
  return {
    surface: w.surface,
    reading: w.reading,
    baseForm: w.baseForm,
    frequency: w.frequencies[0]?.frequency ?? 0,
    definitions: w.definitions,
    definitionEntries: w.definitionEntries ?? [],
    frequencies: w.frequencies,
    addedToAnki: false,
    bookId,
    minedAt: w.minedAt,
  }
}

export function ReaderPage() {
  const [file, setFile] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(true)
  const [miningNotification, setMiningNotification] = useState<string | null>(null)
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
  const [frequencyTagFilter, setFrequencyTagFilter] = useLocalStorage<string | null>('yomitori-frequency-tag', null)
  const [primaryDictName, setPrimaryDictName] = useLocalStorage<string | null>('yomitori-primary-dict', null)
  const { mineWords, cancelMining } = useWordMiner({
    contentRef,
    bookId: bookId || '',
    bookTitle,
    onMiningWord: setCurrentMiningWord,
    frequencySource,
    minFrequencyRank,
    maxFrequencyRank,
    frequencyTagFilter,
    primaryDictName,
  })
  const [minedWords, setMinedWords] = useState<MinedWord[]>([])
  const [showWordMiner, setShowWordMiner] = useState(false)
  const [isMining, setIsMining] = useState(false)
  const [frequencySources, setFrequencySources] = useState<Array<{ id: number; name: string; isNumeric: boolean }>>([])
  const [definitionDicts, setDefinitionDicts] = useState<Array<{ id: string; name: string }>>([])
  const [selectionDef, setSelectionDef] = useState<SelectionDefinitionState | null>(null)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [pendingInlineAnnotation, setPendingInlineAnnotation] = useState<{ rawText: string; rect: SelectionDefinitionState['rect']; editId?: string; initialText?: string } | null>(null)
  const pendingAnnotationBody = useRef<string | null>(null)
  const epubContentRef = useRef<HTMLElement | null>(null)
  const { settings: annotationSettings, updateSettings } = useAnnotationSettings()
  const { annotations: inlineAnnotations, createAnnotation: createInlineAnnotation, editAnnotation: editInlineAnnotation, removeAnnotation: removeInlineAnnotation } = useInlineAnnotations(bookId)
  const {
    annotations,
    dirtyCount,
    syncing: annotationsSyncing,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    saveToBackend: saveAnnotations,
  } = useAnnotations(bookId)

  const handleDefinition = useCallback((state: SelectionDefinitionState | null) => {
    setSelectionDef(state)
  }, [])

  const dismissDefinition = useCallback(() => setSelectionDef(null), [])

  const handleInlineAnnotationDismiss = useCallback((id: string) => {
    removeInlineAnnotation(id)
  }, [removeInlineAnnotation])

  const handleInlineAnnotationEdit = useCallback((req: InlineAnnotationEditRequest) => {
    setPendingInlineAnnotation({ rawText: '', rect: req.rect, editId: req.id, initialText: req.currentText })
  }, [])

  const handleContentLoaded = useCallback((el: HTMLElement) => {
    epubContentRef.current = el
    injectAllInlineAnnotations(el, inlineAnnotations, handleInlineAnnotationDismiss, handleInlineAnnotationEdit)
  }, [inlineAnnotations, handleInlineAnnotationDismiss, handleInlineAnnotationEdit])

  const handleInlineAnnotate = useCallback((rawText: string) => {
    if (!selectionDef) return
    setPendingInlineAnnotation({ rawText, rect: selectionDef.rect })
    setSelectionDef(null)
  }, [selectionDef])

  const handleInlineAnnotateSave = useCallback(async (noteText: string) => {
    if (!pendingInlineAnnotation) return
    try {
      if (pendingInlineAnnotation.editId) {
        await editInlineAnnotation(pendingInlineAnnotation.editId, noteText)
        const labelEl = epubContentRef.current?.querySelector(`[data-annotation-id="${pendingInlineAnnotation.editId}"] .epub-inline-annotation__text`)
        if (labelEl) labelEl.textContent = noteText
      } else {
        const ann = await createInlineAnnotation(pendingInlineAnnotation.rawText, noteText, currentCharPos)
        if (epubContentRef.current) {
          injectInlineAnnotation(epubContentRef.current, ann, handleInlineAnnotationDismiss, handleInlineAnnotationEdit)
        }
      }
    } catch (err) {
      console.error('Failed to save inline annotation:', err)
    }
    setPendingInlineAnnotation(null)
  }, [pendingInlineAnnotation, createInlineAnnotation, editInlineAnnotation, currentCharPos, handleInlineAnnotationDismiss, handleInlineAnnotationEdit])

  useEffect(() => {
    const fetchFrequencySources = async () => {
      try {
        const url = useProxy('/api/dictionary/frequency-sources')
        const response = await fetch(url)
        if (response.ok) setFrequencySources(await response.json())
      } catch (err) {
        console.error('Error fetching frequency sources:', err)
      }
    }
    const fetchDefinitionDicts = async () => {
      try {
        const url = useProxy('/api/dictionary/imports')
        const response = await fetch(url)
        if (response.ok) setDefinitionDicts(await response.json())
      } catch (err) {
        console.error('Error fetching dictionary imports:', err)
      }
    }
    fetchFrequencySources()
    fetchDefinitionDicts()
  }, [])

  useEffect(() => {
    if (!bookId) return
    getWordsByBookId(bookId).then(words => {
      if (words.length > 0) setMinedWords(words.map(w => dictWordToMined(w, bookId)))
    }).catch(() => {})
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

  const handleJumpToAnnotation = useCallback((charPos: number) => {
    if (readerRef.current) {
      readerRef.current.scrollToCharPos(charPos)
    }
    if (contentRef.current) {
      contentRef.current.classList.add('reader-content--pulse')
      setTimeout(() => contentRef.current?.classList.remove('reader-content--pulse'), 600)
    }
  }, [])

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
      if (words.length > 0) {
        setMiningNotification(`Mining done — ${words.length} words found`)
        setTimeout(() => setMiningNotification(null), 4000)
      }
    } catch (err) {
      console.error('Mining failed:', err)
      setMiningNotification('Mining failed')
      setTimeout(() => setMiningNotification(null), 4000)
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
      {miningNotification && (
        <div className="mining-notification">{miningNotification}</div>
      )}
      <div className="reader-container">
        <div className="reader-main">
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
              onDefinition={handleDefinition}
              onContentLoaded={handleContentLoaded}
            />
          </div>
          {showAnnotations && bookId && (
            <AnnotationsPanel
              annotations={annotations}
              dirtyCount={dirtyCount}
              syncing={annotationsSyncing}
              totalChars={totalChars}
              currentCharPos={currentCharPos}
              settings={annotationSettings}
              initialBody={pendingAnnotationBody.current ?? undefined}
              onInitialBodyConsumed={() => { pendingAnnotationBody.current = null }}
              onClose={() => setShowAnnotations(false)}
              onCreate={createAnnotation}
              onUpdate={updateAnnotation}
              onDelete={deleteAnnotation}
              onSave={saveAnnotations}
              onJumpTo={handleJumpToAnnotation}
              bookTitle={bookTitle}
            />
          )}
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
        showAnnotations={showAnnotations}
        annotationCount={annotations.length}
        onToggleAnnotations={() => setShowAnnotations(prev => !prev)}
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
        frequencyTagFilter={frequencyTagFilter}
        onFrequencyTagFilterChange={setFrequencyTagFilter}
        frequencySources={frequencySources}
        definitionDicts={definitionDicts}
        primaryDictName={primaryDictName}
        onPrimaryDictNameChange={setPrimaryDictName}
        annotationSettings={annotationSettings}
        onAnnotationSettingsChange={updateSettings}
      />
      {showWordMiner && bookId && (
        <WordMinerPanel
          words={minedWords}
          onClose={() => setShowWordMiner(false)}
          bookId={bookId}
        />
      )}
      {selectionDef && (
        <DefinitionPopup
          entries={selectionDef.entries}
          rect={selectionDef.rect}
          rawText={selectionDef.rawText}
          isVertical={isVertical}
          bookId={bookId}
          onDismiss={dismissDefinition}
          onAnnotate={(selectedText) => {
            pendingAnnotationBody.current = selectedText
            setShowAnnotations(true)
          }}
          onInlineAnnotate={handleInlineAnnotate}
        />
      )}
      {pendingInlineAnnotation && (
        <InlineAnnotationInput
          rect={pendingInlineAnnotation.rect}
          rawText={pendingInlineAnnotation.editId ? '(edit)' : pendingInlineAnnotation.rawText}
          isVertical={isVertical}
          initialText={pendingInlineAnnotation.initialText}
          onSave={handleInlineAnnotateSave}
          onCancel={() => setPendingInlineAnnotation(null)}
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
