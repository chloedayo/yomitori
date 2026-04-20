import { useRef, useCallback, useState } from 'react'
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

// Cursor line: keep raw chars, just apply colors
function renderLineRaw(line: string, colors: AnnotationSettings['editorColors']): string {
  const escaped = escapeHtml(line)
  if (/^#{1,3} /.test(line)) return `<span style="color:${colors.heading}">${escaped}</span>`
  if (/^> /.test(line)) return `<span style="color:${colors.blockquote}">${escaped}</span>`
  let out = escaped
  out = out.replace(/\*\*(.+?)\*\*/g, `<span style="color:${colors.bold}">**$1**</span>`)
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, `<span style="color:${colors.italic}">*$1*</span>`)
  out = out.replace(/`([^`]+)`/g, `<span style="color:${colors.code}">\`$1\`</span>`)
  return out
}

// Apply inline renders — replace syntax chars with spaces (same char count, monospace-safe)
function applyInline(escaped: string, colors: AnnotationSettings['editorColors']): string {
  let out = escaped
  // **bold** → "  bold  " (2 spaces each side, same char count)
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, (_, c) =>
    `<strong style="color:${colors.bold}">  ${c}  </strong>`)
  // *italic* → " italic " (1 space each side)
  out = out.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, (_, c) =>
    `<em style="color:${colors.italic}"> ${c} </em>`)
  // `code` → " code " (1 space each side)
  out = out.replace(/`([^`\n]+)`/g, (_, c) =>
    `<code style="color:${colors.code}"> ${c} </code>`)
  return out
}

// Non-cursor line: hide syntax markers with equal-width spaces
function renderLineInPlace(line: string, colors: AnnotationSettings['editorColors']): string {
  // Heading: "## text" → "   text" (## + space → spaces, same count)
  const headingMatch = line.match(/^(#{1,3}) (.*)/)
  if (headingMatch) {
    const pad = ' '.repeat(headingMatch[1].length + 1)
    const content = applyInline(escapeHtml(headingMatch[2]), colors)
    return `<span>${pad}</span><strong style="color:${colors.heading}">${content}</strong>`
  }
  // Blockquote: "> text" → "  text" ("> " → 2 spaces)
  const bqMatch = line.match(/^> (.*)/)
  if (bqMatch) {
    const content = applyInline(escapeHtml(bqMatch[1]), colors)
    return `<span>  </span><span style="color:${colors.blockquote}">${content}</span>`
  }
  return applyInline(escapeHtml(line), colors)
}

function buildOverlay(text: string, cursorLine: number, colors: AnnotationSettings['editorColors']): string {
  return text
    .split('\n')
    .map((line, i) =>
      i === cursorLine ? renderLineRaw(line, colors) : renderLineInPlace(line, colors)
    )
    .join('\n') + '\n'
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
  const [cursorLine, setCursorLine] = useState(-1)

  const updateCursorLine = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const linesBefore = ta.value.substring(0, ta.selectionStart).split('\n')
    setCursorLine(linesBefore.length - 1)
  }, [])

  const handleScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const overlayHtml = buildOverlay(body, cursorLine, settings.editorColors)

  return (
    <div className="annotation-editor">
      <input
        className="annotation-editor__title"
        type="text"
        placeholder="Title"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
      />

      <div className="annotation-editor__editor-wrap">
        <div
          ref={overlayRef}
          className="annotation-editor__overlay"
          dangerouslySetInnerHTML={{ __html: overlayHtml }}
          aria-hidden
        />
        <textarea
          ref={textareaRef}
          className="annotation-editor__textarea annotation-editor__textarea--highlighted"
          value={body}
          onChange={e => { onBodyChange(e.target.value); updateCursorLine() }}
          onKeyUp={updateCursorLine}
          onClick={updateCursorLine}
          onSelect={updateCursorLine}
          onFocus={updateCursorLine}
          onBlur={() => setCursorLine(-1)}
          onScroll={handleScroll}
          placeholder="Write your annotation in markdown..."
          spellCheck={false}
        />
      </div>
    </div>
  )
}
