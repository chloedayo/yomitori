import { useEffect, useState } from 'react';
import { SearchForm } from './components/SearchForm';
import { BookGrid } from './components/BookGrid';
import { bookClient } from './api/bookClient';
import { SearchParams, SearchResponse } from './types/book';
import './styles/App.css';

function App() {
  const [genres, setGenres] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [genresData, typesData] = await Promise.all([
          bookClient.getGenres(),
          bookClient.getTypes()
        ]);
        setGenres(genresData);
        setTypes(typesData);
      } catch (err) {
        setError(`Failed to load filters: ${err}`);
      }
    };

    loadFilters();
  }, []);

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
        <h1>Yomitori</h1>
        <p className="subtitle">Book Collection Search</p>
      </header>

      <main className="app-main">
        <SearchForm
          genres={genres}
          types={types}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        {error && <div className="error-message">{error}</div>}

        {searchResults && (
          <BookGrid
            books={searchResults.content}
            isLoading={isLoading}
            totalPages={searchResults.totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
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
