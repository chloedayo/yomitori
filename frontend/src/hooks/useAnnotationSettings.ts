import { useState, useCallback } from 'react'

export interface AnnotationEditorColors {
  heading: string
  bold: string
  italic: string
  code: string
  link: string
  blockquote: string
}

export interface AnnotationPreviewColors {
  h1: string
  h2: string
  h3: string
  strong: string
  em: string
  code: string
  blockquote: string
  a: string
}

export interface AnnotationSettings {
  editorHighlightEnabled: boolean
  editorColors: AnnotationEditorColors
  previewColorsEnabled: boolean
  previewColors: AnnotationPreviewColors
}

const SETTINGS_KEY = 'yomitori-annotation-settings'

const DEFAULT: AnnotationSettings = {
  editorHighlightEnabled: false,
  editorColors: {
    heading: '#7eb8da',
    bold: '#e0c97f',
    italic: '#b8e0c9',
    code: '#da8c7e',
    link: '#8cb8e0',
    blockquote: '#9e9e9e',
  },
  previewColorsEnabled: false,
  previewColors: {
    h1: '#7eb8da',
    h2: '#7eb8da',
    h3: '#7eb8da',
    strong: '#e0c97f',
    em: '#b8e0c9',
    code: '#da8c7e',
    blockquote: '#9e9e9e',
    a: '#8cb8e0',
  },
}

function load(): AnnotationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT
  }
}

export function useAnnotationSettings() {
  const [settings, setSettings] = useState<AnnotationSettings>(load)

  const updateSettings = useCallback((patch: Partial<AnnotationSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { settings, updateSettings }
}
