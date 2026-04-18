import { useState, useEffect, useRef, useCallback } from 'react';
import { Book } from '../types/book';
import { bookClient } from '../api/bookClient';
import { useLibrary } from '../hooks/useLibrary';
import { BookListRow } from './BookListRow';

export function TitlesView() {
  const [items, setItems] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'in-progress'>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { getFavorites, getInProgress } = useLibrary();

  const fetchPage = useCallback(
    async (pageNum: number, resetList: boolean = false) => {
      setIsLoading(true);
      try {
        const results = await bookClient.search({
          title: query,
          page: pageNum,
          pageSize: 50,
        });

        if (resetList) {
          setItems(results.content);
        } else {
          setItems((prev) => [...prev, ...results.content]);
        }

        setHasMore(!results.last);
        setPage(pageNum);
      } catch (err) {
        console.error('Failed to fetch titles:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    fetchPage(0, true);
  }, [query, fetchPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore && filterMode === 'all') {
          fetchPage(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, isLoading, hasMore, fetchPage, filterMode]);

  const handleToggleFavorite = (bookId: string) => {
    toggleFavorite(bookId);
  };


  const favorites = getFavorites();
  const inProgress = getInProgress();

  const filteredItems = items.filter((book) => {
    if (filterMode === 'favorites') {
      return favorites.includes(book.id);
    }
    if (filterMode === 'in-progress') {
      return inProgress.includes(book.id);
    }
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search titles..."
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
          <button
            onClick={() => setFilterMode('in-progress')}
            style={{
              ...styles.filterButton,
              ...(filterMode === 'in-progress' ? styles.filterButtonActive : {}),
            }}
          >
            In Progress
          </button>
        </div>
      </div>

      <div style={styles.listContainer}>
        {filteredItems.length === 0 && !isLoading && (
          <div style={styles.emptyMessage}>No titles found</div>
        )}

        {filteredItems.map((book) => (
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

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    flex: 1,
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
    position: 'absolute' as const,
    left: '0',
    top: '100%',
    zIndex: 10,
    marginTop: '8px',
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
  progressBadge: {
    background: 'rgba(90, 159, 212, 0.3)',
    color: '#5a9fd4',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
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
