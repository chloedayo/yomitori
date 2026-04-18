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
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid #505050',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px 10px',
          color: '#d0d0d0',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '28px',
          width: '32px',
          minWidth: '32px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'
          e.currentTarget.style.borderColor = '#707070'
          e.currentTarget.style.color = '#e8e8e8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.25)'
          e.currentTarget.style.borderColor = '#505050'
          e.currentTarget.style.color = '#d0d0d0'
        }}
        title="Menu"
      >
        ☰
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
