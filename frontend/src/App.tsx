import { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm';
import { BookGrid } from './components/BookGrid';
import { TabsMenu } from './components/TabsMenu';
import { bookClient } from './api/bookClient';
import { SearchParams, SearchResponse } from './types/book';
import { useBookmark } from './hooks/useBookmark';
import { useHiddenBooks } from './hooks/useHiddenBooks';
import './styles/App.css';

function App() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'in-progress' | 'hidden'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bulkSearchTab, setBulkSearchTab] = useState<'in-progress' | 'favorites' | 'hidden' | null>(null);
  const [bulkBooks, setBulkBooks] = useState<SearchResponse & { missingIds?: string[] } | null>(null);
  const { getBookmark } = useBookmark();
  const { getHidden } = useHiddenBooks();

  useEffect(() => {
    const storedFavs = localStorage.getItem('yomitori-favorites');
    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  useEffect(() => {
    const loadInitialBooks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await bookClient.search({ title: '', page: 0, pageSize: 20 });
        setSearchResults(results);
      } catch (err) {
        setError(`Failed to load books: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialBooks();
  }, []);

  const hiddenBooks = getHidden();

  const displayedBooks = searchResults && activeTab === 'all'
    ? {
        ...searchResults,
        content: searchResults.content.filter((book) => {
          const bookIdStr = book.id.toString();
          if (hiddenBooks.includes(bookIdStr)) return false;
          return true;
        }),
      }
    : searchResults;

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(0);

    try {
      const results = await bookClient.search({ ...params, page: 0 });
      setSearchResults(results);
    } catch (err) {
      setError(`Search failed: ${err}`);
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await bookClient.search({
        page: newPage,
        pageSize: 20
      });
      setSearchResults(results);
      setCurrentPage(newPage);
    } catch (err) {
      setError(`Failed to load page: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = async (tab: 'all' | 'favorites' | 'in-progress' | 'hidden') => {
    setActiveTab(tab);

    if (tab === 'in-progress') {
      setBulkSearchTab('in-progress');
      setCurrentPage(0);
      try {
        const bookmarks = JSON.parse(localStorage.getItem('yomitori-bookmarks') || '{}');
        const bookIds = Object.keys(bookmarks);
        if (bookIds.length > 0) {
          const results = await bookClient.searchBulk(bookIds, 0, 20);
          setBulkBooks(results);
        } else {
          setBulkBooks({ content: [], totalElements: 0, totalPages: 0, pageable: { pageNumber: 0, pageSize: 20 }, last: true, first: true, missingIds: [] });
        }
      } catch (err) {
        setError(`Failed to load in-progress books: ${err}`);
      }
    } else if (tab === 'favorites') {
      setBulkSearchTab('favorites');
      setCurrentPage(0);
      try {
        const favIds = JSON.parse(localStorage.getItem('yomitori-favorites') || '[]');
        if (favIds.length > 0) {
          const results = await bookClient.searchBulk(favIds, 0, 20);
          setBulkBooks(results);
        } else {
          setBulkBooks({ content: [], totalElements: 0, totalPages: 0, pageable: { pageNumber: 0, pageSize: 20 }, last: true, first: true, missingIds: [] });
        }
      } catch (err) {
        setError(`Failed to load favorites: ${err}`);
      }
    } else if (tab === 'hidden') {
      setBulkSearchTab('hidden');
      setCurrentPage(0);
      try {
        const hiddenIds = getHidden();
        if (hiddenIds.length > 0) {
          const results = await bookClient.searchBulk(hiddenIds, 0, 20);
          setBulkBooks(results);
        } else {
          setBulkBooks({ content: [], totalElements: 0, totalPages: 0, pageable: { pageNumber: 0, pageSize: 20 }, last: true, first: true, missingIds: [] });
        }
      } catch (err) {
        setError(`Failed to load hidden books: ${err}`);
      }
    } else {
      setBulkSearchTab(null);
      setBulkBooks(null);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-content">
          <h1>Yomitori</h1>
          <p className="subtitle">Book Collection Search</p>
        </div>
        <SearchForm
          onSearch={handleSearch}
          isLoading={isLoading}
          className="search-form-header"
        />
      </header>

      <main className="app-main">
        <div style={{...styles.tabs, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{ display: 'flex' }}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'all' ? styles.tabActive : {}),
              }}
              onClick={() => handleTabChange('all')}
            >
              All Books
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'in-progress' ? styles.tabActive : {}),
              }}
              onClick={() => handleTabChange('in-progress')}
            >
              In Progress ({searchResults?.content.filter((book) => getBookmark(book.id.toString()) !== null).length || 0})
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'favorites' ? styles.tabActive : {}),
              }}
              onClick={() => handleTabChange('favorites')}
            >
              Favorites ({favorites.length})
            </button>
          </div>
          <TabsMenu hiddenCount={hiddenBooks.length} onNavigateToHidden={() => handleTabChange('hidden')} />
        </div>

        {error && <div className="error-message">{error}</div>}

        {searchResults && (
          <BookGrid
            books={(bulkSearchTab ? bulkBooks?.content : displayedBooks?.content) || []}
            isLoading={isLoading}
            totalPages={(bulkSearchTab ? bulkBooks?.totalPages : displayedBooks?.totalPages) || 0}
            currentPage={currentPage}
            onPageChange={async (newPage) => {
              if (bulkSearchTab && bulkBooks) {
                setCurrentPage(newPage);
                try {
                  let bookIds: string[] = [];
                  if (bulkSearchTab === 'in-progress') {
                    const bookmarks = JSON.parse(localStorage.getItem('yomitori-bookmarks') || '{}');
                    bookIds = Object.keys(bookmarks);
                  } else if (bulkSearchTab === 'favorites') {
                    bookIds = JSON.parse(localStorage.getItem('yomitori-favorites') || '[]');
                  } else if (bulkSearchTab === 'hidden') {
                    bookIds = getHidden();
                  }
                  const results = await bookClient.searchBulk(bookIds, newPage, 20);
                  setBulkBooks(results);
                } catch (err) {
                  setError(`Failed to load page: ${err}`);
                }
              } else {
                await handlePageChange(newPage);
              }
            }}
            onFavoritesChange={(newFavorites) => {
              setFavorites(newFavorites);
            }}
            showPagination={activeTab === 'all' || bulkSearchTab !== null}
          />
        )}

        {!searchResults && !isLoading && !error && (
          <div className="welcome">
            <p>Enter search terms above to find books in your collection</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Yomitori v0.1.0 • Local Book Collection Search</p>
      </footer>
    </div>
  );
}

export default App;

const styles = {
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #404040',
    marginBottom: '2rem',
    gap: '0',
  },
  tab: {
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    color: '#a8a8a8',
    borderBottomWidth: '2px' as any,
    borderBottomStyle: 'solid' as any,
    borderBottomColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#e8e8e8',
    borderBottomColor: '#5a9fd4',
  },
};
