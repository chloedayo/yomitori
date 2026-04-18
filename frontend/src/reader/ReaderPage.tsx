import { useEffect, useState, useRef } from 'react'
import { EpubReader, type EpubReaderHandle } from './EpubReader'
import { ReaderUI } from './ReaderUI'
import { CustomCSSModal } from './CustomCSSModal'
import { useCustomCSS } from './useCustomCSS'
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
  const { css, error: cssError, scopeCSS, handleSaveCSS, handleReset } = useCustomCSS()

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

        let bookId: string

        if (fileParam) {
          throw new Error('File parameter no longer supported—use book ID instead')
        } else if (params.get('id')) {
          bookId = params.get('id')!
        } else {
          throw new Error('No book ID provided')
        }

        // Fetch file from API endpoint (CORS-safe via proxy)
        const response = await fetch(`/api/books/${bookId}/file`)
        if (!response.ok) {
          throw new Error(`Failed to fetch book: ${response.status}`)
        }

        const blob = await response.blob()
        console.log('📖 Loading EPUB:', { bookId })

        setFile(blob)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadBook()
  }, [])

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
        onToggleOrientation={handleToggleOrientation}
        onOpenCSSModal={() => setIsModalOpen(true)}
      />
      <CustomCSSModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentCSS={css}
        onSave={handleSaveCSS}
        onReset={handleReset}
        error={cssError}
      />
    </div>
  )
}
