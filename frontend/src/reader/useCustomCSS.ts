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

  const scopeCSS = (cssText: string): string => {
    const lines = cssText.split('\n')
    const scopedLines = lines.map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return line
      }
      if (trimmed.endsWith('{')) {
        const selector = trimmed.slice(0, -1).trim()
        if (selector && !selector.startsWith('@')) {
          return line.replace(selector, `.reader-content ${selector}`)
        }
      }
      return line
    })
    return scopedLines.join('\n')
  }

  const validateCSS = (cssText: string): boolean => {
    try {
      const scopedCSS = scopeCSS(cssText)
      const style = document.createElement('style')
      style.textContent = scopedCSS
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
    scopeCSS,
    handleSaveCSS,
    handleReset,
  }
}
