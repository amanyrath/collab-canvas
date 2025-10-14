// ⚡ ULTRA-FAST Firebase cursor tracking - optimized for speed
import { useCallback, useRef } from 'react'
import { ref, set } from 'firebase/database'
import { rtdb } from '../utils/firebase'
import type { User } from '../utils/types'

/**
 * ⚡ SUPER FAST: 16ms (60fps) cursor updates with minimal Firebase calls
 * - Direct Firebase set() calls (no complex functions)
 * - Minimal data structure (just x, y, color, name)
 * - Simple setTimeout throttling (no requestAnimationFrame complexity)
 */
export const useSimpleCursorTracking = (user: User | null) => {
  const lastUpdateRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const updateCursor = useCallback((x: number, y: number) => {
    if (!user) return
    
    const now = Date.now()
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    const timeElapsed = now - lastUpdateRef.current
    
    if (timeElapsed >= 16) { // 60fps = 16ms
      // ⚡ INSTANT: Direct Firebase set - no wrapper functions
      performCursorUpdate(user, x, y)
      lastUpdateRef.current = now
    } else {
      // ⚡ FAST: Simple timeout to next available slot
      timeoutRef.current = setTimeout(() => {
        performCursorUpdate(user, x, y)
        lastUpdateRef.current = Date.now()
      }, 16 - timeElapsed)
    }
  }, [user])
  
  return { updateCursor }
}

/**
 * ⚡ DIRECT Firebase call - minimal overhead
 */
const performCursorUpdate = (user: User, x: number, y: number) => {
  const cursorRef = ref(rtdb, `/cursors/${user.uid}`)
  
  // ⚡ MINIMAL data structure - only what's needed for rendering
  set(cursorRef, {
    x: Math.round(x), // Round to reduce precision/bytes
    y: Math.round(y),
    name: user.displayName,
    color: user.cursorColor
  }).catch(() => {}) // Silent fail - don't block UI
}

/**
 * ✅ BUILT-IN: Simplified coordinate conversion using Konva
 */
export const getCanvasCoordinates = (
  _event: MouseEvent | React.MouseEvent,
  stageRef: React.RefObject<any>
) => {
  if (!stageRef.current) return null
  
  // ✅ BUILT-IN: Konva handles all the transform math
  const pointer = stageRef.current.getPointerPosition()
  return pointer ? { x: pointer.x, y: pointer.y } : null
}
