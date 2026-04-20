import { useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { AnnotationSettings } from '../hooks/useAnnotationSettings'

interface AnnotationEditorProps {
  title: string
  body: string
  onTitleChange: (title: string) => void
  onBodyChange: (body: string) => void
  settings: AnnotationSettings
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightMarkdown(text: string, colors: AnnotationSettings['editorColors']): string {
  return text
    .split('\n')
    .map(line => {
      const escaped = escapeHtml(line)
      if (/^#{1,3}\s/.test(line)) {
        return `<span style="color:${colors.heading}">${escaped}</span>`
      }
      if (/^>\s/.test(line)) {
        return `<span style="color:${colors.blockquote}">${escaped}</span>`
      }
      let out = escaped
      out = out.replace(/\*\*(.+?)\*\*/g, `<span style="color:${colors.bold}">**$1**</span>`)
      out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, `<span style="color:${colors.italic}">*$1*</span>`)
      out = out.replace(/`([^`]+)`/g, `<span style="color:${colors.code}">\`$1\`</span>`)
      out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, (m) => `<span style="color:${colors.link}">${escapeHtml(m)}</span>`)
      return out
    })
    .join('\n')
}

export function AnnotationEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
  settings,
}: AnnotationEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const previewStyle: React.CSSProperties = settings.previewColorsEnabled
    ? {
        '--ap-h1': settings.previewColors.h1,
        '--ap-h2': settings.previewColors.h2,
        '--ap-h3': settings.previewColors.h3,
        '--ap-strong': settings.previewColors.strong,
        '--ap-em': settings.previewColors.em,
        '--ap-code': settings.previewColors.code,
        '--ap-blockquote': settings.previewColors.blockquote,
        '--ap-a': settings.previewColors.a,
      } as React.CSSProperties
    : {}

  const highlightedHtml = settings.editorHighlightEnabled
    ? highlightMarkdown(body, settings.editorColors)
    : null

  return (
    <div className="annotation-editor">
      <input
        className="annotation-editor__title"
        type="text"
        placeholder="Title"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
      />

      <div className="annotation-editor__split">
        <div className="annotation-editor__editor-wrap">
          {highlightedHtml !== null && (
            <div
              ref={overlayRef}
              className="annotation-editor__overlay"
              dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
              aria-hidden
            />
          )}
          <textarea
            ref={textareaRef}
            className={`annotation-editor__textarea${highlightedHtml !== null ? ' annotation-editor__textarea--highlighted' : ''}`}
            value={body}
            onChange={e => onBodyChange(e.target.value)}
            onScroll={handleScroll}
            placeholder="Write your annotation in markdown..."
            spellCheck={false}
          />
        </div>

        <div className="annotation-editor__preview" style={previewStyle}>
          {body.trim() ? (
            <ReactMarkdown>{body}</ReactMarkdown>
          ) : (
            <span className="annotation-editor__preview-placeholder">Preview</span>
          )}
        </div>
      </div>
    </div>
  )
}
