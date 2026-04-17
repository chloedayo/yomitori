import { useState } from 'react';
import { SearchParams } from '../types/book';

interface SearchFormProps {
  genres: string[];
  types: string[];
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

export function SearchForm({ genres, types, onSearch, isLoading }: SearchFormProps) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      title: title.trim() || undefined,
      genre,
      type,
      page: 0,
      pageSize: 20
    });
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-field">
        <input
          type="text"
          placeholder="Search by title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          className="search-input"
        />
      </div>

      <div className="filter-row">
        <select
          value={genre || ''}
          onChange={(e) => setGenre(e.target.value || null)}
          disabled={isLoading}
          className="filter-select"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={type || ''}
          onChange={(e) => setType(e.target.value || null)}
          disabled={isLoading}
          className="filter-select"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={isLoading}
          className="search-button"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}
