import { useState } from 'react'
import { useHiddenBooks } from '../hooks/useHiddenBooks'
import { Book } from '../types/book'

interface TabsMenuProps {
  allBooks: Book[]
}

export function TabsMenu({ allBooks }: TabsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const { getHidden, toggleHidden } = useHiddenBooks()

  const hiddenBookIds = getHidden()
  const hiddenBooks = allBooks.filter((book) => hiddenBookIds.includes(book.id.toString()))

  const handleUnhide = (bookId: string) => {
    toggleHidden(bookId)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginLeft: 'auto' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          padding: '12px 16px',
          color: '#a8a8a8',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#e8e8e8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#a8a8a8')}
        title="Menu"
      >
        ⋯
      </button>

      {isOpen && !showHidden && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            backgroundColor: '#1a1a1a',
            border: '1px solid #404040',
            borderRadius: '4px',
            minWidth: '160px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => setShowHidden(true)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#e8e8e8',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d2d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Hidden books ({hiddenBooks.length})
          </button>
        </div>
      )}

      {isOpen && showHidden && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            backgroundColor: '#1a1a1a',
            border: '1px solid #404040',
            borderRadius: '4px',
            minWidth: '240px',
            maxHeight: '400px',
            overflowY: 'auto',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => setShowHidden(false)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#2d2d2d',
              border: 'none',
              color: '#a8a8a8',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '12px',
              transition: 'background-color 0.2s',
              fontStyle: 'italic',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3d3d3d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2d2d2d')}
          >
            ← Back
          </button>
          <div style={{ borderBottom: '1px solid #404040' }} />
          {hiddenBooks.length === 0 ? (
            <div style={{ padding: '16px', color: '#a8a8a8', fontSize: '13px', textAlign: 'center' }}>
              No hidden books
            </div>
          ) : (
            hiddenBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => handleUnhide(book.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#e8e8e8',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #2d2d2d',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d2d')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                title={`Click to unhide: ${book.title}`}
              >
                {book.title}
              </button>
            ))
          )}
        </div>
      )}

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
          }}
          onClick={() => {
            setIsOpen(false)
            setShowHidden(false)
          }}
        />
      )}
    </div>
  )
}
