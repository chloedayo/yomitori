import { useState, useRef, useEffect } from 'react';
import { Book } from '../types/book';
import { useLibrary } from '../hooks/useLibrary';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

interface BookListRowProps {
  book: Book;
  onRead?: (bookId: string) => void;
}

export function BookListRow({ book, onRead }: BookListRowProps) {
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { isFavorite, toggleFavorite, getBookProgress } = useLibrary();

  const bookProgress = getBookProgress(book.id);
  const progressPercent = bookProgress && bookProgress.totalChars && bookProgress.totalChars > 0
    ? Math.min(100, (Math.abs(bookProgress.progress) / bookProgress.totalChars) * 100)
    : 0;

  const handleRead = () => {
    if (onRead) {
      onRead(book.id);
    } else {
      window.open(`/reader.html?id=${book.id}`, '_blank');
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(book.id);
  };

  const handleTitleMouseEnter = () => {
    if (titleButtonRef.current) {
      const rect = titleButtonRef.current.getBoundingClientRect();
      const previewHeight = 400;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top: number;
      if (spaceBelow >= previewHeight) {
        // Show below
        top = rect.bottom;
      } else if (spaceAbove >= previewHeight) {
        // Show above - position so preview sits on top of button
        top = rect.top - previewHeight;
      } else {
        // Default to below
        top = rect.bottom;
      }

      setPreviewPos({
        top,
        left: rect.left,
      });
    }
    setHoveredBookId(book.id);
  };

  // Adjust position after preview is rendered to account for actual height
  useEffect(() => {
    if (previewRef.current && titleButtonRef.current && hoveredBookId === book.id) {
      const buttonRect = titleButtonRef.current.getBoundingClientRect();
      const actualHeight = previewRef.current.offsetHeight;
      const spaceAbove = buttonRect.top;

      let top: number;
      if (spaceAbove >= actualHeight) {
        // Show above
        top = buttonRect.top - actualHeight;
      } else {
        // Show below
        top = buttonRect.bottom;
      }

      setPreviewPos({
        top,
        left: buttonRect.left,
      });
    }
  }, [hoveredBookId, book.id]);

  const handleTitleMouseLeave = () => {
    setHoveredBookId(null);
    setPreviewPos(null);
  };

  return (
    <div key={book.id} style={styles.row}>
      <div
        style={{
          ...styles.progressPie,
          background: `conic-gradient(#d0d0d0 0deg ${progressPercent * 3.6}deg, #2d2d2d ${progressPercent * 3.6}deg)`,
        }}
        title={bookProgress ? `${Math.round(progressPercent)}% read` : 'Not started'}
      />
      <div style={styles.titleSection}>
        <button
          ref={titleButtonRef}
          onClick={handleRead}
          style={{
            ...styles.title,
            ...(hoveredBookId === book.id ? styles.titleHover : {}),
          }}
          onMouseEnter={handleTitleMouseEnter}
          onMouseLeave={handleTitleMouseLeave}
        >
          {book.title}
        </button>
        {book.coverPath && hoveredBookId === book.id && previewPos && (
          <div
            ref={previewRef}
            style={{
              ...styles.coverPreview,
              top: previewPos.top,
              left: previewPos.left,
            }}
          >
            <img
              src={`/api/books/cover-file/${book.id}`}
              alt={book.title}
              style={styles.coverImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
            <div style={styles.coverPlaceholder}>
              <span>No cover available</span>
            </div>
            <div style={styles.coverTitle}>
              <div style={{ marginBottom: '6px' }}>{book.title}</div>
              <div style={{ fontSize: '11px', color: '#808080' }}>{book.fileFormat}</div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.actionsSection}>
        <button
          onClick={handleRead}
          style={styles.readButton}
          title="Read book"
        >
          <MenuBookIcon sx={{ color: '#ffffff', fontSize: '20px', marginRight: '8px' }} />
          Read
        </button>

        <button
          onClick={handleToggleFavorite}
          style={styles.favButton}
          title={isFavorite(book.id) ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite(book.id) ? (
            <FavoriteIcon sx={{ color: '#e91e63', fontSize: '28px' }} />
          ) : (
            <FavoriteBorderIcon sx={{ color: '#ffffff', fontSize: '28px' }} />
          )}
        </button>
      </div>
    </div>
  );
}

const styles = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #2d2d2d',
    gap: '1rem',
  },
  progressPie: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background 0.3s ease',
  },
  titleSection: {
    flex: 1,
    minWidth: 0,
    position: 'relative' as const,
  },
  title: {
    color: '#e8e8e8',
    fontSize: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    transition: 'color 0.2s',
  },
  titleHover: {
    color: '#5a9fd4',
  },
  coverPreview: {
    position: 'fixed' as const,
    zIndex: 1000,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    overflow: 'hidden',
    width: '220px',
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
  },
  coverImage: {
    width: '220px',
    height: '280px',
    objectFit: 'cover' as const,
    display: 'block',
  },
  coverPlaceholder: {
    width: '220px',
    height: '280px',
    background: 'rgba(45, 45, 45, 0.9)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    textAlign: 'center' as const,
    color: '#808080',
    fontSize: '13px',
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
  coverTitle: {
    padding: '16px',
    background: '#1a1a1a',
    color: '#e8e8e8',
    fontSize: '15px',
    fontWeight: 500,
    borderTop: '1px solid #2d2d2d',
    maxHeight: '100px',
    overflow: 'hidden' as const,
    wordWrap: 'break-word' as const,
  },
  actionsSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexShrink: 0,
  },
  readButton: {
    background: '#2d2d2d',
    border: '1px solid #404040',
    cursor: 'pointer',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    color: '#e8e8e8',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  favButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
