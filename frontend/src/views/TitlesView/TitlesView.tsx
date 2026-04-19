import { useState, useEffect, useRef, useCallback } from 'react';
import { Book } from '../../types/book';
import { bookClient } from '../../api/bookClient';
import { useLibrary } from '../../hooks/useLibrary';
import { BookListRow } from '../../components/BookListRow/BookListRow';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import './style.scss';

export function TitlesView() {
  const [items, setItems] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'in-progress'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSwitchingFilter, setIsSwitchingFilter] = useState(false);
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
              onClick={() => {
                setFilterMode('all');
                setIsSwitchingFilter(true);
                setTimeout(() => setIsSwitchingFilter(false), 500);
              }}
              className={`titles-filter-button ${filterMode === 'all' ? 'titles-filter-button-active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => {
                setFilterMode('favorites');
                setIsSwitchingFilter(true);
                setTimeout(() => setIsSwitchingFilter(false), 500);
              }}
              className={`titles-filter-button ${filterMode === 'favorites' ? 'titles-filter-button-active' : ''}`}
            >
              Favorites
            </button>
            <button
              onClick={() => {
                setFilterMode('in-progress');
                setIsSwitchingFilter(true);
                setTimeout(() => setIsSwitchingFilter(false), 500);
              }}
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
        {filteredItems.length === 0 && !isLoading && !isSwitchingFilter && (
          <div className="empty-message">No titles found</div>
        )}

        {filteredItems.map((book) => (
          <BookListRow key={book.id} book={book} />
        ))}

        {(isLoading || isSwitchingFilter) && (
          <div className="loading-message">Loading...</div>
        )}

        <div ref={sentinelRef} className="sentinel" />
      </div>
    </div>
  );
}
