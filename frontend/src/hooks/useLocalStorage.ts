import { useState, useCallback } from 'react'

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
        } catch (error) {
          console.error(`Failed to save to localStorage[${key}]:`, error)
        }
        return next
      })
    },
    [key]
  )

  return [state, setValue] as const
}
