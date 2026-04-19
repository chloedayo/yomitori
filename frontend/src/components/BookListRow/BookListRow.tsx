import { useState, useRef, useEffect, useCallback } from 'react';
import { Book } from '../../types/book';
import { useLibrary } from '../../hooks/useLibrary';
import { useProxy } from '../../hooks/useProxy';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import './style.scss';

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

  const handleRead = useCallback(() => {
    if (onRead) {
      onRead(book.id);
    } else {
      window.open(`/reader.html?id=${book.id}`, '_blank');
    }
  }, [book.id, onRead]);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(book.id);
  }, [book.id, toggleFavorite]);

  const handleTitleMouseEnter = useCallback(() => {
    if (titleButtonRef.current) {
      const rect = titleButtonRef.current.getBoundingClientRect();
      const previewHeight = 400;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top: number;
      if (spaceBelow >= previewHeight) {
        top = rect.bottom;
      } else if (spaceAbove >= previewHeight) {
        top = rect.top - previewHeight;
      } else {
        top = rect.bottom;
      }

      setPreviewPos({
        top,
        left: rect.left,
      });
    }
    setHoveredBookId(book.id);
  }, [book.id]);


  useEffect(() => {
    if (previewRef.current && titleButtonRef.current && hoveredBookId === book.id) {
      const buttonRect = titleButtonRef.current.getBoundingClientRect();
      const actualHeight = previewRef.current.offsetHeight;
      const spaceAbove = buttonRect.top;

      let top: number;
      if (spaceAbove >= actualHeight) {
        top = buttonRect.top - actualHeight;
      } else {
        top = buttonRect.bottom;
      }

      setPreviewPos({
        top,
        left: buttonRect.left,
      });
    }
  }, [hoveredBookId, book.id]);

  const handleTitleMouseLeave = useCallback(() => {
    setHoveredBookId(null);
    setPreviewPos(null);
  }, []);

  return (
    <div className="book-list-row">
      <div
        className="progress-pie"
        style={{
          background: `conic-gradient(#d0d0d0 0deg ${progressPercent * 3.6}deg, #2d2d2d ${progressPercent * 3.6}deg)`,
        }}
        title={bookProgress ? `${Math.round(progressPercent)}% read` : 'Not started'}
      />
      <div className="title-section">
        <button
          ref={titleButtonRef}
          onClick={handleRead}
          className="book-title-button"
          onMouseEnter={handleTitleMouseEnter}
          onMouseLeave={handleTitleMouseLeave}
        >
          {book.title}
        </button>
        {book.coverPath && hoveredBookId === book.id && previewPos && (
          <div
            ref={previewRef}
            className="cover-preview"
            style={{
              top: previewPos.top,
              left: previewPos.left,
            }}
          >
            <div className="cover-format-badge">{book.fileFormat.toUpperCase()}</div>
            <img
              src={useProxy(`/api/books/cover-file/${book.id}`)}
              alt={book.title}
              className="cover-image"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
            <div className="cover-placeholder">
              <span>No cover available</span>
            </div>
            <div className="cover-title">
              <div style={{ marginBottom: '6px' }}>{book.title}</div>
            </div>
          </div>
        )}
      </div>

      <div className="actions-section">
        <button
          onClick={handleRead}
          className="list-row-read-button"
          title="Read book"
        >
          <MenuBookIcon sx={{ color: '#ffffff', fontSize: '20px', marginRight: '8px' }} />
          <span>Read</span>
        </button>

        <button
          onClick={handleToggleFavorite}
          className="fav-button"
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
