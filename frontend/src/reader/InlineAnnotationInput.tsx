import { useState, useRef, useLayoutEffect, useEffect, KeyboardEvent } from 'react'
import { SelectionRect } from './useSelectionDefinition'
import './InlineAnnotationInput.css'

interface InlineAnnotationInputProps {
  rect: SelectionRect
  rawText: string
  isVertical: boolean
  initialText?: string
  onSave: (text: string) => void
  onCancel: () => void
}

export function InlineAnnotationInput({ rect, rawText, isVertical, initialText, onSave, onCancel }: InlineAnnotationInputProps) {
  const [text, setText] = useState(initialText ?? '')
  const wrapRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pw = el.offsetWidth
    const ph = el.offsetHeight

    let left: number
    let top: number

    if (isVertical) {
      left = rect.left - pw - 10
      if (left < 8) left = rect.right + 10
      if (left + pw > vw - 8) left = 8
      top = rect.top
      if (top + ph > vh - 8) top = vh - ph - 8
      if (top < 8) top = 8
    } else {
      left = rect.left + (rect.right - rect.left) / 2 - pw / 2
      top = rect.bottom + 10
      if (top + ph > vh - 8) top = rect.top - ph - 10
      if (left + pw > vw - 8) left = vw - pw - 8
      if (left < 8) left = 8
    }

    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.visibility = 'visible'
  }, [rect, isVertical])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onCancel])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim()) onSave(text.trim())
    }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div ref={wrapRef} className="inline-annotation-input">
      <div className="inline-annotation-input__label">
        <em>{rawText.slice(0, 40)}{rawText.length > 40 ? '…' : ''}</em>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Annotation… (Enter to save, Shift+Enter for newline)"
        rows={2}
        className="inline-annotation-input__textarea"
      />
      <div className="inline-annotation-input__actions">
        <button onClick={onCancel} className="inline-annotation-input__cancel">Cancel</button>
        <button
          onClick={() => text.trim() && onSave(text.trim())}
          disabled={!text.trim()}
          className="inline-annotation-input__save"
        >Add</button>
      </div>
    </div>
  )
}
