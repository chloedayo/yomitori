import { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm';
import { BookGrid } from './components/BookGrid';
import { bookClient } from './api/bookClient';
import { SearchParams, SearchResponse } from './types/book';
import { useBookmark } from './hooks/useBookmark';
import './styles/App.css';

function App() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'in-progress'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const { getBookmark } = useBookmark();

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

  const displayedBooks = searchResults
    ? {
        ...searchResults,
        content: searchResults.content.filter((book) => {
          const bookIdStr = book.id.toString();
          if (activeTab === 'favorites') return favorites.includes(bookIdStr);
          if (activeTab === 'in-progress') return getBookmark(bookIdStr) !== null;
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
        {error && <div className="error-message">{error}</div>}

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'all' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('all')}
          >
            All Books
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'in-progress' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('in-progress')}
          >
            In Progress ({searchResults?.content.filter((book) => getBookmark(book.id.toString()) !== null).length || 0})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'favorites' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites ({favorites.length})
          </button>
        </div>

        {searchResults && (
          <BookGrid
            books={displayedBooks?.content || []}
            isLoading={isLoading}
            totalPages={displayedBooks?.totalPages || 0}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onFavoritesChange={(newFavorites) => {
              setFavorites(newFavorites);
            }}
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
    borderBottomColor: 'transparent',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#e8e8e8',
    borderBottomColor: '#5a9fd4',
  },
};
