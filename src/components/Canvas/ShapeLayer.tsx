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
  const { selectShape, selectedShapeId, updateShape: updateLocalShape } = useCanvasStore()
  const { user } = useUserStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [hasLock, setHasLock] = useState(false)
  const [justFinishedDrag, setJustFinishedDrag] = useState(false)
  
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
  
  // Failsafe: Clean up stuck drag states after timeout
  useEffect(() => {
    if (isDragging) {
      const timeout = setTimeout(() => {
        console.warn(`⚠️ Drag timeout detected for ${shape.id}, forcing cleanup`)
        setIsDragging(false)
        if (hasLock && user) {
          releaseLock(shape.id, user.uid, user.displayName)
          setHasLock(false)
          console.log(`🔓 Force released stuck lock for: ${shape.id}`)
        }
      }, 10000) // 10 second timeout for stuck drags
      
      return () => clearTimeout(timeout)
    }
  }, [isDragging, hasLock, user, shape.id])
  
  // Handle shape click (selection) with drag delay protection
  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true // Prevent event from bubbling to stage
    e.evt.stopPropagation() // Additional stop propagation
    
    // Prevent immediate selection after drag to avoid conflicts
    if (justFinishedDrag) {
      console.log(`⏳ Ignoring click on ${shape.id} - just finished drag`)
      return
    }
    
    if (!isLockedByOthers) {
      selectShape(shape.id)
      console.log(`🎯 Selected shape: ${shape.id}`)
    }
  }, [shape.id, selectShape, isLockedByOthers, justFinishedDrag])

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

  // Handle drag end with comprehensive cleanup
  const handleDragEnd = useCallback(async (e: any) => {
    console.log(`🎯 Drag end triggered for ${shape.id}, isDragging: ${isDragging}, hasLock: ${hasLock}`)
    
    if (!user) {
      console.warn('No user in drag end')
      setIsDragging(false)
      return
    }
    
    // Always clean up dragging state, even if we don't have a lock
    const wasDragging = isDragging
    setIsDragging(false)
    
    // Set flag to prevent immediate re-selection after drag
    if (wasDragging) {
      setJustFinishedDrag(true)
      setTimeout(() => {
        setJustFinishedDrag(false)
        console.log(`⏰ Re-enabled selection for ${shape.id}`)
      }, 300) // 300ms delay before allowing selection again
    }
    
    if (!wasDragging) {
      console.log('Drag end called but was not dragging, ignoring')
      return
    }
    
    try {
      // Get the dragged element's final position
      const draggedRect = e.target
      
      // Use the actual dragged position (Konva handles the viewport transform automatically)
      const newPos = {
        x: Math.max(0, Math.min(5000 - shape.width, draggedRect.x())),
        y: Math.max(0, Math.min(5000 - shape.height, draggedRect.y()))
      }
      
      console.log(`🎯 Final drag position for ${shape.id}:`, newPos)
      
      // Update the visual position (snap to boundaries)
      draggedRect.x(newPos.x)
      draggedRect.y(newPos.y)
      
      // IMMEDIATELY update local store for instant visual sync
      updateLocalShape(shape.id, { x: newPos.x, y: newPos.y })
      console.log(`🔄 Updated local store position: ${shape.id} -> (${newPos.x}, ${newPos.y})`)
      
      // Only try to release lock if we actually have it
      if (hasLock) {
        // Release lock with final position - this updates Firestore for other users
        await releaseLock(shape.id, user.uid, user.displayName, newPos)
        setHasLock(false)
        console.log(`✅ Lock released for shape: ${shape.id}`)
      } else {
        console.warn(`⚠️ Drag ended but no lock held for shape: ${shape.id}`)
      }
      
    } catch (error) {
      console.error('Error in drag end:', error)
      // Reset position on error
      e.target.x(dragStartPos.x)
      e.target.y(dragStartPos.y)
      // Also reset local store
      updateLocalShape(shape.id, { x: dragStartPos.x, y: dragStartPos.y })
      
      // Force release lock on error
      if (hasLock) {
        try {
          await releaseLock(shape.id, user.uid, user.displayName)
          setHasLock(false)
          console.log(`🔓 Force released lock after error for: ${shape.id}`)
        } catch (releaseError) {
          console.error('Failed to release lock after error:', releaseError)
        }
      }
    }
  }, [shape.id, shape.width, shape.height, user, isDragging, dragStartPos, updateLocalShape, hasLock])

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
