import { useState } from 'react';
import { SearchParams } from '../types/book';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      title: title.trim() || undefined,
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
