// Simplified cursor tracking using requestAnimationFrame
import { useCallback, useRef } from 'react'
import { updateCursorPosition } from '../utils/presenceUtils'
import type { User } from '../utils/types'

/**
 * ✅ BUILT-IN: Use requestAnimationFrame for optimal throttling
 * Much simpler than custom setTimeout logic
 */
export const useSimpleCursorTracking = (user: User | null, currentlyEditing: string | null = null) => {
  const pendingUpdateRef = useRef<{ x: number; y: number } | null>(null)
  const isScheduledRef = useRef(false)
  
  const updateCursor = useCallback((x: number, y: number) => {
    if (!user) return
    
    // Store latest position
    pendingUpdateRef.current = { x, y }
    
    // ✅ BUILT-IN: Schedule update on next frame (auto-throttles to 60fps max)
    if (!isScheduledRef.current) {
      isScheduledRef.current = true
      requestAnimationFrame(() => {
        if (pendingUpdateRef.current && user) {
          const { x: pendingX, y: pendingY } = pendingUpdateRef.current
          updateCursorPosition(user.uid, pendingX, pendingY, currentlyEditing).catch(console.error)
        }
        isScheduledRef.current = false
      })
    }
  }, [user, currentlyEditing])
  
  return { updateCursor }
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
