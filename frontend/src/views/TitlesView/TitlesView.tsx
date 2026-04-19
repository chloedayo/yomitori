import { useState, useEffect, useRef, useCallback } from 'react';
import { Book } from '../../types/book';
import { bookClient } from '../../api/bookClient';
import { useLibrary } from '../../hooks/useLibrary';
import { BookListRow } from '../../components/BookListRow/BookListRow';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import './style.scss';

const PAGE_SIZE = 50;

export function TitlesView() {
  const [items, setItems] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'in-progress'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { getFavorites, getInProgress } = useLibrary();

  const fetchPage = useCallback(
    async (pageNum: number, resetList: boolean = false) => {
      setIsLoading(true);
      try {
        const results = await bookClient.search({
          title: query,
          page: pageNum,
          pageSize: PAGE_SIZE,
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

  const fetchBulkPage = useCallback(
    async (ids: string[], pageNum: number, resetList: boolean = false) => {
      if (ids.length === 0) {
        setItems([]);
        setHasMore(false);
        return;
      }
      setIsLoading(true);
      try {
        const results = await bookClient.searchBulk(ids, pageNum, PAGE_SIZE);
        if (resetList) {
          setItems(results.content);
        } else {
          setItems((prev) => [...prev, ...results.content]);
        }
        setHasMore(!results.last);
        setPage(pageNum);
      } catch (err) {
        console.error('Failed to fetch bulk titles:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    if (filterMode === 'all') {
      fetchPage(0, true);
    } else if (filterMode === 'favorites') {
      fetchBulkPage(getFavorites(), 0, true);
    } else if (filterMode === 'in-progress') {
      fetchBulkPage(getInProgress(), 0, true);
    }
  }, [query, filterMode, fetchPage, fetchBulkPage, getFavorites, getInProgress]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || isLoading || !hasMore) return;
        if (filterMode === 'all') {
          fetchPage(page + 1, false);
        } else if (filterMode === 'favorites') {
          fetchBulkPage(getFavorites(), page + 1, false);
        } else if (filterMode === 'in-progress') {
          fetchBulkPage(getInProgress(), page + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, isLoading, hasMore, fetchPage, fetchBulkPage, filterMode, getFavorites, getInProgress]);

  return (
    <div className="titles-container">
      <div className="search-bar-wrapper">
        <div className="search-bar">
          <button
            className="search-bar-toggle"
            onClick={() => setSearchOpen(true)}
            title="Search titles"
          >
            <SearchIcon sx={{ fontSize: '20px' }} />
          </button>
          <div className="filter-buttons">
            <button
              onClick={() => setFilterMode('all')}
              className={`titles-filter-button ${filterMode === 'all' ? 'titles-filter-button-active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('favorites')}
              className={`titles-filter-button ${filterMode === 'favorites' ? 'titles-filter-button-active' : ''}`}
            >
              Favorites
            </button>
            <button
              onClick={() => setFilterMode('in-progress')}
              className={`titles-filter-button ${filterMode === 'in-progress' ? 'titles-filter-button-active' : ''}`}
            >
              In Progress
            </button>
          </div>
        </div>
      </div>

      {searchOpen && (
        <>
          <div className="search-overlay" onClick={() => setSearchOpen(false)} />
          <div className="search-modal">
            <div className="search-modal-header">
              <button
                className="search-modal-close"
                onClick={() => setSearchOpen(false)}
              >
                <CloseIcon sx={{ fontSize: '24px' }} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search titles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-modal-input"
              autoFocus
            />
          </div>
        </>
      )}

      <div className="list-container">
        {items.length === 0 && !isLoading && (
          <div className="empty-message">No titles found</div>
        )}

        {items.map((book) => (
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
