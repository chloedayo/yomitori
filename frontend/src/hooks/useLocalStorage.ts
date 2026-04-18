import { useState, useCallback, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
          // Dispatch custom event for cross-instance sync
          window.dispatchEvent(
            new CustomEvent('storage-change', {
              detail: { key, value: next },
            })
          )
        } catch (error) {
          console.error(`Failed to save to localStorage[${key}]:`, error)
        }
        return next
      })
    },
    [key]
  )

  // Listen for storage changes from other instances
  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      const event = e as CustomEvent
      if (event.detail.key === key) {
        setState(event.detail.value)
      }
    }

    window.addEventListener('storage-change', handleStorageChange)
    return () => window.removeEventListener('storage-change', handleStorageChange)
  }, [key])

  return [state, setValue] as const
}
