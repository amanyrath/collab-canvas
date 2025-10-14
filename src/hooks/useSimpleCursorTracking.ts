// 💰 COST-OPTIMIZED Firebase cursor tracking 
import { useCallback, useRef, useEffect } from 'react'
import { updateCursorPosition } from '../utils/presenceUtils'
import type { User } from '../utils/types'

/**
 * 💡 FUTURE OPTIMIZATION IDEAS:
 * 1. WebRTC Data Channels: For near-zero cost cursor updates
 * 2. Canvas quadrants: Only send updates when changing quadrants
 * 3. Cursor pooling: Batch multiple cursor updates together
 * 4. Socket.io: Alternative to Firebase for high-frequency updates
 */

/**
 * 💰 COST-OPTIMIZED: Smart cursor tracking to minimize Firebase usage
 * - 20fps instead of 60fps (50ms intervals) = 66% fewer writes
 * - Distance-based updates (only update if moved >5px)
 * - Idle detection (stop updates when not moving)
 */
export const useSimpleCursorTracking = (user: User | null) => {
  const lastUpdateRef = useRef<number>(0)
  const lastPositionRef = useRef<{ x: number; y: number }>({ x: 300, y: 200 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitializedRef = useRef<boolean>(false)
  
  // Initialize cursor position when user first loads
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      updateCursorPosition(user.uid, 300, 200)
      hasInitializedRef.current = true
    }
  }, [user])
  
  const updateCursor = useCallback((x: number, y: number) => {
    if (!user) return
    
    const now = Date.now()
    const lastPos = lastPositionRef.current
    
    // 💰 OPTIMIZATION 1: Distance-based updates (only if moved >5px)
    const distance = Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2))
    if (distance < 5 && now - lastUpdateRef.current < 1000) {
      // Don't update if moved <5px and last update was <1s ago
      return
    }
    
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
    
    const timeElapsed = now - lastUpdateRef.current
    
    // 💰 OPTIMIZATION 2: 20fps instead of 60fps (50ms intervals)
    if (timeElapsed >= 50) { // 20fps = 50ms (was 16ms)
      performCursorUpdate(user, x, y)
      lastUpdateRef.current = now
      lastPositionRef.current = { x, y }
    } else {
      // Throttled update
      timeoutRef.current = setTimeout(() => {
        performCursorUpdate(user, x, y)
        lastUpdateRef.current = Date.now()
        lastPositionRef.current = { x, y }
      }, 50 - timeElapsed)
    }
    
    // 💰 OPTIMIZATION 3: Idle detection - stop updates after 2s of no movement
    idleTimeoutRef.current = setTimeout(() => {
      // Could send "idle" status or just stop updates (currently just stops)
    }, 2000)
    
  }, [user])
  
  // Helper function for the actual Firebase update
  const performCursorUpdate = useCallback((user: User, x: number, y: number) => {
    updateCursorPosition(user.uid, x, y)
  }, [])
  
  return { updateCursor }
}

// ⚡ Removed performCursorUpdate - now using unified presence system

/**
 * ✅ FIXED: Proper coordinate conversion accounting for stage transforms
 */
export const getCanvasCoordinates = (
  event: MouseEvent | React.MouseEvent,
  stageRef: React.RefObject<any>
) => {
  if (!stageRef.current) return null
  
  // Get the stage's container element
  const stage = stageRef.current
  const container = stage.container()
  
  if (!container) return null
  
  // Get the bounding rectangle of the canvas container
  const rect = container.getBoundingClientRect()
  
  // Calculate relative position within the canvas
  const relativeX = event.clientX - rect.left
  const relativeY = event.clientY - rect.top
  
  // Convert from screen coordinates to canvas coordinates
  // This accounts for stage position, scale, and rotation
  const transform = stage.getAbsoluteTransform().copy().invert()
  const canvasPos = transform.point({ x: relativeX, y: relativeY })
  
  return { x: Math.round(canvasPos.x), y: Math.round(canvasPos.y) }
}
