interface ReaderUIProps {
  currentCharPos: number
  totalChars: number
  isVertical: boolean
  onToggleOrientation: () => void
  onOpenCSSModal: () => void
}

export function ReaderUI({
  currentCharPos,
  totalChars,
  isVertical,
  onToggleOrientation,
  onOpenCSSModal,
}: ReaderUIProps) {

  return (
    <div className="reader-ui">
      <div className="progress-text">
        {isVertical
          ? Math.max(0, currentCharPos * -1).toLocaleString()
          : Math.max(0, currentCharPos).toLocaleString()
        } / {totalChars.toLocaleString()}
      </div>

      <div className="font-size-section">
        <button
          className="font-size-btn"
          onClick={onToggleOrientation}
          title={isVertical ? 'Switch to horizontal' : 'Switch to vertical'}
          style={{ minWidth: '40px' }}
        >
          ⇄
        </button>
        <button
          className="font-size-btn"
          onClick={onOpenCSSModal}
          title="Customize reader styles"
          style={{ minWidth: '40px' }}
        >
          ⚙️
        </button>
      </div>
    </div>
  )
}
