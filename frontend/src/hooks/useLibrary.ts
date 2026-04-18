import { useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type BookRecord = {
  id: string
  category: 'favorite' | 'in progress' | 'hidden'
  progress: number
}

const LIBRARY_KEY = 'yomitori-library'
const OLD_BOOKMARKS_KEY = 'yomitori-bookmarks'
const OLD_FAVORITES_KEY = 'yomitori-favorites'
const OLD_HIDDEN_KEY = 'yomitori-hidden-books'

function migrateOldSchema(): BookRecord[] {
  const records: BookRecord[] = []

  // Migrate bookmarks (in progress)
  try {
    const oldBookmarks = localStorage.getItem(OLD_BOOKMARKS_KEY)
    if (oldBookmarks) {
      const bookmarks: Record<string, number> = JSON.parse(oldBookmarks)
      Object.entries(bookmarks).forEach(([id, progress]) => {
        records.push({ id, category: 'in progress', progress })
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
        // Check if already exists as in-progress
        const existing = records.find((r) => r.id === id && r.category === 'in progress')
        if (existing) {
          // Don't duplicate, just mark as favorite separately
        }
        records.push({ id, category: 'favorite', progress: 0 })
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
        records.push({ id, category: 'hidden', progress: 0 })
      })
    }
  } catch (error) {
    console.error('Failed to migrate hidden:', error)
  }

  return records
}

export function useLibrary() {
  const [library, setLibrary] = useLocalStorage<BookRecord[]>(LIBRARY_KEY, [])
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
    (bookId: string, charPos: number) => {
      setLibrary((prev) => {
        const existing = prev.find((r) => r.id === bookId && r.category === 'in progress')
        if (existing) {
          return prev.map((r) =>
            r.id === bookId && r.category === 'in progress' ? { ...r, progress: charPos } : r
          )
        }
        return [...prev, { id: bookId, category: 'in progress', progress: charPos }]
      })
    },
    [setLibrary]
  )

  const getBookmark = useCallback(
    (bookId: string): number | null => {
      const record = library.find((r) => r.id === bookId && r.category === 'in progress')
      return record ? record.progress : null
    },
    [library]
  )

  const clearBookmark = useCallback(
    (bookId: string) => {
      setLibrary((prev) => prev.filter((r) => !(r.id === bookId && r.category === 'in progress')))
    },
    [setLibrary]
  )

  // Favorites API
  const toggleFavorite = useCallback(
    (bookId: string) => {
      setLibrary((prev) => {
        const hasFavorite = prev.some((r) => r.id === bookId && r.category === 'favorite')
        if (hasFavorite) {
          return prev.filter((r) => !(r.id === bookId && r.category === 'favorite'))
        }
        return [...prev, { id: bookId, category: 'favorite', progress: 0 }]
      })
    },
    [setLibrary]
  )

  const isFavorite = useCallback(
    (bookId: string): boolean => {
      return library.some((r) => r.id === bookId && r.category === 'favorite')
    },
    [library]
  )

  const getFavorites = useCallback((): string[] => {
    return library
      .filter((r) => r.category === 'favorite')
      .map((r) => r.id)
  }, [library])

  // Hidden API
  const toggleHidden = useCallback(
    (bookId: string) => {
      setLibrary((prev) => {
        const isHidden = prev.some((r) => r.id === bookId && r.category === 'hidden')
        if (isHidden) {
          return prev.filter((r) => !(r.id === bookId && r.category === 'hidden'))
        }
        // Remove from other categories when hiding
        const filtered = prev.filter((r) => r.id !== bookId)
        return [...filtered, { id: bookId, category: 'hidden', progress: 0 }]
      })
    },
    [setLibrary]
  )

  const isHidden = useCallback(
    (bookId: string): boolean => {
      return library.some((r) => r.id === bookId && r.category === 'hidden')
    },
    [library]
  )

  const getHidden = useCallback((): string[] => {
    return library
      .filter((r) => r.category === 'hidden')
      .map((r) => r.id)
  }, [library])

  // State queries
  const getInProgress = useCallback((): string[] => {
    return library
      .filter((r) => r.category === 'in progress')
      .map((r) => r.id)
  }, [library])

  return {
    library,
    saveBookmark,
    getBookmark,
    clearBookmark,
    toggleFavorite,
    isFavorite,
    getFavorites,
    toggleHidden,
    isHidden,
    getHidden,
    getInProgress,
  }
}
