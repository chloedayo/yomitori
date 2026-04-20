import { useState, useCallback } from 'react'

export interface AnnotationContentColors {
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
  contentColorsEnabled: boolean
  contentColors: AnnotationContentColors
}

const SETTINGS_KEY = 'yomitori-annotation-settings'

const DEFAULT: AnnotationSettings = {
  contentColorsEnabled: false,
  contentColors: {
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
    const stored = JSON.parse(raw)
    // Migrate old previewColors* keys
    const migrated: Partial<AnnotationSettings> = {}
    if ('previewColorsEnabled' in stored) migrated.contentColorsEnabled = stored.previewColorsEnabled
    if ('previewColors' in stored) migrated.contentColors = stored.previewColors
    return { ...DEFAULT, ...migrated, ...('contentColorsEnabled' in stored ? stored : {}) }
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
