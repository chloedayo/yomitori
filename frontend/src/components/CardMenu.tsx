import { useState } from 'react'

interface CardMenuProps {
  onHide: () => void
  isHidden?: boolean
}

export function CardMenu({ onHide, isHidden }: CardMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleHideClick = () => {
    onHide()
    setIsOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          padding: '4px 8px',
          color: '#a8a8a8',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#e8e8e8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#a8a8a8')}
        title="Menu"
      >
        ⋯
      </button>

      {isOpen && (
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
            onClick={handleHideClick}
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
            {isHidden ? 'Unhide book' : 'Hide book'}
          </button>
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
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
