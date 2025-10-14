// Hook for cursor position tracking with throttling
import { useCallback, useRef, useEffect } from 'react'
import { updateCursorPosition } from '../utils/presenceUtils'
import type { User } from '../utils/types'

interface CursorPosition {
  x: number
  y: number
}

/**
 * Hook to track and throttle cursor position updates
 * Throttles to 30-50ms (20-30 FPS) for optimal performance
 */
export const useCursorTracking = (user: User | null, currentlyEditing: string | null = null) => {
  const lastUpdateRef = useRef<number>(0)
  const pendingUpdateRef = useRef<CursorPosition | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // ✅ 40ms throttle (25 FPS) - good balance of responsiveness and performance
  const THROTTLE_MS = 40
  
  const throttledUpdateCursor = useCallback((x: number, y: number) => {
    if (!user) return
    
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current
    
    // Store the pending update
    pendingUpdateRef.current = { x, y }
    
    if (timeSinceLastUpdate >= THROTTLE_MS) {
      // ✅ IMMEDIATE: Update if enough time has passed
      lastUpdateRef.current = now
      updateCursorPosition(user.uid, x, y, currentlyEditing).catch(console.error)
      pendingUpdateRef.current = null
      
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } else {
      // ✅ DELAYED: Schedule update for remaining time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      const remainingTime = THROTTLE_MS - timeSinceLastUpdate
      timeoutRef.current = setTimeout(() => {
        if (pendingUpdateRef.current && user) {
          const { x: pendingX, y: pendingY } = pendingUpdateRef.current
          lastUpdateRef.current = Date.now()
          updateCursorPosition(user.uid, pendingX, pendingY, currentlyEditing).catch(console.error)
          pendingUpdateRef.current = null
          timeoutRef.current = null
        }
      }, remainingTime)
    }
  }, [user, currentlyEditing])
  
  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return { updateCursor: throttledUpdateCursor }
}

/**
 * Utility to convert mouse event to canvas coordinates
 * Accounts for canvas pan/zoom state
 */
export const getCanvasCoordinates = (
  event: MouseEvent | React.MouseEvent,
  stageRef: React.RefObject<any>
): { x: number; y: number } | null => {
  if (!stageRef.current) return null
  
  const stage = stageRef.current
  const pointerPosition = stage.getPointerPosition()
  
  if (!pointerPosition) return null
  
  // ✅ BUILT-IN: Konva automatically handles stage transforms
  return {
    x: pointerPosition.x,
    y: pointerPosition.y
  }
}
