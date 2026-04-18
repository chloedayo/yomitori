export function useHiddenBooks() {
  const getHidden = (): string[] => {
    const stored = localStorage.getItem('yomitori-hidden-books')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  }

  const toggleHidden = (bookId: string) => {
    const hidden = getHidden()
    const bookIdStr = bookId.toString()

    if (hidden.includes(bookIdStr)) {
      const updated = hidden.filter((id) => id !== bookIdStr)
      localStorage.setItem('yomitori-hidden-books', JSON.stringify(updated))
    } else {
      hidden.push(bookIdStr)
      localStorage.setItem('yomitori-hidden-books', JSON.stringify(hidden))

      // Remove from bookmarks and favorites when hiding
      const bookmarks = JSON.parse(localStorage.getItem('yomitori-bookmarks') || '{}')
      if (bookmarks[bookIdStr]) {
        delete bookmarks[bookIdStr]
        localStorage.setItem('yomitori-bookmarks', JSON.stringify(bookmarks))
      }

      const favorites = JSON.parse(localStorage.getItem('yomitori-favorites') || '[]')
      const updatedFavorites = favorites.filter((id: string) => id !== bookIdStr)
      if (updatedFavorites.length !== favorites.length) {
        localStorage.setItem('yomitori-favorites', JSON.stringify(updatedFavorites))
      }
    }
  }

  const isHidden = (bookId: string): boolean => {
    return getHidden().includes(bookId.toString())
  }

  return { getHidden, toggleHidden, isHidden }
}
