import React, { useState, useCallback, useEffect } from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'
import { acquireLock, releaseLock } from '../../utils/lockUtils'

interface ShapeLayerProps {
  listening: boolean
}

// Individual shape component with React.memo for performance
const ShapeComponent: React.FC<{ shape: Shape }> = React.memo(({ shape }) => {
  const { selectShape, selectedShapeId } = useCanvasStore()
  const { user } = useUserStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [hasLock, setHasLock] = useState(false)
  
  const isSelected = selectedShapeId === shape.id
  const isLocked = shape.isLocked
  const isLockedByOthers = isLocked && shape.lockedBy !== user?.uid
  
  // Clean up lock when component unmounts or shape is deselected
  useEffect(() => {
    return () => {
      // Cleanup lock on unmount
      if (hasLock && user) {
        releaseLock(shape.id, user.uid, user.displayName)
        setHasLock(false)
      }
    }
  }, [])
  
  // Release lock when shape is deselected
  useEffect(() => {
    if (!isSelected && hasLock && user) {
      releaseLock(shape.id, user.uid, user.displayName)
      setHasLock(false)
      console.log(`🔓 Released lock due to deselection: ${shape.id}`)
    }
  }, [isSelected, hasLock, user, shape.id])
  
  // Handle shape click (selection)
  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true // Prevent event from bubbling to stage
    e.evt.stopPropagation() // Additional stop propagation
    
    if (!isLockedByOthers) {
      selectShape(shape.id)
    }
  }, [shape.id, selectShape, isLockedByOthers])

  // Handle drag start
  const handleDragStart = useCallback(async (e: any) => {
    if (!user || isLockedByOthers) {
      e.target.stopDrag()
      return
    }
    
    try {
      // Acquire lock before dragging
      const lockResult = await acquireLock(shape.id, user.uid, user.displayName)
      
      if (!lockResult.success) {
        e.target.stopDrag()
        console.warn('Failed to acquire lock:', lockResult.error)
        return
      }
      
      setHasLock(true)
      setIsDragging(true)
      setDragStartPos({ x: shape.x, y: shape.y })
      selectShape(shape.id)
      
      console.log(`🎯 Started dragging shape: ${shape.id}`)
    } catch (error) {
      console.error('Error in drag start:', error)
      e.target.stopDrag()
    }
  }, [shape.id, shape.x, shape.y, user, isLockedByOthers, selectShape])

  // Handle drag end
  const handleDragEnd = useCallback(async (e: any) => {
    if (!user || !isDragging) return
    
    try {
      // Get the dragged element's final position
      const draggedRect = e.target
      
      // Use the actual dragged position (Konva handles the viewport transform automatically)
      const newPos = {
        x: Math.max(0, Math.min(5000 - shape.width, draggedRect.x())),
        y: Math.max(0, Math.min(5000 - shape.height, draggedRect.y()))
      }
      
      console.log(`🎯 Drag end position for ${shape.id}:`, newPos)
      
      // Update the visual position (snap to boundaries)
      draggedRect.x(newPos.x)
      draggedRect.y(newPos.y)
      
      // Release lock with final position - this updates Firestore
      await releaseLock(shape.id, user.uid, user.displayName, newPos)
      
      console.log(`✅ Drag completed for shape: ${shape.id}`, newPos)
      setHasLock(false)
    } catch (error) {
      console.error('Error in drag end:', error)
      // Reset position on error
      e.target.x(dragStartPos.x)
      e.target.y(dragStartPos.y)
    } finally {
      setIsDragging(false)
    }
  }, [shape.id, shape.width, shape.height, user, isDragging, dragStartPos])

  // Determine cursor style
  const getCursor = () => {
    if (isLockedByOthers) return 'not-allowed'
    if (isDragging) return 'grabbing'
    return 'grab'
  }

  return (
    <>
      {/* Rectangle */}
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        fill={shape.fill}
        stroke={isSelected ? '#0066ff' : isLockedByOthers ? '#ff6b6b' : 'transparent'}
        strokeWidth={isSelected || isLockedByOthers ? 2 : 0}
        opacity={isLockedByOthers ? 0.7 : 1}
        onClick={handleClick}
        onTap={handleClick}
        draggable={!isLockedByOthers}
        dragBoundFunc={(pos) => ({
          x: Math.max(0, Math.min(5000 - shape.width, pos.x)),
          y: Math.max(0, Math.min(5000 - shape.height, pos.y))
        })}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={(e) => {
          e.target.getStage()!.container().style.cursor = getCursor()
        }}
        onMouseLeave={(e) => {
          e.target.getStage()!.container().style.cursor = 'default'
        }}
      />
      
      {/* Text overlay if shape has text */}
      {shape.text && (
        <Text
          x={shape.x}
          y={shape.y + shape.height / 2 - shape.fontSize / 2}
          width={shape.width}
          height={shape.fontSize}
          text={shape.text}
          fontSize={shape.fontSize}
          fontFamily="sans-serif"
          fill={shape.textColor}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
      
      {/* Lock indicator for shapes locked by others */}
      {isLockedByOthers && (
        <Text
          x={shape.x}
          y={shape.y - 20}
          text={`🔒 Editing: ${shape.lockedBy === user?.uid ? 'You' : 'Another user'}`}
          fontSize={12}
          fontFamily="sans-serif"
          fill="#ff6b6b"
          listening={false}
        />
      )}
    </>
  )
})

ShapeComponent.displayName = 'ShapeComponent'

const ShapeLayer: React.FC<ShapeLayerProps> = ({ listening }) => {
  const { shapes } = useCanvasStore()

  return (
    <Layer listening={listening}>
      {shapes.map((shape) => (
        <ShapeComponent key={shape.id} shape={shape} />
      ))}
    </Layer>
  )
}

export default ShapeLayer
