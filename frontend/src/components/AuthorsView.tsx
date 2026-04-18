import { useState, useEffect, useRef, useCallback } from 'react';
import { Book, Author } from '../types/book';
import { bookClient } from '../api/bookClient';
import { BookListRow } from './BookListRow';
import { useLibrary } from '../hooks/useLibrary';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

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
    async (pageNum: number, resetList: boolean = false) => {
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
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>
            <ArrowBackIcon sx={{ fontSize: '20px' }} />
          </button>
          <h2 style={styles.authorTitle}>{selectedAuthor.name}</h2>
        </div>

        <div style={styles.listContainer}>
          {authorBooks.length === 0 && !isLoading && (
            <div style={styles.emptyMessage}>No books found</div>
          )}

          {authorBooks.map((book) => (
            <BookListRow key={book.id} book={book} />
          ))}

          {isLoading && (
            <div style={styles.loadingMessage}>Loading...</div>
          )}

          <div ref={sentinelRef} style={styles.sentinel} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search authors..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filterButtons}>
          <button
            onClick={() => setFilterMode('all')}
            style={{
              ...styles.filterButton,
              ...(filterMode === 'all' ? styles.filterButtonActive : {}),
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('favorites')}
            style={{
              ...styles.filterButton,
              ...(filterMode === 'favorites' ? styles.filterButtonActive : {}),
            }}
          >
            Favorites
          </button>
        </div>
      </div>

      <div style={styles.listContainer}>
        {filteredAuthors.length === 0 && !isLoading && (
          <div style={styles.emptyMessage}>No authors found</div>
        )}

        {filteredAuthors.map((author) => (
          <div
            key={author.id}
            style={styles.authorRow}
          >
            <span
              onClick={() => handleAuthorClick(author)}
              style={styles.authorName}
            >
              {author.name}
            </span>
            <button
              onClick={() => toggleFavoriteAuthor(author.id)}
              style={styles.favButton}
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
          <div style={styles.loadingMessage}>Loading...</div>
        )}

        <div ref={sentinelRef} style={styles.sentinel} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    flex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #404040',
    background: '#0a0a0a',
    gap: '12px',
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#e8e8e8',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorTitle: {
    margin: 0,
    color: '#e8e8e8',
    fontSize: '18px',
  },
  searchBar: {
    padding: '1rem',
    borderBottom: '1px solid #404040',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '300px',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #404040',
    background: '#1a1a1a',
    color: '#e8e8e8',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    padding: '6px 14px',
    background: '#2d2d2d',
    border: '1px solid #404040',
    color: '#a8a8a8',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: '#5a9fd4',
    borderColor: '#5a9fd4',
    color: '#e8e8e8',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1rem',
  },
  authorRow: {
    padding: '12px',
    borderBottom: '1px solid #2d2d2d',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  authorName: {
    color: '#e8e8e8',
    fontSize: '18px',
    cursor: 'pointer',
    flex: 1,
    transition: 'color 0.2s',
  },
  favButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyMessage: {
    textAlign: 'center' as const,
    color: '#808080',
    padding: '2rem',
  },
  loadingMessage: {
    textAlign: 'center' as const,
    color: '#808080',
    padding: '1rem',
  },
  sentinel: {
    height: '20px',
  },
};
