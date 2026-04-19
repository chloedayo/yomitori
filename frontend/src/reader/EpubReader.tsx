import { useRef, useEffect, useState, forwardRef, useImperativeHandle, memo } from 'react'
import { useSwipeGesture } from './useSwipeGesture'
import { parseEpub } from './EpubParser'

interface EpubReaderProps {
  file: Blob
  fontSize: number
  onCharPosChange?: (pos: number) => void
  onTotalCharsChange?: (total: number) => void
  isVertical: boolean
  customCSS?: string
  scopeCSS?: (css: string) => string
}

export interface EpubReaderHandle {
  scrollToCharPos: (charPos: number) => void
}

export const EpubReader = memo(forwardRef<EpubReaderHandle, EpubReaderProps>(function EpubReader(
  {
    file,
    fontSize,
    onCharPosChange,
    onTotalCharsChange,
    isVertical,
    customCSS,
    scopeCSS,
  },
  ref
) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [totalChars, setTotalChars] = useState(0)
  const [_currentCharPos, _setCurrentCharPos] = useState(0)

  useImperativeHandle(ref, () => ({
    scrollToCharPos: (charPos: number) => {
      if (!contentRef.current) return

      const maxScroll = isVertical
        ? contentRef.current.scrollWidth - contentRef.current.clientWidth
        : contentRef.current.scrollHeight - contentRef.current.clientHeight

      const scrollPos = (charPos / (totalChars || 1)) * maxScroll

      if (isVertical) {
        contentRef.current.scrollLeft = scrollPos
      } else {
        contentRef.current.scrollTop = scrollPos
      }

      _setCurrentCharPos(charPos)
    },
  }))

  useEffect(() => {
    if (customCSS) {
      let styleElement = document.getElementById('custom-css') as HTMLStyleElement | null
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = 'custom-css'
        document.head.appendChild(styleElement)
      }
      const scopedCSS = scopeCSS ? scopeCSS(customCSS) : customCSS
      styleElement.textContent = scopedCSS
    }
  }, [customCSS, scopeCSS])

  useEffect(() => {
    const loadEpub = async () => {
      try {
        if (!contentRef.current) {
          console.warn('contentRef not available yet')
          return
        }

        const parsed = await parseEpub(file)

        if (contentRef.current) {
          contentRef.current.innerHTML = parsed.content
          setTotalChars(parsed.totalChars)
          onTotalCharsChange?.(parsed.totalChars)
          console.log('📖 EPUB loaded, total chars:', parsed.totalChars)
        }
      } catch (e) {
        console.error('Failed to load EPUB:', e)
        if (contentRef.current) {
          contentRef.current.innerHTML = `<p style="color: #ff6b6b;">Error loading EPUB: ${e instanceof Error ? e.message : 'Unknown error'}</p>`
        }
      }
    }

    loadEpub()
  }, [file])

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        let scrollPos: number
        let maxScroll: number

        if (isVertical) {
          scrollPos = contentRef.current.scrollLeft
          maxScroll = contentRef.current.scrollWidth - contentRef.current.clientWidth
        } else {
          scrollPos = contentRef.current.scrollTop
          maxScroll = contentRef.current.scrollHeight - contentRef.current.clientHeight
        }

        const scrollRatio = scrollPos / (maxScroll || 1)
        const approximateCharPos = Math.floor(totalChars * scrollRatio)
        _setCurrentCharPos(approximateCharPos)
        onCharPosChange?.(approximateCharPos)
      }
    }

    const element = contentRef.current
    element?.addEventListener('scroll', handleScroll)
    return () => element?.removeEventListener('scroll', handleScroll)
  }, [totalChars, isVertical])

  useEffect(() => {
    if (contentRef.current) {
      // Apply font size and line-height to all elements
      const allElements = contentRef.current.querySelectorAll('*')
      allElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          const isHeader = /^h[1-6]$/i.test(el.tagName)
          const isDiv = el.tagName.toLowerCase() === 'div'
          const isRuby = el.tagName.toLowerCase() === 'ruby' || el.tagName.toLowerCase() === 'rt'

          if (isHeader) {
            // For headers, 1.5x the size of normal text
            el.style.fontSize = `${fontSize * 1.5}px`

            // Apply spacing (left/right for vertical-RL)
            el.style.marginLeft = '4em'
            el.style.marginRight = '4em'
          } else if (isDiv) {
            // For divs, apply the same spacing as headers
            el.style.marginLeft = '4em'
            el.style.marginRight = '4em'
          } else if (isRuby) {
            // For ruby text, 0.5x the size of normal text
            el.style.fontSize = `${fontSize * 0.5}px`
          } else {
            // For regular text, use the fontSize directly
            el.style.fontSize = `${fontSize}px`
          }

          el.style.lineHeight = '2.0'
        }
      })
    }
  }, [fontSize])

  const handleNext = (swipeDistance: number) => {
    if (contentRef.current) {
      const scrollAmount = swipeDistance * 0.6
      if (isVertical) {
        contentRef.current.scrollLeft += scrollAmount
      } else {
        contentRef.current.scrollTop += scrollAmount
      }
    }
  }

  const handlePrev = (swipeDistance: number) => {
    if (contentRef.current) {
      const scrollAmount = swipeDistance * 0.6
      if (isVertical) {
        contentRef.current.scrollLeft -= scrollAmount
      } else {
        contentRef.current.scrollTop -= scrollAmount
      }
    }
  }

  useSwipeGesture(contentRef, {
    onSwipeRight: handlePrev,
    onSwipeLeft: handleNext,
  })

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!contentRef.current) return

      if (isVertical) {
        e.preventDefault()
        contentRef.current.scrollLeft -= e.deltaY * 1.5
      }
    }

    const element = contentRef.current
    element?.addEventListener('wheel', handleWheel, { passive: false })
    return () => element?.removeEventListener('wheel', handleWheel)
  }, [isVertical])

  return (
    <div
      ref={contentRef}
      className={`reader-text ${isVertical ? 'vertical-mode' : 'horizontal-mode'}`}
      style={{
        fontSize: `${fontSize}px`,
        textOrientation: 'mixed',
        color: '#ffffff',
        lineHeight: '2.0'
      }}
    />
  )
}))
