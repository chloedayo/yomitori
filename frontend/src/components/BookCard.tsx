import { Book } from '../types/book';
import { CardMenu } from './CardMenu';
import { useLibrary } from '../hooks/useLibrary';

interface BookCardProps {
  book: Book;
  onFavoritesChange?: () => void;
  onBulkRefresh?: () => Promise<void>;
}

export function BookCard({ book, onFavoritesChange, onBulkRefresh }: BookCardProps) {
  const { isHidden, toggleHidden, isFavorite, toggleFavorite, getBookmark, clearBookmark } = useLibrary();

  const handleRead = () => {
    window.open(`/reader.html?id=${book.id}`, '_blank');
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleFavorite(book.id.toString());
    onFavoritesChange?.();
  };

  return (
    <div className="book-card" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
        <CardMenu
          onHide={async () => {
            toggleHidden(book.id);
            await onBulkRefresh?.();
          }}
          onClearBookmark={async () => {
            clearBookmark(book.id.toString());
            await onBulkRefresh?.();
          }}
          isHidden={isHidden(book.id)}
          hasBookmark={getBookmark(book.id.toString()) !== null}
        />
      </div>
      {book.coverPath && (
        <div className="book-cover">
          <img
            src={`/api/books/cover-file/${book.id}`}
            alt={book.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23eee" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Cover%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
      )}
      {!book.coverPath && (
        <div className="book-cover book-cover-placeholder">
          <div className="placeholder-text">No Cover</div>
        </div>
      )}

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-format">{book.fileFormat.toUpperCase()}</p>
        <div style={styles.buttonGroup}>
          <button
            onClick={handleToggleFavorite}
            style={{...styles.favButton, ...(isFavorite(book.id.toString()) ? styles.favButtonActive : {})}}
            title={isFavorite(book.id.toString()) ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite(book.id.toString()) ? '❤️' : '🤍'}
          </button>
          <button
            onClick={handleRead}
            className="read-button"
            title="Open in reader"
          >
            Read
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  favButton: {
    padding: '0.5rem',
    backgroundColor: 'transparent',
    borderColor: '#404040',
    border: '1px solid #404040',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '40px',
    transition: 'all 0.2s',
  },
  favButtonActive: {
    backgroundColor: 'rgba(90, 159, 212, 0.2)',
    borderColor: '#5a9fd4',
  },
};
