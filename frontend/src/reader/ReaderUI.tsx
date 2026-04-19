import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import ClearIcon from '@mui/icons-material/Clear'
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import TextRotationDownIcon from '@mui/icons-material/TextRotationDown'
import TextRotationNoneIcon from '@mui/icons-material/TextRotationNone'
import FormatPaintIcon from '@mui/icons-material/FormatPaint'
import HomeIcon from '@mui/icons-material/Home'
import SchoolIcon from '@mui/icons-material/School'
import StopIcon from '@mui/icons-material/Stop'

interface ReaderUIProps {
  currentCharPos: number
  totalChars: number
  isVertical: boolean
  bookmarkPos: number | null
  onToggleOrientation: () => void
  onOpenCSSModal: () => void
  onSaveBookmark: () => void
  onRemoveBookmark: () => void
  onJumpToBookmark: () => void
  onJumpToBeginning: () => void
  onToggleFavorite: () => void
  onGoBack: () => void
  onMineWords?: () => void
  isMining?: boolean
  minedWordCount?: number
  currentMiningWord?: string | null
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
  onRemoveBookmark,
  onJumpToBookmark,
  onJumpToBeginning,
  onToggleFavorite,
  onGoBack,
  onMineWords,
  isMining = false,
  minedWordCount = 0,
  currentMiningWord = null,
  isFavorited,
  hasBookmark,
}: ReaderUIProps) {
  const bookmarkPercent = bookmarkPos !== null
    ? Math.abs(Math.round(-1 * (bookmarkPos / (totalChars || 1)) * 100))
    : 0

  return (
    <div className="reader-ui">
      <div className="progress-section">
        <div className="progress-text">
          {isVertical
            ? Math.max(0, currentCharPos * -1).toLocaleString()
            : Math.max(0, currentCharPos).toLocaleString()
          } / {totalChars.toLocaleString()}
        </div>
        {currentMiningWord && isMining && (
          <div className="mining-status">Mining: {currentMiningWord}</div>
        )}
      </div>

      <div className="font-size-section">
        <button
          className="font-size-btn"
          onClick={onGoBack}
          title="Go back to home"
          aria-label="Go back to home"
        >
          <HomeIcon fontSize="small" />
        </button>
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
        {hasBookmark && (
          <button
            className="font-size-btn"
            onClick={onRemoveBookmark}
            title="Remove bookmark"
            aria-label="Remove bookmark"
          >
            <ClearIcon fontSize="small" />
          </button>
        )}
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
        <button
          className={`font-size-btn word-miner-btn${isMining ? ' word-miner-btn--active' : ''}`}
          onClick={onMineWords}
          title={isMining ? 'Stop mining (clears queue)' : 'Mine vocabulary from this book'}
          aria-label={isMining ? 'Stop mining' : 'Mine vocabulary'}
        >
          {isMining ? <StopIcon fontSize="small" /> : <SchoolIcon fontSize="small" />}
          {minedWordCount > 0 && <span className="btn-label">{minedWordCount}</span>}
        </button>
      </div>
    </div>
  )
}
