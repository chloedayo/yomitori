import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown, type MarkdownStorage } from 'tiptap-markdown'
import { AnnotationSettings } from '../hooks/useAnnotationSettings'

import type { Editor } from '@tiptap/react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkdown(editor: Editor | null): string {
  return ((editor?.storage as any)?.markdown as MarkdownStorage | undefined)?.getMarkdown() ?? ''
}

interface AnnotationEditorProps {
  body: string
  onBodyChange: (body: string) => void
  settings: AnnotationSettings
}

export function AnnotationEditor({
  body,
  onBodyChange,
  settings,
}: AnnotationEditorProps) {
  const lastEmittedRef = useRef(body)

  const previewStyle: React.CSSProperties = settings.contentColorsEnabled
    ? {
        '--ap-h1': settings.contentColors.h1,
        '--ap-h2': settings.contentColors.h2,
        '--ap-h3': settings.contentColors.h3,
        '--ap-strong': settings.contentColors.strong,
        '--ap-em': settings.contentColors.em,
        '--ap-code': settings.contentColors.code,
        '--ap-blockquote': settings.contentColors.blockquote,
        '--ap-a': settings.contentColors.a,
      } as React.CSSProperties
    : {}

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write your annotation in markdown…' }),
      Markdown.configure({ transformPastedText: true }),
    ],
    content: body,
    onUpdate: ({ editor }) => {
      const md = getMarkdown(editor)
      lastEmittedRef.current = md
      onBodyChange(md)
    },
  })

  // Sync external body changes (e.g. initialBody from DefinitionPopup)
  useEffect(() => {
    if (editor && body !== lastEmittedRef.current) {
      editor.commands.setContent(body)
      lastEmittedRef.current = body
    }
  }, [body, editor])

  return (
    <div className="annotation-editor">
      <div className="annotation-editor__editor-wrap" style={previewStyle}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
