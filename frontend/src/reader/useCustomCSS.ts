import { useEffect, useState } from 'react'

const STORAGE_KEY = 'yomitori-custom-css'

export function useCustomCSS() {
  const [css, setCSS] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setCSS(stored)
    }
  }, [])

  const validateCSS = (cssText: string): boolean => {
    try {
      const style = document.createElement('style')
      style.textContent = cssText
      document.head.appendChild(style)
      document.head.removeChild(style)
      return true
    } catch {
      return false
    }
  }

  const handleSaveCSS = (cssText: string): boolean => {
    setError(null)

    if (!cssText.trim()) {
      localStorage.removeItem(STORAGE_KEY)
      setCSS('')
      return true
    }

    if (!validateCSS(cssText)) {
      setError('Invalid CSS. Please check your syntax.')
      return false
    }

    localStorage.setItem(STORAGE_KEY, cssText)
    setCSS(cssText)
    return true
  }

  const handleReset = () => {
    setCSS('')
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    css,
    setCSS,
    error,
    setError,
    validateCSS,
    handleSaveCSS,
    handleReset,
  }
}
