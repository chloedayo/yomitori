import { Book } from '../types/book';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const handleOpenFile = () => {
    const fileUrl = `file://${encodeURI(book.filepath)}`;
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="book-card">
      {book.coverPath && (
        <div className="book-cover">
          <img
            src={`file://${encodeURI(book.coverPath)}`}
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
        <p className="book-meta">
          <span className="book-type">{book.type}</span>
          {book.genre && <span className="book-genre">{book.genre}</span>}
        </p>
        <p className="book-format">{book.fileFormat.toUpperCase()}</p>
        <button
          onClick={handleOpenFile}
          className="open-button"
          title={book.filepath}
        >
          Open
        </button>
      </div>
    </div>
  );
}
