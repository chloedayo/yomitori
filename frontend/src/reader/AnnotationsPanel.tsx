import { useState, useEffect, useRef } from 'react'
import SaveIcon from '@mui/icons-material/Save'
import MenuIcon from '@mui/icons-material/Menu'
import { Annotation } from '../services/annotationStore'
import { AnnotationEditor } from './AnnotationEditor'
import { AnnotationSettings } from '../hooks/useAnnotationSettings'
import './AnnotationsPanel.scss'

interface AnnotationsPanelProps {
  annotations: Annotation[]
  dirtyCount: number
  syncing: boolean
  totalChars: number
  currentCharPos: number
  settings: AnnotationSettings
  initialBody?: string
  onInitialBodyConsumed?: () => void
  onClose: () => void
  onCreate: (title: string, body: string, charPos: number) => Promise<void>
  onUpdate: (id: string, title: string, body: string, charPos: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSave: () => Promise<void>
  onJumpTo: (charPos: number) => void
}

export function AnnotationsPanel({
  annotations,
  syncing,
  totalChars,
  settings,
  initialBody,
  onInitialBodyConsumed,
  onClose,
  onCreate,
  onUpdate,
  onSave,
  onJumpTo,
}: AnnotationsPanelProps) {
  const primaryNote = annotations[0] ?? null
  const oldNotes = annotations.slice(1)

  const [body, setBody] = useState(primaryNote?.body ?? '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isDirty = body !== (primaryNote?.body ?? '')

  // Sync primary note when it changes from outside
  useEffect(() => {
    setBody(primaryNote?.body ?? '')
  }, [primaryNote?.id])

  // Append initialBody (from DefinitionPopup +Note)
  useEffect(() => {
    if (initialBody) {
      setBody(prev => prev ? `${prev}\n\n${initialBody}` : initialBody)
      onInitialBodyConsumed?.()
    }
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (primaryNote) {
        await onUpdate(primaryNote.id, primaryNote.title || '', body, 0)
      } else {
        await onCreate('', body, 0)
      }
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  const posPercent = (charPos: number) =>
    Math.round((Math.abs(charPos) / (totalChars || 1)) * 100)

  return (
    <div className="annotations-panel">
      <div className="annotations-panel__header">
        <h2>Notes</h2>
        <div className="annotations-panel__header-actions">
          {oldNotes.length > 0 && (
            <div className="annotations-panel__menu-wrap" ref={menuRef}>
              <button
                className="annotations-panel__menu-btn"
                onClick={() => setMenuOpen(p => !p)}
                title="Previous notes"
              >
                <MenuIcon fontSize="small" />
              </button>
              {menuOpen && (
                <div className="annotations-panel__menu-dropdown">
                  {oldNotes.map(note => (
                    <div
                      key={note.id}
                      className="annotations-panel__menu-item"
                      onClick={() => { onJumpTo(note.charPos); setMenuOpen(false) }}
                    >
                      <span className="annotations-panel__menu-item-title">
                        {note.title || note.body.slice(0, 40) || '(empty)'}
                      </span>
                      <span className="annotations-panel__menu-item-pos">
                        {posPercent(note.charPos)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            className={`annotations-panel__save-btn${isDirty ? ' annotations-panel__save-btn--dirty' : ''}`}
            onClick={handleSave}
            disabled={syncing || saving || !isDirty}
          >
            <SaveIcon fontSize="small" />
            Save Changes
          </button>
          <button className="annotations-panel__close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="annotations-panel__body">
        <AnnotationEditor
          body={body}
          onBodyChange={setBody}
          settings={settings}
        />
      </div>
    </div>
  )
}
