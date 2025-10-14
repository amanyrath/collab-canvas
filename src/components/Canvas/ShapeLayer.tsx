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

  // ✅ OPTIMIZED: Instant UI updates with background sync
  const handleClick = useCallback(async () => {
    if (!isLockedByOthers && user) {
      // ✅ Skip if already locked by current user (avoid unnecessary operations)
      if (isLockedByMe) {
        console.log(`Already locked by me: ${shape.id}`)
        return
      }
      
      const { updateShapeOptimistic } = useCanvasStore.getState()
      const userLockedShapes = shapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      // ✅ INSTANT: Optimistic UI updates with Firestore protection
      // Release previous locks locally
      userLockedShapes.forEach(s => {
        updateShapeOptimistic(s.id, { 
          isLocked: false, 
          lockedBy: null, 
          lockedByName: null, 
          lockedByColor: null 
        })
      })
      
      // Lock current shape locally with protection
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      })
      
      // ✅ BACKGROUND: Sync to Firestore (doesn't block UI)
      Promise.all([
        ...userLockedShapes.map(s => 
          releaseLock(s.id, user.uid, user.displayName)
        ),
        acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
      ]).catch(error => {
        console.error('Background sync failed:', error)
        // TODO: Could implement retry logic or revert optimistic updates
      })
      
      console.log(`⚡ Instant selection: ${shape.id}`)
    }
  }, [shape.id, shapes, isLockedByOthers, isLockedByMe, user])

  // Robust drag start with error handling and existence check
  const handleDragStart = useCallback(async (e: any) => {
    if (!user) {
      e.target.stopDrag()
      return
    }

    // Check if shape still exists (could be deleted by another user)
    const currentShape = shapes.find(s => s.id === shape.id)
    if (!currentShape) {
      console.warn(`Shape ${shape.id} no longer exists, stopping drag`)
      e.target.stopDrag()
      return
    }

    try {
      // ✅ Release any existing locks before drag (same logic as click)
      const userLockedShapes = shapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      if (userLockedShapes.length > 0) {
        await Promise.all(
          userLockedShapes.map(s => 
            releaseLock(s.id, user.uid, user.displayName)
          )
        )
      }
      
      const lockResult = await acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
      if (!lockResult.success) {
        console.warn(`Failed to acquire lock: ${lockResult.error}`)
        e.target.stopDrag()
      }
      // ✅ SIMPLIFIED: No separate selection - lock IS selection
    } catch (error) {
      console.error('Error in drag start:', error)
      e.target.stopDrag()
    }
  }, [user, shape.id, shapes])

  // Robust drag end with error handling and recovery
  const handleDragEnd = useCallback(async (e: any) => {
    if (!user) return

    const node = e.target
    const finalX = node.x()
    const finalY = node.y()

    try {
      // Check if shape still exists
      const currentShape = shapes.find(s => s.id === shape.id)
      if (!currentShape) {
        console.warn(`Shape ${shape.id} was deleted during drag`)
        return
      }

      // Update position in database
      await updateShape(shape.id, { x: finalX, y: finalY }, user.uid)
      
      // ✅ SIMPLIFIED: Keep lock after drag (Figma-like behavior)
      // Don't release lock - user stays "selected/locked" until canvas click
      
      console.log(`✅ Drag completed: ${shape.id} -> (${finalX}, ${finalY}) - kept locked`)
    } catch (error) {
      console.error('Drag end failed:', error)
      
      // Reset shape to original position on error
      try {
        node.x(shape.x)
        node.y(shape.y)
        console.log(`🔄 Reset shape ${shape.id} to original position after error`)
        
        // Still try to release the lock to prevent permanent locks
        await releaseLock(shape.id, user.uid, user.displayName)
      } catch (resetError) {
        console.error('Failed to reset shape position:', resetError)
      }
    }
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
      
      {/* ✅ SIMPLIFIED: Single lock indicator (selection = locking) */}
      {isLockedByOthers && (
        <Text
          x={shape.x}
          y={shape.y - 20}
          text={`🔒 Locked: ${shape.lockedByName || 'Another user'}`}
          fontSize={12}
          fontFamily="sans-serif"
          fill={shape.lockedByColor || '#ff6b6b'}
          listening={false}
        />
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
