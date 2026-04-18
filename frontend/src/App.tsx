import { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm';
import { BookGrid } from './components/BookGrid';
import { TabsMenu } from './components/TabsMenu';
import { TitlesView } from './components/TitlesView';
import { AuthorsView } from './components/AuthorsView';
import { bookClient } from './api/bookClient';
import { Book, SearchParams, SearchResponse } from './types/book';
import { useLibrary } from './hooks/useLibrary';
import HomeIcon from '@mui/icons-material/Home';
import ListIcon from '@mui/icons-material/List';
import PeopleIcon from '@mui/icons-material/People';
import './styles/App.css';

function App() {
  const [activePage, setActivePage] = useState<'home' | 'titles' | 'authors'>('home');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'in-progress' | 'hidden'>('all');
  const [bulkSearchTab, setBulkSearchTab] = useState<'in-progress' | 'favorites' | 'hidden' | null>(null);
  const [bulkBooks, setBulkBooks] = useState<SearchResponse & { missingIds?: string[] } | null>(null);
  const { getHidden, getFavorites, getInProgress, library } = useLibrary();

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

  // Watch library changes and refresh category views in real-time
  useEffect(() => {
    if (bulkSearchTab === 'in-progress') {
      const bookIds = getInProgress();
      if (bookIds.length > 0) {
        bookClient.searchBulk(bookIds, currentPage, 20).then(results => {
          if (currentPage >= results.totalPages && currentPage > 0) {
            setCurrentPage(results.totalPages - 1);
            bookClient.searchBulk(bookIds, results.totalPages - 1, 20).then(setBulkBooks).catch(err => setError(`Failed to refresh: ${err}`));
          } else {
            setBulkBooks(results);
          }
        }).catch(err => setError(`Failed to refresh: ${err}`));
      } else {
        setBulkBooks({ content: [], totalElements: 0, totalPages: 0, pageable: { pageNumber: 0, pageSize: 20 }, last: true, first: true, missingIds: [] });
        setCurrentPage(0);
      }
    } else if (bulkSearchTab === 'favorites') {
      const favIds = getFavorites();
      if (favIds.length > 0) {
        bookClient.searchBulk(favIds, currentPage, 20).then(results => {
          if (currentPage >= results.totalPages && currentPage > 0) {
            setCurrentPage(results.totalPages - 1);
            bookClient.searchBulk(favIds, results.totalPages - 1, 20).then(setBulkBooks).catch(err => setError(`Failed to refresh: ${err}`));
          } else {
            setBulkBooks(results);
          }
        }).catch(err => setError(`Failed to refresh: ${err}`));
      } else {
        setBulkBooks({ content: [], totalElements: 0, totalPages: 0, pageable: { pageNumber: 0, pageSize: 20 }, last: true, first: true, missingIds: [] });
        setCurrentPage(0);
      }
    } else if (bulkSearchTab === 'hidden') {
      const hiddenIds = getHidden();
      if (hiddenIds.length > 0) {
        bookClient.searchBulk(hiddenIds, currentPage, 20).then(results => {
          if (currentPage >= results.totalPages && currentPage > 0) {
            setCurrentPage(results.totalPages - 1);
            bookClient.searchBulk(hiddenIds, results.totalPages - 1, 20).then(setBulkBooks).catch(err => setError(`Failed to refresh: ${err}`));
          } else {
            setBulkBooks(results);
          }
        }).catch(err => setError(`Failed to refresh: ${err}`));
      } else {
        setBulkBooks({ content: [], totalElements: 0, totalPages: 0, pageable: { pageNumber: 0, pageSize: 20 }, last: true, first: true, missingIds: [] });
        setCurrentPage(0);
      }
    }
  }, [library, bulkSearchTab, currentPage]);

  const hiddenBooks = getHidden();

  const filterHiddenBooks = (books: Book[]): Book[] => {
    return books.filter((book) => !hiddenBooks.includes(book.id.toString()));
  };

  const getInProgressCount = (): number => {
    return getInProgress().length;
  };

  const getFavoritesCount = (): number => {
    return getFavorites().length;
  };

  const displayedBooks = searchResults && activeTab === 'all'
    ? {
        ...searchResults,
        content: filterHiddenBooks(searchResults.content),
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
        const bookIds = getInProgress();
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
        const favIds = getFavorites();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="app-header-content">
            <h1>Yomitori</h1>
            <p className="subtitle">Book Collection Search</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              style={{
                ...styles.navButton,
                ...(activePage === 'home' ? styles.navButtonActive : {}),
              }}
              onClick={() => setActivePage('home')}
              title="Home"
            >
              <HomeIcon sx={{ fontSize: '20px', marginRight: '6px' }} />
              Home
            </button>
            <button
              style={{
                ...styles.navButton,
                ...(activePage === 'titles' ? styles.navButtonActive : {}),
              }}
              onClick={() => setActivePage('titles')}
              title="Titles"
            >
              <ListIcon sx={{ fontSize: '20px', marginRight: '6px' }} />
              Titles
            </button>
            <button
              style={{
                ...styles.navButton,
                ...(activePage === 'authors' ? styles.navButtonActive : {}),
              }}
              onClick={() => setActivePage('authors')}
              title="Authors"
            >
              <PeopleIcon sx={{ fontSize: '20px', marginRight: '6px' }} />
              Authors
            </button>
          </div>
        </div>
        <SearchForm
          onSearch={handleSearch}
          isLoading={isLoading}
          className="search-form-header"
        />
      </header>

      <main className="app-main">
        {activePage === 'titles' && <TitlesView />}

        {activePage === 'authors' && <AuthorsView />}

        {activePage === 'home' && (
          <>
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
                  In Progress ({getInProgressCount()})
                </button>
                <button
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'favorites' ? styles.tabActive : {}),
                  }}
                  onClick={() => handleTabChange('favorites')}
                >
                  Favorites ({getFavoritesCount()})
                </button>
              </div>
              <TabsMenu hiddenCount={hiddenBooks.length} onNavigateToHidden={() => handleTabChange('hidden')} />
            </div>

            {error && <div className="error-message">{error}</div>}

            {searchResults && (
              <BookGrid
                books={(bulkSearchTab && bulkBooks ? (bulkSearchTab === 'hidden' ? bulkBooks.content : filterHiddenBooks(bulkBooks.content)) : displayedBooks?.content) || []}
                isLoading={isLoading}
                totalPages={(bulkSearchTab ? bulkBooks?.totalPages : displayedBooks?.totalPages) || 0}
                currentPage={currentPage}
                onPageChange={async (newPage) => {
                  if (bulkSearchTab && bulkBooks) {
                    setCurrentPage(newPage);
                    try {
                      let bookIds: string[] = [];
                      if (bulkSearchTab === 'in-progress') {
                        bookIds = getInProgress();
                      } else if (bulkSearchTab === 'favorites') {
                        bookIds = getFavorites();
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
                showPagination={activeTab === 'all' || bulkSearchTab !== null}
              />
            )}

            {!searchResults && !isLoading && !error && (
              <div className="welcome">
                <p>Enter search terms above to find books in your collection</p>
              </div>
            )}
          </>
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
  navButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #404040',
    color: '#a8a8a8',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  navButtonActive: {
    background: '#5a9fd4',
    borderColor: '#5a9fd4',
    color: '#e8e8e8',
  },
};
