import { useEffect, useState, useRef } from 'react'
import { EpubReader, type EpubReaderHandle } from './EpubReader'
import { ReaderUI } from './ReaderUI'
import './reader.css'

export function ReaderPage() {
  const [file, setFile] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(18)
  const [currentCharPos, setCurrentCharPos] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const readerRef = useRef<EpubReaderHandle>(null)

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
        />
      </div>
      <ReaderUI
        currentCharPos={currentCharPos}
        totalChars={totalChars}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
      />
    </div>
  )
}
