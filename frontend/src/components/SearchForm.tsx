import { useState } from 'react';
import { SearchParams } from '../types/book';
import { useAuthorAutocomplete } from '../hooks/useAuthorAutocomplete';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  className?: string;
}

export function SearchForm({ onSearch, isLoading, className }: SearchFormProps) {
  const [searchMode, setSearchMode] = useState<'title' | 'author'>('title');
  const [query, setQuery] = useState('');
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  const { authors: authorSuggestions } = useAuthorAutocomplete(
    searchMode === 'author' ? query : ''
  );

  const handleSearch = () => {
    if (query.trim()) {
      if (searchMode === 'title') {
        onSearch({ title: query, page: 0, pageSize: 20 });
      } else {
        onSearch({ author: query, page: 0, pageSize: 20 });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
      setShowAuthorDropdown(false);
    }
  };

  const handleAuthorSelect = (authorName: string) => {
    setQuery(authorName);
    setShowAuthorDropdown(false);
    onSearch({ author: authorName, page: 0, pageSize: 20 });
  };

  const handleModeChange = (mode: 'title' | 'author') => {
    setSearchMode(mode);
    setQuery('');
    setShowAuthorDropdown(false);
  };

  return (
    <div className={`search-form ${className || ''}`}>
      <div className="search-field" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select
          value={searchMode}
          onChange={(e) => handleModeChange(e.target.value as 'title' | 'author')}
          disabled={isLoading}
          className="search-mode-select"
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #404040',
            background: '#1a1a1a',
            color: '#e8e8e8',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <option value="title">Title</option>
          <option value="author">Author</option>
        </select>

        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder={searchMode === 'title' ? 'Search books...' : 'Search authors...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (searchMode === 'author' && e.target.value.length > 0) {
                setShowAuthorDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchMode === 'author' && query.length > 0) {
                setShowAuthorDropdown(true);
              }
            }}
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

          {searchMode === 'author' && showAuthorDropdown && authorSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1a1a1a',
                border: '1px solid #404040',
                borderTop: 'none',
                borderRadius: '0 0 4px 4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              {authorSuggestions.map((author) => (
                <button
                  key={author.id}
                  onClick={() => handleAuthorSelect(author.name)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#e8e8e8',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'background-color 0.2s',
                    borderBottom: '1px solid #404040',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d2d')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {author.name}
                </button>
              ))}
            </div>
          )}
        </div>

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
