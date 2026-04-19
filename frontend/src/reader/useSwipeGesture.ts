import { useRef, useEffect } from 'react'

interface SwipeGestureOptions {
  threshold?: number
  onSwipeLeft?: (distance: number) => void
  onSwipeRight?: (distance: number) => void
}

export function useSwipeGesture(
  elementRef: React.RefObject<HTMLElement>,
  options: SwipeGestureOptions = {}
) {
  const { threshold = 50, onSwipeLeft, onSwipeRight } = options
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const mouseDown = useRef(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      handleSwipe(touchStartX.current, touchStartY.current, touchEndX, touchEndY)
    }

    const handleMouseDown = (e: MouseEvent) => {
      mouseDown.current = true
      touchStartX.current = e.clientX
      touchStartY.current = e.clientY
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!mouseDown.current) return
      mouseDown.current = false
      const touchEndX = e.clientX
      const touchEndY = e.clientY
      handleSwipe(touchStartX.current, touchStartY.current, touchEndX, touchEndY)
    }

    const handleSwipe = (startX: number, startY: number, endX: number, endY: number) => {
      const deltaX = endX - startX
      const deltaY = endY - startY
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Only consider horizontal swipes (not vertical)
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.(absDeltaX)
        } else {
          onSwipeLeft?.(absDeltaX)
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mouseup', handleMouseUp)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('mouseup', handleMouseUp)
    }
  }, [threshold, onSwipeLeft, onSwipeRight])
}
