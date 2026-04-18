import { useState } from 'react';
import { SearchParams } from '../../types/book';
import { SEARCH_FORM_LABELS } from './constants';
import './style.scss';

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
      <div className="search-field">
        <input
          type="text"
          placeholder={SEARCH_FORM_LABELS.PLACEHOLDER}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="search-input"
        />

        <button
          onClick={handleSearch}
          disabled={isLoading || query.trim().length === 0}
          className="search-button"
        >
          {isLoading ? SEARCH_FORM_LABELS.BUTTON_TEXT_LOADING : SEARCH_FORM_LABELS.BUTTON_TEXT}
        </button>
      </div>
    </div>
  );
}
