import { Book } from '../../types/book';
import { CardMenu } from '../CardMenu/CardMenu';
import { useLibrary } from '../../hooks/useLibrary';
import { resolvePath } from '../../lib/resolvePath';
import { BOOK_CARD_LABELS } from './constants';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import './style.scss';

interface BookCardProps {
  book: Book;
  onFavoritesChange?: () => void;
}

export function BookCard({ book, onFavoritesChange }: BookCardProps) {
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
    <div className="book-card">
      <div className="book-card-menu">
        <CardMenu
          onHide={() => {
            toggleHidden(book.id.toString());
          }}
          onClearBookmark={() => {
            clearBookmark(book.id.toString());
          }}
          isHidden={isHidden(book.id.toString())}
          hasBookmark={getBookmark(book.id.toString()) !== null}
        />
      </div>

      {book.coverPath && (
        <div className="book-cover">
          <img
            src={resolvePath(`/api/books/cover-file/${book.id}`)}
            alt={book.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23eee" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Cover%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
      )}
      {!book.coverPath && (
        <div className="book-cover book-cover-placeholder">
          <div className="placeholder-text">{BOOK_CARD_LABELS.NO_COVER}</div>
        </div>
      )}

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-format">{book.fileFormat.toUpperCase()}</p>
        <div className="button-group">
          {!isHidden(book.id.toString()) && (
            <button
              onClick={handleToggleFavorite}
              className="fav-button"
              title={isFavorite(book.id.toString()) ? BOOK_CARD_LABELS.REMOVE_FAVORITE : BOOK_CARD_LABELS.ADD_FAVORITE}
            >
              {isFavorite(book.id.toString()) ? (
                <FavoriteIcon sx={{ color: '#e91e63', fontSize: '28px' }} />
              ) : (
                <FavoriteBorderIcon sx={{ color: '#ffffff', fontSize: '28px' }} />
              )}
            </button>
          )}
          <button
            onClick={handleRead}
            className="read-button"
            title={BOOK_CARD_LABELS.OPEN_IN_READER}
          >
            {BOOK_CARD_LABELS.READ_BUTTON}
          </button>
        </div>
      </div>
    </div>
  );
}
