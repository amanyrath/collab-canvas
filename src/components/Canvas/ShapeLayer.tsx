import React, { useCallback } from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'
import { updateShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock, syncShapeSelection } from '../../utils/lockUtils'

interface ShapeLayerProps {
  listening: boolean
}

// Ultra-simple shape component with React.memo for performance
const SimpleShape: React.FC<{ shape: Shape }> = React.memo(({ shape }) => {
  const { selectShape, selectedShapeId, shapes } = useCanvasStore()
  const { user } = useUserStore()
  
  const isSelected = selectedShapeId === shape.id
  const isLockedByOthers = shape.isLocked && shape.lockedBy !== user?.uid
  const isSelectedByOthers = shape.selectedBy && shape.selectedBy !== user?.uid
  const canDrag = !isLockedByOthers && !!user

  // Simple click to select with multiplayer sync
  const handleClick = useCallback(async () => {
    if (!isLockedByOthers && user) {
      selectShape(shape.id)
      
      // Sync selection to other users
      await syncShapeSelection(
        shape.id, 
        user.uid, 
        user.displayName, 
        user.cursorColor
      )
    }
  }, [shape.id, selectShape, isLockedByOthers, user])

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
      const lockResult = await acquireLock(shape.id, user.uid, user.displayName)
      if (!lockResult.success) {
        console.warn(`Failed to acquire lock: ${lockResult.error}`)
        e.target.stopDrag()
      } else {
        selectShape(shape.id)
      }
    } catch (error) {
      console.error('Error in drag start:', error)
      e.target.stopDrag()
    }
  }, [user, shape.id, selectShape, shapes])

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
      
      // Release lock
      await releaseLock(shape.id, user.uid, user.displayName)
      
      console.log(`✅ Drag completed: ${shape.id} -> (${finalX}, ${finalY})`)
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
          isSelected 
            ? (user?.cursorColor || '#0066ff') 
            : isSelectedByOthers
              ? (shape.selectedByColor || '#888888')
              : isLockedByOthers
                ? '#ff6b6b'
                : 'transparent'
        }
        strokeWidth={isSelected || isSelectedByOthers || isLockedByOthers ? 2 : 0}
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
      
      {/* Selection indicator for shapes selected by others */}
      {isSelectedByOthers && (
        <Text
          x={shape.x}
          y={shape.y - 20}
          text={`👆 Selected: ${shape.selectedByName || 'Another user'}`}
          fontSize={12}
          fontFamily="sans-serif"
          fill={shape.selectedByColor || '#888888'}
          listening={false}
        />
      )}
      
      {/* Lock indicator for shapes locked by others */}
      {isLockedByOthers && (
        <Text
          x={shape.x}
          y={shape.y - (isSelectedByOthers ? 40 : 20)}
          text={`🔒 Editing: ${shape.lockedByName || 'Another user'}`}
          fontSize={12}
          fontFamily="sans-serif"
          fill="#ff6b6b"
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
