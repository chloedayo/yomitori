import { Book } from '../types/book';
import { BookCard } from './BookCard';
import { useLibrary } from '../hooks/useLibrary';

interface BookGridProps {
  books: Book[];
  isLoading: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onFavoritesChange?: (favorites: string[]) => void;
  onBulkRefresh?: () => Promise<void>;
  showPagination?: boolean;
}

export function BookGrid({
  books,
  isLoading,
  totalPages,
  currentPage,
  onPageChange,
  onFavoritesChange,
  onBulkRefresh,
  showPagination = true
}: BookGridProps) {
  const { getFavorites } = useLibrary();

  const handleFavoritesChange = () => {
    onFavoritesChange?.(getFavorites());
  };
  if (isLoading) {
    return <div className="loading">Loading books...</div>;
  }

  if (books.length === 0) {
    return <div className="no-results">No books found. Try a different search.</div>;
  }

  return (
    <div className="book-grid-container">
      <div className="book-grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} onFavoritesChange={handleFavoritesChange} onBulkRefresh={onBulkRefresh} />
        ))}
      </div>

      {showPagination && totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="pagination-button"
          >
            Previous
          </button>

          <span className="pagination-info">
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
