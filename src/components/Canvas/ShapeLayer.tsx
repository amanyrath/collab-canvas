import React, { useCallback } from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'
import { updateShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock } from '../../utils/lockUtils'

interface ShapeLayerProps {
  listening: boolean
}

// ✅ SIMPLIFIED: Selection = Locking (no dual state)
const SimpleShape: React.FC<{ shape: Shape }> = React.memo(({ shape }) => {
  const { shapes } = useCanvasStore()
  const { user } = useUserStore()
  
  const isLockedByMe = shape.isLocked && shape.lockedBy === user?.uid
  const isLockedByOthers = shape.isLocked && shape.lockedBy !== user?.uid
  const canDrag = !isLockedByOthers && !!user

  // ✅ ULTRA-FAST: Instant UI updates with minimal Firebase calls
  const handleClick = useCallback(async () => {
    if (!isLockedByOthers && user) {
      // ✅ Skip if already locked by current user (avoid unnecessary operations)
      if (isLockedByMe) {
        return // Already selected, no work needed
      }
      
      const { updateShapeOptimistic } = useCanvasStore.getState()
      const userLockedShapes = shapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      // ✅ INSTANT: Optimistic UI updates 
      // Release previous locks locally (instant visual feedback)
      userLockedShapes.forEach(s => {
        updateShapeOptimistic(s.id, { 
          isLocked: false, 
          lockedBy: null, 
          lockedByName: null, 
          lockedByColor: null 
        })
      })
      
      // Lock current shape locally (instant selection highlight)
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      })
      
      // ✅ BATCHED: Single async operation for all lock changes
      // This happens in the background without blocking the UI
      if (userLockedShapes.length > 0) {
        // Release old + acquire new in a single batch operation
        Promise.all([
          ...userLockedShapes.map(s => 
            releaseLock(s.id, user.uid, user.displayName).catch(() => {})
          ),
          acquireLock(shape.id, user.uid, user.displayName, user.cursorColor).catch(() => {})
        ])
      } else {
        // Just acquire new lock
        acquireLock(shape.id, user.uid, user.displayName, user.cursorColor).catch(() => {})
      }
    }
  }, [shape.id, shapes, isLockedByOthers, isLockedByMe, user])

  // ✅ FAST: Simplified drag start - optimistic + background sync
  const handleDragStart = useCallback(async (e: any) => {
    if (!user) {
      e.target.stopDrag()
      return
    }

    // Check if shape still exists (could be deleted by another user)
    const currentShape = shapes.find(s => s.id === shape.id)
    if (!currentShape) {
      e.target.stopDrag()
      return
    }

    // If not already locked by current user, acquire lock instantly
    if (!isLockedByMe) {
      const { updateShapeOptimistic } = useCanvasStore.getState()
      
      // Instant UI lock (don't wait for Firebase)
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      })
      
      // Background sync (non-blocking)
      acquireLock(shape.id, user.uid, user.displayName, user.cursorColor).catch(() => {
        // If lock fails, revert optimistic update
        updateShapeOptimistic(shape.id, {
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedByColor: null
        })
        e.target.stopDrag()
      })
    }
  }, [user, shape.id, shapes, isLockedByMe])

  // ✅ FAST: Optimistic drag end with background sync
  const handleDragEnd = useCallback(async (e: any) => {
    if (!user) return

    const node = e.target
    const finalX = Math.round(node.x())
    const finalY = Math.round(node.y())

    // Check if shape still exists
    const currentShape = shapes.find(s => s.id === shape.id)
    if (!currentShape) return

    // ✅ INSTANT: Update position locally (optimistic)
    const { updateShapeOptimistic } = useCanvasStore.getState()
    updateShapeOptimistic(shape.id, { x: finalX, y: finalY })

    // ✅ BACKGROUND: Sync position to Firebase (non-blocking)
    updateShape(shape.id, { x: finalX, y: finalY }, user.uid).catch(error => {
      console.error('Position sync failed:', error)
      // On error, revert to original position
      updateShapeOptimistic(shape.id, { x: shape.x, y: shape.y })
      node.x(shape.x)
      node.y(shape.y)
    })
  }, [user, shape.id, shape.x, shape.y, shapes])

  // Use Konva's built-in dragBoundFunc for all positioning logic
  const dragBoundFunc = useCallback((pos: { x: number; y: number }) => {
    // Snap to 20px grid + constrain to canvas bounds
    const snappedX = Math.round(pos.x / 20) * 20
    const snappedY = Math.round(pos.y / 20) * 20
    return {
      x: Math.max(0, Math.min(4900, snappedX)), // 5000 - 100 (shape width)
      y: Math.max(0, Math.min(4900, snappedY))  // 5000 - 100 (shape height)
    }
  }, [])

  return (
    <>
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        fill={shape.fill}
        stroke={
          isLockedByMe 
            ? (user?.cursorColor || '#0066ff')
            : isLockedByOthers
              ? (shape.lockedByColor || '#ff6b6b')
              : 'transparent'
        }
        strokeWidth={isLockedByMe || isLockedByOthers ? 2 : 0}
        draggable={canDrag}
        dragBoundFunc={canDrag ? dragBoundFunc : undefined}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      
      {shape.text && (
        <Text
          x={shape.x}
          y={shape.y + 42}
          width={shape.width}
          text={shape.text}
          fontSize={14}
          fill="#000"
          align="center"
          listening={false}
        />
      )}
      
      {/* ✅ USER INDICATOR: Show who's editing with their color */}
      {isLockedByOthers && shape.lockedByName && (
        <>
          {/* Colored background for better visibility */}
          <Rect
            x={shape.x - 2}
            y={shape.y - 24}
            width={`Editing: ${shape.lockedByName}`.length * 7 + 8}
            height={18}
            fill={shape.lockedByColor || '#ff6b6b'}
            cornerRadius={3}
            listening={false}
          />
          {/* White text on colored background */}
          <Text
            x={shape.x + 2}
            y={shape.y - 21}
            text={`Editing: ${shape.lockedByName}`}
            fontSize={11}
            fontFamily="Arial"
            fontStyle="bold"
            fill="white"
            listening={false}
          />
        </>
      )}
    </>
  )
})

SimpleShape.displayName = 'SimpleShape'

const ShapeLayer: React.FC<ShapeLayerProps> = ({ listening }) => {
  const { shapes } = useCanvasStore()

  return (
    <Layer listening={listening}>
      {shapes.map((shape) => (
        <SimpleShape key={shape.id} shape={shape} />
      ))}
    </Layer>
  )
}

export default ShapeLayer
