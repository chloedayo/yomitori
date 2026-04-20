// Page sizes
export const DEFAULT_PAGE_SIZE = 24;

// Navigation
export const NAV_LABELS = {
  HOME: 'Home',
  TITLES: 'Titles',
  AUTHORS: 'Authors',
  DICTIONARY: 'Dictionary',
  QUIZ: 'Quiz',
  STATS: 'Stats',
} as const;

export const NAV_TITLES = {
  HOME: 'Home',
  TITLES: 'Titles',
  AUTHORS: 'Authors',
  DICTIONARY: 'Dictionary',
  QUIZ: 'Reading Quiz',
  STATS: 'Word Stats',
} as const;

// Tabs
export const TAB_LABELS = {
  ALL: 'All Books',
  IN_PROGRESS: 'In Progress',
  FAVORITES: 'Favorites',
} as const;

// App metadata
export const APP_TITLE = 'Yomitori';
export const APP_SUBTITLE = 'Book Collection Search';
export const APP_VERSION = 'v0.1.0';
export const FOOTER_TEXT = `${APP_TITLE} ${APP_VERSION} • Local Book Collection Search`;

// Error messages
export const ERROR_MESSAGES = {
  LOAD_BOOKS: 'Failed to load books',
  SEARCH_FAILED: 'Search failed',
  LOAD_PAGE: 'Failed to load page',
  LOAD_IN_PROGRESS: 'Failed to load in-progress books',
  LOAD_FAVORITES: 'Failed to load favorites',
  LOAD_HIDDEN: 'Failed to load hidden books',
  REFRESH: 'Failed to refresh',
} as const;
