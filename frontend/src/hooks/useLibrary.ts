import { useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type BookRecord = {
  id: string
  categories: ('favorite' | 'in progress' | 'hidden')[]
  progress: number
  totalChars?: number
}

const LIBRARY_KEY = 'yomitori-library'
const OLD_BOOKMARKS_KEY = 'yomitori-bookmarks'
const OLD_FAVORITES_KEY = 'yomitori-favorites'
const OLD_HIDDEN_KEY = 'yomitori-hidden-books'
const FAVORITE_AUTHORS_KEY = 'yomitori-favorite-authors'

function migrateOldSchema(): BookRecord[] {
  const recordMap = new Map<string, BookRecord>()

  // Migrate bookmarks (in progress)
  try {
    const oldBookmarks = localStorage.getItem(OLD_BOOKMARKS_KEY)
    if (oldBookmarks) {
      const bookmarks: Record<string, number> = JSON.parse(oldBookmarks)
      Object.entries(bookmarks).forEach(([id, progress]) => {
        if (!recordMap.has(id)) {
          recordMap.set(id, { id, categories: [], progress })
        }
        const record = recordMap.get(id)!
        record.categories.push('in progress')
        record.progress = progress
      })
    }
  } catch (error) {
    console.error('Failed to migrate bookmarks:', error)
  }

  // Migrate favorites
  try {
    const oldFavorites = localStorage.getItem(OLD_FAVORITES_KEY)
    if (oldFavorites) {
      const favorites: string[] = JSON.parse(oldFavorites)
      favorites.forEach((id) => {
        if (!recordMap.has(id)) {
          recordMap.set(id, { id, categories: [], progress: 0 })
        }
        const record = recordMap.get(id)!
        if (!record.categories.includes('favorite')) {
          record.categories.push('favorite')
        }
      })
    }
  } catch (error) {
    console.error('Failed to migrate favorites:', error)
  }

  // Migrate hidden
  try {
    const oldHidden = localStorage.getItem(OLD_HIDDEN_KEY)
    if (oldHidden) {
      const hidden: string[] = JSON.parse(oldHidden)
      hidden.forEach((id) => {
        if (!recordMap.has(id)) {
          recordMap.set(id, { id, categories: [], progress: 0 })
        }
        const record = recordMap.get(id)!
        if (!record.categories.includes('hidden')) {
          record.categories.push('hidden')
        }
      })
    }
  } catch (error) {
    console.error('Failed to migrate hidden:', error)
  }

  return Array.from(recordMap.values())
}

export function useLibrary() {
  const [library, setLibrary] = useLocalStorage<BookRecord[]>(LIBRARY_KEY, [])
  const [favoriteAuthors, setFavoriteAuthors] = useLocalStorage<string[]>(FAVORITE_AUTHORS_KEY, [])
  const [migrated, setMigrated] = useState(false)

  // Run migration on first load
  useEffect(() => {
    if (!migrated && library.length === 0) {
      const existingNew = localStorage.getItem(LIBRARY_KEY)
      if (!existingNew) {
        // New schema doesn't exist, migrate old keys
        const migrated = migrateOldSchema()
        if (migrated.length > 0) {
          setLibrary(migrated)
        }
      }
      setMigrated(true)
    }
  }, [migrated, library.length, setLibrary])

  // Bookmarks (in progress) API
  const saveBookmark = useCallback(
    (bookId: string, charPos: number, totalChars?: number) => {
      setLibrary((prev) => {
        const existing = prev.find((r) => r.id === bookId)
        if (existing) {
          const cats = existing.categories || []
          return prev.map((r) =>
            r.id === bookId
              ? { ...r, progress: charPos, totalChars, categories: cats.includes('in progress') ? cats : [...cats, 'in progress'] }
              : r
          )
        }
        return [...prev, { id: bookId, categories: ['in progress'], progress: charPos, totalChars }]
      })
    },
    [setLibrary]
  )

  const getBookmark = useCallback(
    (bookId: string): number | null => {
      const record = library.find((r) => r.id === bookId && (r.categories || []).includes('in progress'))
      return record ? record.progress : null
    },
    [library]
  )

  const getBookProgress = useCallback(
    (bookId: string): { progress: number; totalChars?: number } | null => {
      const record = library.find((r) => r.id === bookId && (r.categories || []).includes('in progress'))
      return record ? { progress: record.progress, totalChars: record.totalChars } : null
    },
    [library]
  )

  const clearBookmark = useCallback(
    (bookId: string) => {
      setLibrary((prev) =>
        prev.map((r) =>
          r.id === bookId
            ? { ...r, categories: (r.categories || []).filter((c) => c !== 'in progress') }
            : r
        ).filter((r) => (r.categories || []).length > 0)
      )
    },
    [setLibrary]
  )

  // Favorites API
  const toggleFavorite = useCallback(
    (bookId: string) => {
      setLibrary((prev) => {
        const existing = prev.find((r) => r.id === bookId)
        if (existing) {
          const cats = existing.categories || []
          const isFav = cats.includes('favorite')
          const newCategories = isFav
            ? cats.filter((c) => c !== 'favorite')
            : [...cats, 'favorite']
          const updated: BookRecord = {
            ...existing,
            categories: newCategories as ('favorite' | 'in progress' | 'hidden')[],
          }
          return updated.categories.length > 0
            ? prev.map((r) => (r.id === bookId ? updated : r))
            : prev.filter((r) => r.id !== bookId)
        }
        return [...prev, { id: bookId, categories: ['favorite'], progress: 0 }]
      })
    },
    [setLibrary]
  )

  const isFavorite = useCallback(
    (bookId: string): boolean => {
      return library.some((r) => r.id === bookId && (r.categories || []).includes('favorite'))
    },
    [library]
  )

  const getFavorites = useCallback((): string[] => {
    return library
      .filter((r) => (r.categories || []).includes('favorite'))
      .map((r) => r.id)
  }, [library])

  // Hidden API
  const toggleHidden = useCallback(
    (bookId: string) => {
      setLibrary((prev) => {
        const existing = prev.find((r) => r.id === bookId)
        if (existing) {
          const cats = existing.categories || []
          const isHid = cats.includes('hidden')
          let newCategories: ('favorite' | 'in progress' | 'hidden')[]
          if (isHid) {
            newCategories = cats.filter((c) => c !== 'hidden')
          } else {
            newCategories = ['hidden']
          }
          const updated: BookRecord = {
            ...existing,
            categories: newCategories,
          }
          return updated.categories.length > 0
            ? prev.map((r) => (r.id === bookId ? updated : r))
            : prev.filter((r) => r.id !== bookId)
        }
        return [...prev, { id: bookId, categories: ['hidden'], progress: 0 }]
      })
    },
    [setLibrary]
  )

  const isHidden = useCallback(
    (bookId: string): boolean => {
      return library.some((r) => r.id === bookId && (r.categories || []).includes('hidden'))
    },
    [library]
  )

  const getHidden = useCallback((): string[] => {
    return library
      .filter((r) => (r.categories || []).includes('hidden'))
      .map((r) => r.id)
  }, [library])

  // State queries
  const getInProgress = useCallback((): string[] => {
    return library
      .filter((r) => (r.categories || []).includes('in progress'))
      .map((r) => r.id)
  }, [library])

  // Favorite Authors API
  const toggleFavoriteAuthor = useCallback(
    (authorId: string) => {
      setFavoriteAuthors((prev) => {
        const index = prev.indexOf(authorId);
        if (index > -1) {
          return prev.filter((id) => id !== authorId);
        } else {
          return [...prev, authorId];
        }
      });
    },
    [setFavoriteAuthors]
  );

  const isFavoriteAuthor = useCallback(
    (authorId: string): boolean => {
      return favoriteAuthors.includes(authorId);
    },
    [favoriteAuthors]
  );

  const getFavoriteAuthors = useCallback(
    (): string[] => {
      return favoriteAuthors;
    },
    [favoriteAuthors]
  );

  return {
    library,
    saveBookmark,
    getBookmark,
    getBookProgress,
    clearBookmark,
    toggleFavorite,
    isFavorite,
    getFavorites,
    toggleHidden,
    isHidden,
    getHidden,
    getInProgress,
    toggleFavoriteAuthor,
    isFavoriteAuthor,
    getFavoriteAuthors,
  }
}
