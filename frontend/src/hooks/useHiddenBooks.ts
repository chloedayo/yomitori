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
    }
  }

  const isHidden = (bookId: string): boolean => {
    return getHidden().includes(bookId.toString())
  }

  return { getHidden, toggleHidden, isHidden }
}
