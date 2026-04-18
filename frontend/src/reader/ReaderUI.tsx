import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import TextRotationDownIcon from '@mui/icons-material/TextRotationDown'
import TextRotationNoneIcon from '@mui/icons-material/TextRotationNone'
import FormatPaintIcon from '@mui/icons-material/FormatPaint'

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
  const bookmarkPercent = bookmarkPos !== null
    ? Math.abs(Math.round(-1 * (bookmarkPos / (totalChars || 1)) * 100))
    : 0

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
            title={`Jump to bookmark (${bookmarkPercent}% • ${bookmarkPos?.toLocaleString()} chars)`}
            aria-label="Jump to bookmark"
          >
            <BookmarkIcon fontSize="small" />
            <span className="btn-label">{bookmarkPercent}%</span>
          </button>
        )}
        <button
          className="font-size-btn"
          onClick={onJumpToBeginning}
          title="Jump to beginning"
          aria-label="Jump to beginning"
        >
          <KeyboardDoubleArrowUpIcon fontSize="small" />
        </button>
        <button
          className="font-size-btn"
          onClick={onSaveBookmark}
          title="Save bookmark"
          aria-label="Save bookmark"
        >
          <BookmarkBorderIcon fontSize="small" />
        </button>
        <button
          className="font-size-btn"
          onClick={onToggleFavorite}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorited ? (
            <FavoriteIcon fontSize="small" sx={{ color: '#e91e63' }} />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}
        </button>
        <button
          className="font-size-btn"
          onClick={onToggleOrientation}
          title={isVertical ? 'Switch to horizontal (横書き)' : 'Switch to vertical (縦書き)'}
          aria-label={isVertical ? 'Switch to horizontal' : 'Switch to vertical'}
        >
          {isVertical ? (
            <TextRotationNoneIcon fontSize="small" />
          ) : (
            <TextRotationDownIcon fontSize="small" />
          )}
        </button>
        <button
          className="font-size-btn"
          onClick={onOpenCSSModal}
          title="Customize styles"
          aria-label="Customize styles"
        >
          <FormatPaintIcon fontSize="small" />
        </button>
      </div>
    </div>
  )
}
