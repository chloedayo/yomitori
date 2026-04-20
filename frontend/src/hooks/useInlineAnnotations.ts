import { useState, useCallback, useEffect } from 'react'
import {
  InlineAnnotation,
  getInlineAnnotationsByBookId,
  saveInlineAnnotation,
  updateInlineAnnotation,
  deleteInlineAnnotation,
} from '../services/inlineAnnotationStore'

export type { InlineAnnotation }

export interface InlineAnnotationEditRequest {
  id: string
  currentText: string
  rect: { left: number; right: number; top: number; bottom: number }
}

export function useInlineAnnotations(bookId: string | null) {
  const [annotations, setAnnotations] = useState<InlineAnnotation[]>([])

  useEffect(() => {
    if (!bookId) { setAnnotations([]); return }
    getInlineAnnotationsByBookId(bookId).then(setAnnotations).catch(() => {})
  }, [bookId])

  const createAnnotation = useCallback(async (
    selectedText: string,
    noteText: string,
    charPos: number
  ): Promise<InlineAnnotation> => {
    if (!bookId) throw new Error('No bookId')
    const annotation: InlineAnnotation = {
      id: crypto.randomUUID(),
      bookId,
      selectedText,
      noteText,
      charPos,
      createdAt: Date.now(),
    }
    await saveInlineAnnotation(annotation)
    setAnnotations(prev => [...prev, annotation])
    return annotation
  }, [bookId])

  const editAnnotation = useCallback(async (id: string, noteText: string) => {
    await updateInlineAnnotation(id, noteText)
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, noteText } : a))
  }, [])

  const removeAnnotation = useCallback(async (id: string) => {
    await deleteInlineAnnotation(id)
    setAnnotations(prev => prev.filter(a => a.id !== id))
  }, [])

  return { annotations, createAnnotation, editAnnotation, removeAnnotation }
}

// Collect all text nodes (skipping rt/rp and already-injected annotations)
function collectTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let el = node.parentElement
      while (el && el !== root) {
        const tag = el.tagName.toUpperCase()
        if (tag === 'RT' || tag === 'RP') return NodeFilter.FILTER_REJECT
        if (el.classList.contains('epub-inline-annotation')) return NodeFilter.FILTER_REJECT
        el = el.parentElement
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const nodes: Array<{ node: Text; start: number }> = []
  let fullText = ''
  let n: Node | null
  while ((n = walker.nextNode())) {
    nodes.push({ node: n as Text, start: fullText.length })
    fullText += (n as Text).data
  }
  return { nodes, fullText }
}

// Walk up to the highest inline ancestor that is a direct child of a block element
function findInlineRoot(node: Node, root: HTMLElement): Node {
  let cur: Node = node
  while (cur.parentNode && cur.parentNode !== root) {
    const parent = cur.parentNode as HTMLElement
    const tag = parent.tagName?.toUpperCase()
    if (tag === 'P' || tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'BODY') break
    cur = parent
  }
  return cur
}

export function injectInlineAnnotation(
  root: HTMLElement,
  ann: InlineAnnotation,
  onDismiss?: (id: string) => void,
  onEdit?: (req: InlineAnnotationEditRequest) => void
): boolean {
  if (root.querySelector(`[data-annotation-id="${ann.id}"]`)) return true

  const { nodes, fullText } = collectTextNodes(root)
  const idx = fullText.indexOf(ann.selectedText)
  if (idx === -1) return false

  let targetNode: Text | null = null
  let localOffset = 0
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].start <= idx) {
      targetNode = nodes[i].node
      localOffset = idx - nodes[i].start
      break
    }
  }
  if (!targetNode) return false

  const afterNode = targetNode.splitText(localOffset)
  const insertBefore = findInlineRoot(afterNode, root)

  const marker = document.createElement('span')
  marker.className = 'epub-inline-annotation'
  marker.dataset.annotationId = ann.id

  const dismissBtn = document.createElement('button')
  dismissBtn.className = 'epub-inline-annotation__dismiss'
  dismissBtn.textContent = '×'
  dismissBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    e.preventDefault()
    marker.remove()
    onDismiss?.(ann.id)
  })
  marker.appendChild(dismissBtn)

  const label = document.createElement('span')
  label.className = 'epub-inline-annotation__text'
  label.textContent = ann.noteText
  label.addEventListener('click', (e) => {
    e.stopPropagation()
    const r = marker.getBoundingClientRect()
    onEdit?.({ id: ann.id, currentText: label.textContent ?? '', rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom } })
  })
  marker.appendChild(label)

  insertBefore.parentNode?.insertBefore(marker, insertBefore)
  return true
}

export function injectAllInlineAnnotations(
  root: HTMLElement,
  annotations: InlineAnnotation[],
  onDismiss?: (id: string) => void,
  onEdit?: (req: InlineAnnotationEditRequest) => void
) {
  const sorted = [...annotations].sort((a, b) => a.charPos - b.charPos)
  for (const ann of sorted) {
    injectInlineAnnotation(root, ann, onDismiss, onEdit)
  }
}
