import { useEffect, useState } from 'react'

const BOOKMARKS_KEY = 'yomitori-bookmarks'
const FAVORITES_KEY = 'yomitori-favorites'

export function useBookmark() {
  const [bookmarks, setBookmarks] = useState<Record<string, number>>({})
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    const storedFavs = localStorage.getItem(FAVORITES_KEY)

    if (stored) {
      try {
        setBookmarks(JSON.parse(stored))
      } catch {
        setBookmarks({})
      }
    }

    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs))
      } catch {
        setFavorites([])
      }
    }
  }, [])

  const saveBookmark = (bookId: string, charPos: number) => {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    const current = stored ? JSON.parse(stored) : {}
    const updated = { ...current, [bookId]: charPos }
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated))
    setBookmarks(updated)
  }

  const getBookmark = (bookId: string): number | null => {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    if (!stored) return null
    try {
      const bookmarks = JSON.parse(stored)
      return bookmarks[bookId] ?? null
    } catch {
      return null
    }
  }

  const clearBookmark = (bookId: string) => {
    setBookmarks((prev) => {
      const updated = { ...prev }
      delete updated[bookId]
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const toggleFavorite = (bookId: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const isFavorite = (bookId: string): boolean => {
    return favorites.includes(bookId)
  }

  return {
    bookmarks,
    favorites,
    saveBookmark,
    getBookmark,
    clearBookmark,
    toggleFavorite,
    isFavorite,
  }
}
