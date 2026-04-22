import { useState, useEffect } from 'react';
import { resolvePath } from '../lib/resolvePath';

interface Author {
  id: string;
  name: string;
}

export function useAuthorAutocomplete(query: string) {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setAuthors([]);
      return;
    }

    const fetchAuthors = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = resolvePath(`/api/authors/autocomplete?query=${encodeURIComponent(query)}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch authors');
        const data = await response.json();
        setAuthors(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setAuthors([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchAuthors, 300); // debounce 300ms
    return () => clearTimeout(timer);
  }, [query]);

  return { authors, isLoading, error };
}
