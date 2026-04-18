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

  const saveCSSToShadowDOM = (shadowRoot: ShadowRoot, cssText: string) => {
    let styleElement = shadowRoot.getElementById('custom-css') as HTMLStyleElement | null

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = 'custom-css'
      shadowRoot.appendChild(styleElement)
    }

    styleElement.textContent = cssText
  }

  const handleSaveCSS = (cssText: string, shadowRoot: ShadowRoot | null): boolean => {
    setError(null)

    if (!cssText.trim()) {
      if (shadowRoot) {
        const styleElement = shadowRoot.getElementById('custom-css')
        if (styleElement) styleElement.textContent = ''
      }
      localStorage.removeItem(STORAGE_KEY)
      setCSS('')
      return true
    }

    if (!validateCSS(cssText)) {
      setError('Invalid CSS. Please check your syntax.')
      return false
    }

    if (shadowRoot) {
      saveCSSToShadowDOM(shadowRoot, cssText)
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
    saveCSSToShadowDOM,
    handleSaveCSS,
    handleReset,
  }
}
