interface ReaderUIProps {
  currentCharPos: number
  totalChars: number
  isVertical: boolean
  bookmarkPos: number | null
  onToggleOrientation: () => void
  onOpenCSSModal: () => void
  onSaveBookmark: () => void
  onJumpToBookmark: () => void
  onJumpToBeginning: () => void
  onToggleFavorite: () => void
  isFavorited: boolean
  hasBookmark: boolean
}

export function ReaderUI({
  currentCharPos,
  totalChars,
  isVertical,
  bookmarkPos,
  onToggleOrientation,
  onOpenCSSModal,
  onSaveBookmark,
  onJumpToBookmark,
  onJumpToBeginning,
  onToggleFavorite,
  isFavorited,
  hasBookmark,
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
        {hasBookmark && (
          <button
            className="font-size-btn"
            onClick={onJumpToBookmark}
            title={bookmarkPos !== null ? `Jump to bookmark (${Math.abs(Math.round((isVertical ? -1 : 1) * (bookmarkPos / (totalChars || 1)) * 100))}% • ${bookmarkPos.toLocaleString()} chars)` : 'Jump to bookmark'}
            style={{ minWidth: '80px' }}
          >
            📍 {bookmarkPos !== null && `${Math.abs(Math.round((isVertical ? -1 : 1) * (bookmarkPos / (totalChars || 1)) * 100))}%`}
          </button>
        )}
        <button
          className="font-size-btn"
          onClick={onJumpToBeginning}
          title="Jump to beginning"
          style={{ minWidth: '40px' }}
        >
          ⬆️
        </button>
        <button
          className="font-size-btn"
          onClick={onSaveBookmark}
          title="Save current position as bookmark"
          style={{ minWidth: '40px' }}
        >
          🔖
        </button>
        <button
          className="font-size-btn"
          onClick={onToggleFavorite}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          style={{ minWidth: '40px' }}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>
        <button
          className="font-size-btn"
          onClick={onToggleOrientation}
          title={isVertical ? 'Switch to horizontal' : 'Switch to vertical'}
          style={{ minWidth: '40px' }}
        >
          {isVertical ? 'switch to horizontal (横書き)' : 'Switch to vertical (縦書き)'}
        </button>
        <button
          className="font-size-btn"
          onClick={onOpenCSSModal}
          title="Customize reader styles"
          style={{ minWidth: '40px' }}
        >
          Custom CSS
        </button>
      </div>
    </div>
  )
}
