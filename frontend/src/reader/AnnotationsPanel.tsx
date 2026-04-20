import { useState, useCallback, useEffect } from 'react'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
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

interface EditorState {
  id: string | null
  title: string
  body: string
  charPos: number
}

export function AnnotationsPanel({
  annotations,
  dirtyCount,
  syncing,
  totalChars,
  currentCharPos,
  settings,
  initialBody,
  onInitialBodyConsumed,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onSave,
  onJumpTo,
}: AnnotationsPanelProps) {
  const [editor, setEditor] = useState<EditorState | null>(null)

  useEffect(() => {
    if (initialBody) {
      setEditor({ id: null, title: '', body: initialBody, charPos: currentCharPos })
      onInitialBodyConsumed?.()
    }
  }, [])

  const handleNew = useCallback(() => {
    setEditor({ id: null, title: '', body: '', charPos: currentCharPos })
  }, [currentCharPos])

  const handleEdit = useCallback((annotation: Annotation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditor({
      id: annotation.id,
      title: annotation.title,
      body: annotation.body,
      charPos: annotation.charPos,
    })
  }, [])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await onDelete(id)
    if (editor?.id === id) setEditor(null)
  }, [editor, onDelete])

  const handleSaveAnnotation = useCallback(async () => {
    if (!editor) return
    if (!editor.title.trim()) return
    if (editor.id === null) {
      await onCreate(editor.title, editor.body, editor.charPos)
    } else {
      await onUpdate(editor.id, editor.title, editor.body, editor.charPos)
    }
    setEditor(null)
  }, [editor, onCreate, onUpdate])

  const handleCancel = useCallback(() => setEditor(null), [])

  const posPercent = (charPos: number) =>
    Math.round((Math.abs(charPos) / (totalChars || 1)) * 100)

  return (
    <div className="annotations-panel">
        <div className="annotations-panel__header">
          <h2>Annotations {annotations.length > 0 && `(${annotations.length})`}</h2>
          <div className="annotations-panel__header-actions">
            <button
              className={`annotations-panel__save-btn${dirtyCount > 0 ? ' annotations-panel__save-btn--dirty' : ''}`}
              onClick={onSave}
              disabled={syncing || dirtyCount === 0}
              title="Save to server"
            >
              <SaveIcon fontSize="small" />
              {dirtyCount > 0 && (
                <span className="annotations-panel__dirty-badge">{dirtyCount}</span>
              )}
            </button>
            <button className="annotations-panel__close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="annotations-panel__body">
          {editor && (
            <div className="annotations-panel__editor-wrap">
              <AnnotationEditor
                title={editor.title}
                body={editor.body}
                onTitleChange={t => setEditor(prev => prev ? { ...prev, title: t } : null)}
                onBodyChange={b => setEditor(prev => prev ? { ...prev, body: b } : null)}
                settings={settings}
              />
              <div className="annotations-panel__editor-actions">
                <button className="annotations-panel__save-annotation-btn" onClick={handleSaveAnnotation}>
                  {editor.id === null ? 'Add' : 'Update'}
                </button>
                <button className="annotations-panel__cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!editor && (
            <button className="annotations-panel__new-btn" onClick={handleNew}>
              + New annotation at current position
            </button>
          )}

          <div className="annotations-panel__list">
            {annotations.length === 0 && !editor && (
              <div className="annotations-panel__empty">No annotations yet.</div>
            )}
            {annotations.map(annotation => (
              <div
                key={annotation.id}
                className="annotations-panel__item"
                onClick={() => onJumpTo(annotation.charPos)}
              >
                <div className="annotations-panel__item-main">
                  <div className="annotations-panel__item-title">{annotation.title}</div>
                  <div className="annotations-panel__item-pos">{posPercent(annotation.charPos)}%</div>
                </div>
                <div className="annotations-panel__item-actions">
                  <button
                    className="annotations-panel__icon-btn"
                    onClick={e => handleEdit(annotation, e)}
                    title="Edit"
                  >
                    <EditIcon fontSize="small" />
                  </button>
                  <button
                    className="annotations-panel__icon-btn annotations-panel__icon-btn--danger"
                    onClick={e => handleDelete(annotation.id, e)}
                    title="Delete"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  )
}
