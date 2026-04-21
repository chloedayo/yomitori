import { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm/SearchForm';
import { HomePage } from './views/HomePage/HomePage';
import { TitlesView } from './views/TitlesView/TitlesView';
import { AuthorsView } from './views/AuthorsView/AuthorsView';
import { DictionaryView } from './views/DictionaryView/DictionaryView';
import { QuizView } from './views/QuizView/QuizView';
import { StatsView } from './views/StatsView/StatsView';
import { bookClient } from './api/bookClient';
import { SearchParams, SearchResponse } from './types/book';
import { APP_TITLE, APP_SUBTITLE, FOOTER_TEXT, ERROR_MESSAGES, NAV_LABELS, NAV_TITLES, DEFAULT_PAGE_SIZE } from './constants';
import HomeIcon from '@mui/icons-material/Home';
import ListIcon from '@mui/icons-material/List';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import BarChartIcon from '@mui/icons-material/BarChart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import './styles/global.scss';
import './App.scss';

function App() {
  const [activePage, setActivePage] = useState<'home' | 'titles' | 'authors' | 'dictionary' | 'quiz' | 'stats'>('home');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastSearchParams, setLastSearchParams] = useState<SearchParams>({ title: '', page: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadInitialBooks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await bookClient.search({ title: '', page: 0, pageSize: DEFAULT_PAGE_SIZE });
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
    setActivePage('home');
    setIsLoading(true);
    setError(null);
    setCurrentPage(0);

    const searchParams = { ...params, page: 0, pageSize: DEFAULT_PAGE_SIZE };
    setLastSearchParams(searchParams);

    try {
      const results = await bookClient.search(searchParams);
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
      const results = await bookClient.search({ ...lastSearchParams, page: newPage });
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
      label: NAV_LABELS.HOME,
      icon: HomeIcon,
      title: NAV_TITLES.HOME,
    },
    {
      id: 'titles',
      label: NAV_LABELS.TITLES,
      icon: ListIcon,
      title: NAV_TITLES.TITLES,
    },
    {
      id: 'authors',
      label: NAV_LABELS.AUTHORS,
      icon: PeopleIcon,
      title: NAV_TITLES.AUTHORS,
    },
    {
      id: 'dictionary',
      label: NAV_LABELS.DICTIONARY,
      icon: MenuBookIcon,
      title: NAV_TITLES.DICTIONARY,
      mobileHidden: true,
    },
    {
      id: 'quiz',
      label: NAV_LABELS.QUIZ,
      icon: SpellcheckIcon,
      title: NAV_TITLES.QUIZ,
      mobileHidden: true,
    },
    {
      id: 'stats',
      label: NAV_LABELS.STATS,
      icon: BarChartIcon,
      title: NAV_TITLES.STATS,
      mobileHidden: true,
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
                  className={`nav-button ${activePage === btn.id ? 'nav-button-active' : ''}${'mobileHidden' in btn && btn.mobileHidden ? ' nav-button-mobile-hidden' : ''}`}
                  onClick={() => setActivePage(btn.id as any)}
                  title={btn.title}
                >
                  <IconComponent sx={{ fontSize: '20px', marginRight: '6px' }} />
                  {btn.label}
                </button>
              );
            })}
          </div>
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Menu"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
        {activePage === 'home' && <SearchForm onSearch={handleSearch} isLoading={isLoading} className="search-form-header" />}
        {mobileMenuOpen && (
          <div className="mobile-nav-menu">
            {navButtons.map((btn) => {
              const IconComponent = btn.icon;
              return (
                <button
                  key={btn.id}
                  className={`mobile-nav-button ${activePage === btn.id ? 'mobile-nav-button-active' : ''}${'mobileHidden' in btn && btn.mobileHidden ? ' nav-button-mobile-hidden' : ''}`}
                  onClick={() => {
                    setActivePage(btn.id as any);
                    setMobileMenuOpen(false);
                  }}
                  title={btn.title}
                >
                  <IconComponent sx={{ fontSize: '20px', marginRight: '8px' }} />
                  {btn.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="app-main">
        {activePage === 'titles' && <TitlesView />}

        {activePage === 'authors' && <AuthorsView />}

        {activePage === 'dictionary' && <DictionaryView />}

        {activePage === 'quiz' && <QuizView />}

        {activePage === 'stats' && <StatsView />}

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
