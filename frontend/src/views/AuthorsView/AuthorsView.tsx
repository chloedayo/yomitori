import { useState, useEffect, useRef, useCallback } from 'react';
import { Book, Author } from '../../types/book';
import { bookClient } from '../../api/bookClient';
import { BookListRow } from '../../components/BookListRow/BookListRow';
import { useLibrary } from '../../hooks/useLibrary';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import './style.scss';

type ViewMode = 'list' | 'author-books';
type AuthorFilterMode = 'all' | 'favorites';

export function AuthorsView() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<AuthorFilterMode>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { isFavoriteAuthor, toggleFavoriteAuthor, getFavoriteAuthors } = useLibrary();

  const fetchAuthorsPage = useCallback(
    async (pageNum: number, resetList: boolean = false) => {
      setIsLoading(true);
      try {
        const results = await bookClient.getAuthors(query, pageNum, 50);

        if (resetList) {
          setAuthors(results.content);
        } else {
          setAuthors((prev) => [...prev, ...results.content]);
        }

        setHasMore(!results.last);
        setPage(pageNum);
      } catch (err) {
        console.error('Failed to fetch authors:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [query]
  );

  const fetchAuthorBooksPage = useCallback(
    async (_pageNum?: number, _resetList?: boolean) => {
      if (!selectedAuthor) return;

      setIsLoading(true);
      try {
        const result = await bookClient.getAuthorWithBooks(selectedAuthor.id);
        setAuthorBooks(result.books);
        setHasMore(false);
        setPage(0);
      } catch (err) {
        console.error('Failed to fetch author books:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAuthor]
  );

  useEffect(() => {
    setAuthors([]);
    setPage(0);
    setHasMore(true);
    fetchAuthorsPage(0, true);
  }, [query, fetchAuthorsPage]);

  useEffect(() => {
    if (viewMode === 'author-books') {
      setAuthorBooks([]);
      setPage(0);
      setHasMore(true);
      fetchAuthorBooksPage(0, true);
    }
  }, [viewMode, selectedAuthor, fetchAuthorBooksPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const callback = viewMode === 'list' ? fetchAuthorsPage : fetchAuthorBooksPage;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore && filterMode === 'all') {
          callback(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, isLoading, hasMore, viewMode, filterMode, fetchAuthorsPage, fetchAuthorBooksPage]);

  const handleAuthorClick = (author: Author) => {
    setSelectedAuthor(author);
    setViewMode('author-books');
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedAuthor(null);
  };

  const favoriteAuthors = getFavoriteAuthors();
  const filteredAuthors = filterMode === 'favorites'
    ? authors.filter((author) => favoriteAuthors.includes(author.id))
    : authors;

  if (viewMode === 'author-books' && selectedAuthor) {
    return (
      <div className="authors-container">
        <div className="header">
          <button onClick={handleBack} className="back-button">
            <ArrowBackIcon sx={{ fontSize: '20px' }} />
          </button>
          <h2 className="author-title">{selectedAuthor.name}</h2>
        </div>

        <div className="list-container">
          {authorBooks.length === 0 && !isLoading && (
            <div className="empty-message">No books found</div>
          )}

          {authorBooks.map((book) => (
            <BookListRow key={book.id} book={book} />
          ))}

          {isLoading && (
            <div className="loading-message">Loading...</div>
          )}

          <div ref={sentinelRef} className="sentinel" />
        </div>
      </div>
    );
  }

  return (
    <div className="authors-container">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search authors..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          <button
            onClick={() => setFilterMode('all')}
            className={`filter-button ${filterMode === 'all' ? 'filter-button-active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('favorites')}
            className={`filter-button ${filterMode === 'favorites' ? 'filter-button-active' : ''}`}
          >
            Favorites
          </button>
        </div>
      </div>

      <div className="list-container">
        {filteredAuthors.length === 0 && !isLoading && (
          <div className="empty-message">No authors found</div>
        )}

        {filteredAuthors.map((author) => (
          <div key={author.id} className="author-row">
            <span onClick={() => handleAuthorClick(author)} className="author-name">
              {author.name}
            </span>
            <button
              onClick={() => toggleFavoriteAuthor(author.id)}
              className="fav-button"
              title={isFavoriteAuthor(author.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavoriteAuthor(author.id) ? (
                <FavoriteIcon sx={{ color: '#e91e63', fontSize: '24px' }} />
              ) : (
                <FavoriteBorderIcon sx={{ color: '#ffffff', fontSize: '24px' }} />
              )}
            </button>
          </div>
        ))}

        {isLoading && (
          <div className="loading-message">Loading...</div>
        )}

        <div ref={sentinelRef} className="sentinel" />
      </div>
    </div>
  );
}
