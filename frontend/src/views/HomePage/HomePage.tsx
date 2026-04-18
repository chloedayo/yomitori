import { useState, useEffect } from 'react';
import { Book, SearchResponse } from '../../types/book';
import { bookClient } from '../../api/bookClient';
import { useLibrary } from '../../hooks/useLibrary';
import { BookGrid } from '../../components/BookGrid/BookGrid';
import { TabsMenu } from '../../components/TabsMenu/TabsMenu';
import { DEFAULT_PAGE_SIZE, TAB_LABELS, ERROR_MESSAGES } from '../../constants';
import { HOME_PAGE_LABELS } from './constants';
import './style.scss';

interface HomePageProps {
  searchResults: SearchResponse | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  error: string | null;
}

export function HomePage({
  searchResults,
  isLoading,
  currentPage,
  onPageChange,
  error,
}: HomePageProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'in-progress' | 'hidden'>('all');
  const [bulkSearchTab, setBulkSearchTab] = useState<'in-progress' | 'favorites' | 'hidden' | null>(null);
  const [bulkBooks, setBulkBooks] = useState<SearchResponse & { missingIds?: string[] } | null>(null);
  const { getHidden, getFavorites, getInProgress } = useLibrary();

  const hiddenBooks = getHidden();

  const filterHiddenBooks = (books: Book[]): Book[] => {
    return books.filter((book) => !hiddenBooks.includes(book.id.toString()));
  };

  useEffect(() => {
    if (bulkSearchTab === 'in-progress') {
      const bookIds = getInProgress();
      if (bookIds.length > 0) {
        bookClient.searchBulk(bookIds, currentPage, DEFAULT_PAGE_SIZE).then(setBulkBooks);
      } else {
        setBulkBooks({
          content: [],
          totalElements: 0,
          totalPages: 0,
          pageable: { pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE },
          last: true,
          first: true,
          missingIds: [],
        });
      }
    } else if (bulkSearchTab === 'favorites') {
      const favIds = getFavorites();
      if (favIds.length > 0) {
        bookClient.searchBulk(favIds, currentPage, DEFAULT_PAGE_SIZE).then(setBulkBooks);
      } else {
        setBulkBooks({
          content: [],
          totalElements: 0,
          totalPages: 0,
          pageable: { pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE },
          last: true,
          first: true,
          missingIds: [],
        });
      }
    } else if (bulkSearchTab === 'hidden') {
      const hiddenIds = getHidden();
      if (hiddenIds.length > 0) {
        bookClient.searchBulk(hiddenIds, currentPage, DEFAULT_PAGE_SIZE).then(setBulkBooks);
      } else {
        setBulkBooks({
          content: [],
          totalElements: 0,
          totalPages: 0,
          pageable: { pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE },
          last: true,
          first: true,
          missingIds: [],
        });
      }
    }
  }, [bulkSearchTab, currentPage, getInProgress, getFavorites, getHidden]);

  const displayedBooks =
    searchResults && activeTab === 'all'
      ? {
          ...searchResults,
          content: filterHiddenBooks(searchResults.content),
        }
      : searchResults;

  const handleTabChange = async (tab: typeof activeTab) => {
    setActiveTab(tab);

    if (tab === 'in-progress') {
      setBulkSearchTab('in-progress');
      try {
        const bookIds = getInProgress();
        if (bookIds.length > 0) {
          const results = await bookClient.searchBulk(bookIds, 0, DEFAULT_PAGE_SIZE);
          setBulkBooks(results);
        } else {
          setBulkBooks({
            content: [],
            totalElements: 0,
            totalPages: 0,
            pageable: { pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE },
            last: true,
            first: true,
            missingIds: [],
          });
        }
      } catch (err) {
        console.error(ERROR_MESSAGES.LOAD_IN_PROGRESS, err);
      }
    } else if (tab === 'favorites') {
      setBulkSearchTab('favorites');
      try {
        const favIds = getFavorites();
        if (favIds.length > 0) {
          const results = await bookClient.searchBulk(favIds, 0, DEFAULT_PAGE_SIZE);
          setBulkBooks(results);
        } else {
          setBulkBooks({
            content: [],
            totalElements: 0,
            totalPages: 0,
            pageable: { pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE },
            last: true,
            first: true,
            missingIds: [],
          });
        }
      } catch (err) {
        console.error(ERROR_MESSAGES.LOAD_FAVORITES, err);
      }
    } else if (tab === 'hidden') {
      setBulkSearchTab('hidden');
      try {
        const hiddenIds = getHidden();
        if (hiddenIds.length > 0) {
          const results = await bookClient.searchBulk(hiddenIds, 0, DEFAULT_PAGE_SIZE);
          setBulkBooks(results);
        } else {
          setBulkBooks({
            content: [],
            totalElements: 0,
            totalPages: 0,
            pageable: { pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE },
            last: true,
            first: true,
            missingIds: [],
          });
        }
      } catch (err) {
        console.error(ERROR_MESSAGES.LOAD_HIDDEN, err);
      }
    } else {
      setBulkSearchTab(null);
      setBulkBooks(null);
    }
  };

  return (
    <div className="home-page">
      <div className="tabs-container">
        <div className="tabs-group">
          <button
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            {TAB_LABELS.ALL}
          </button>
          <button
            className={`tab ${activeTab === 'in-progress' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('in-progress')}
          >
            {TAB_LABELS.IN_PROGRESS} ({getInProgress().length})
          </button>
          <button
            className={`tab ${activeTab === 'favorites' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('favorites')}
          >
            {TAB_LABELS.FAVORITES} ({getFavorites().length})
          </button>
        </div>
        <TabsMenu hiddenCount={hiddenBooks.length} onNavigateToHidden={() => handleTabChange('hidden')} />
      </div>

      {error && <div className="error-message">{error}</div>}

      {searchResults && (
        <BookGrid
          books={
            (bulkSearchTab && bulkBooks
              ? bulkSearchTab === 'hidden'
                ? bulkBooks.content
                : filterHiddenBooks(bulkBooks.content)
              : displayedBooks?.content) || []
          }
          isLoading={isLoading}
          totalPages={(bulkSearchTab ? bulkBooks?.totalPages : displayedBooks?.totalPages) || 0}
          currentPage={currentPage}
          onPageChange={onPageChange}
          showPagination={activeTab === 'all' || bulkSearchTab !== null}
        />
      )}

      {!searchResults && !isLoading && !error && (
        <div className="welcome">{HOME_PAGE_LABELS.WELCOME}</div>
      )}
    </div>
  );
}
