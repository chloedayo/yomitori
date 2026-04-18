import { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm/SearchForm';
import { HomePage } from './views/HomePage/HomePage';
import { TitlesView } from './views/TitlesView/TitlesView';
import { AuthorsView } from './views/AuthorsView/AuthorsView';
import { bookClient } from './api/bookClient';
import { SearchParams, SearchResponse } from './types/book';
import { APP_TITLE, APP_SUBTITLE, FOOTER_TEXT, ERROR_MESSAGES } from './constants';
import { APP_NAV_LABELS, APP_NAV_TITLES } from './App.constants';
import HomeIcon from '@mui/icons-material/Home';
import ListIcon from '@mui/icons-material/List';
import PeopleIcon from '@mui/icons-material/People';
import './styles/global.scss';
import './App.scss';

function App() {
  const [activePage, setActivePage] = useState<'home' | 'titles' | 'authors'>('home');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialBooks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await bookClient.search({ title: '', page: 0, pageSize: 20 });
        setSearchResults(results);
      } catch (err) {
        setError(`${ERROR_MESSAGES.LOAD_BOOKS}: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialBooks();
  }, []);

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(0);

    try {
      const results = await bookClient.search({ ...params, page: 0 });
      setSearchResults(results);
    } catch (err) {
      setError(`${ERROR_MESSAGES.SEARCH_FAILED}: ${err}`);
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
        pageSize: 20,
      });
      setSearchResults(results);
      setCurrentPage(newPage);
    } catch (err) {
      setError(`${ERROR_MESSAGES.LOAD_PAGE}: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const navButtons = [
    {
      id: 'home',
      label: APP_NAV_LABELS.HOME,
      icon: HomeIcon,
      title: APP_NAV_TITLES.HOME,
    },
    {
      id: 'titles',
      label: APP_NAV_LABELS.TITLES,
      icon: ListIcon,
      title: APP_NAV_TITLES.TITLES,
    },
    {
      id: 'authors',
      label: APP_NAV_LABELS.AUTHORS,
      icon: PeopleIcon,
      title: APP_NAV_TITLES.AUTHORS,
    },
  ] as const;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-wrapper">
          <div className="header-content">
            <h1>{APP_TITLE}</h1>
            <p className="subtitle">{APP_SUBTITLE}</p>
          </div>
          <div className="nav-buttons">
            {navButtons.map((btn) => {
              const IconComponent = btn.icon;
              return (
                <button
                  key={btn.id}
                  className={`nav-button ${activePage === btn.id ? 'nav-button-active' : ''}`}
                  onClick={() => setActivePage(btn.id as any)}
                  title={btn.title}
                >
                  <IconComponent sx={{ fontSize: '20px', marginRight: '6px' }} />
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
        <SearchForm onSearch={handleSearch} isLoading={isLoading} className="search-form-header" />
      </header>

      <main className="app-main">
        {activePage === 'titles' && <TitlesView />}

        {activePage === 'authors' && <AuthorsView />}

        {activePage === 'home' && (
          <HomePage
            searchResults={searchResults}
            isLoading={isLoading}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            error={error}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>{FOOTER_TEXT}</p>
      </footer>
    </div>
  );
}

export default App;
