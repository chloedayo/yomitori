import JSZip from 'jszip'

interface SpineItem {
  id: string
  href: string
  mediaType: string
}

interface EpubMetadata {
  title: string
  author: string
}

interface ParsedEpub {
  metadata: EpubMetadata
  content: string
  totalChars: number
}

export async function parseEpub(blob: Blob): Promise<ParsedEpub> {
  const zip = new JSZip()
  await zip.loadAsync(blob)

  // Find rootfile path from container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXml) {
    throw new Error('Missing META-INF/container.xml')
  }

  const rootfileMatch = containerXml.match(/full-path="([^"]+)"/)
  const rootfilePath = rootfileMatch?.[1] || 'content.opf'

  // Parse content.opf
  const opfContent = await zip.file(rootfilePath)?.async('text')
  if (!opfContent) {
    throw new Error('Missing content.opf')
  }

  const parser = new DOMParser()
  const opfDoc = parser.parseFromString(opfContent, 'application/xml')

  // Extract metadata
  const titleEl = opfDoc.querySelector('dc\\:title, title')
  const title = titleEl?.textContent || 'Unknown'

  const authorEl = opfDoc.querySelector('dc\\:creator, creator')
  const author = authorEl?.textContent || 'Unknown'

  // Extract spine (reading order)
  const manifest = new Map<string, SpineItem>()
  opfDoc.querySelectorAll('item').forEach((item) => {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    const mediaType = item.getAttribute('media-type')
    if (id && href) {
      manifest.set(id, { id, href, mediaType: mediaType || 'text/html' })
    }
  })

  const spine: SpineItem[] = []
  opfDoc.querySelectorAll('itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref')
    if (idref && manifest.has(idref)) {
      spine.push(manifest.get(idref)!)
    }
  })

  // Get rootfile directory for resolving relative paths
  const rootDir = rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1)

  // Extract and combine content
  let combinedHtml = '<div style="display: contents;">'
  let totalChars = 0

  for (const item of spine) {
    if (!item.mediaType.includes('html') && !item.mediaType.includes('xhtml')) {
      continue
    }

    const filePath = rootDir + item.href
    const content = await zip.file(filePath)?.async('text')
    if (!content) continue

    // Parse HTML and extract body
    const htmlDoc = parser.parseFromString(content, 'text/html')
    const body = htmlDoc.body

    if (body) {
      // Clone body and strip all styles
      const bodyClone = body.cloneNode(true) as HTMLElement

      // Strip styles and classes
      const allElements = bodyClone.querySelectorAll('*')
      allElements.forEach((el) => {
        el.removeAttribute('style')
        el.removeAttribute('class')
      })

      // Remove empty elements (but keep images and headers)
      const elementsToRemove: Element[] = []
      allElements.forEach((el) => {
        const isImage = el.tagName.toLowerCase() === 'img'
        const isHeader = /^h[1-6]$/i.test(el.tagName)
        const hasText = (el.textContent?.trim() || '').length > 0
        const hasImageChild = el.querySelector('img') !== null

        if (!isImage && !isHeader && !hasText && !hasImageChild) {
          elementsToRemove.push(el)
        }
      })

      elementsToRemove.forEach((el) => {
        el.remove()
      })

      const bodyContent = bodyClone.innerHTML
      combinedHtml += `<div class="epub-chapter">${bodyContent}</div>`
      totalChars += body.textContent?.length || 0
    }
  }

  combinedHtml += '</div>'

  return {
    metadata: { title, author },
    content: combinedHtml,
    totalChars
  }
}
