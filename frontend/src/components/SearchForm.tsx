import { useState } from 'react';
import { SearchParams } from '../types/book';
import { useAuthorAutocomplete } from '../hooks/useAuthorAutocomplete';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  className?: string;
}

export function SearchForm({ onSearch, isLoading, className }: SearchFormProps) {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      onSearch({ title: query, page: 0, pageSize: 20 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`search-form ${className || ''}`}>
      <div className="search-field" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search books by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="search-input"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #404040',
            background: '#1a1a1a',
            color: '#e8e8e8',
            fontSize: '14px',
          }}
        />

        <button
          onClick={handleSearch}
          disabled={isLoading || query.trim().length === 0}
          className="search-button"
          style={{
            padding: '8px 24px',
            borderRadius: '4px',
            border: 'none',
            background: '#5a9fd4',
            color: '#e8e8e8',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && query.trim().length > 0) {
              e.currentTarget.style.background = '#6ba9e0';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#5a9fd4';
          }}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </div>
  );
}
