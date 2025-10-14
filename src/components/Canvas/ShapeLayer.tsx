import React, { useCallback } from 'react'
import { Layer, Rect, Circle, Text } from 'react-konva'
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

  // ✅ SINGLE SELECTION: Only one shape selected at a time (Figma-like UX)
  const handleClick = useCallback(async () => {
    if (!isLockedByOthers && user) {
      // ✅ Skip if already locked by current user (avoid unnecessary operations)
      if (isLockedByMe) {
        console.log(`🔒 [${user.displayName}] Shape ${shape.id.slice(-4)} already selected - no action needed`)
        return // Already selected, no work needed
      }
      
      const { updateShapeOptimistic } = useCanvasStore.getState()
      const userLockedShapes = shapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      console.log(`🎯 [${user.displayName}] Selecting shape ${shape.id.slice(-4)}, releasing ${userLockedShapes.length} previous selections`)
      
      // ✅ INSTANT: Release ALL previous selections (single-select behavior)
      userLockedShapes.forEach(s => {
        console.log(`🔓 [${user.displayName}] Releasing shape ${s.id.slice(-4)}`)
        updateShapeOptimistic(s.id, { 
          isLocked: false, 
          lockedBy: null, 
          lockedByName: null, 
          lockedByColor: null 
        })
      })
      
      // ✅ INSTANT: Lock new shape (single selection)
      console.log(`🔒 [${user.displayName}] Locking shape ${shape.id.slice(-4)}`)
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      })
      
      // ✅ BACKGROUND: Firebase operations (non-blocking)
      // Release previous locks in Firebase
      if (userLockedShapes.length > 0) {
        Promise.all(
          userLockedShapes.map(s => releaseLock(s.id, user.uid, user.displayName))
        )
      }
      
      // Acquire lock for current shape
      acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
    }
  }, [shape.id, isLockedByMe, isLockedByOthers, user, shapes])

  // ✅ DRAG START: Ensure single selection + lock for dragging
  const handleDragStart = useCallback(() => {
    if (!isLockedByMe && user) {
      const { updateShapeOptimistic } = useCanvasStore.getState()
      const userLockedShapes = shapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      console.log(`🖱️ [${user.displayName}] Drag start on ${shape.id.slice(-4)}, releasing ${userLockedShapes.length} other selections`)
      
      // ✅ SINGLE SELECTION: Release other shapes when starting drag
      userLockedShapes.forEach(s => {
        console.log(`🔓 [${user.displayName}] Drag-releasing shape ${s.id.slice(-4)}`)
        updateShapeOptimistic(s.id, { 
          isLocked: false, 
          lockedBy: null, 
          lockedByName: null, 
          lockedByColor: null 
        })
        releaseLock(s.id, user.uid, user.displayName)
      })
      
      // Lock the shape being dragged
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      })
      
      // Background Firebase lock acquisition
      acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
    }
  }, [shape.id, isLockedByMe, user, shapes])

  // ✅ OPTIMISTIC DRAG END: Instant position updates with proper circle handling
  const handleDragEnd = useCallback((e: any) => {
    let newX = Math.round(e.target.x())
    let newY = Math.round(e.target.y())
    
    // ✅ CIRCLE FIX: Adjust position for circles since they're positioned by center
    if (shape.type === 'circle') {
      newX = newX - shape.width / 2
      newY = newY - shape.height / 2
    }
    
    if (user) {
      const { updateShapeOptimistic } = useCanvasStore.getState()
      
      // ✅ INSTANT: Update position locally first
      updateShapeOptimistic(shape.id, { x: newX, y: newY })
      
      // ✅ BACKGROUND: Sync to Firebase (non-blocking)
      updateShape(shape.id, { x: newX, y: newY }, user.uid)
    }
  }, [shape.id, shape.type, shape.width, shape.height, user])

  // ✅ PERFORMANCE: Drag boundary constraints with circle support
  const dragBoundFunc = useCallback((pos: any) => {
    // Snap to grid (optional - can be disabled for smoother dragging)
    const gridSize = 1 // Set to 1 for pixel-perfect positioning
    const snappedX = Math.round(pos.x / gridSize) * gridSize
    const snappedY = Math.round(pos.y / gridSize) * gridSize
    
    // ✅ CIRCLE BOUNDS: Account for circle center positioning
    if (shape.type === 'circle') {
      const radius = Math.min(shape.width, shape.height) / 2
      return {
        x: Math.max(radius, Math.min(5000 - radius, snappedX)),
        y: Math.max(radius, Math.min(5000 - radius, snappedY))
      }
    }
    
    // Rectangle bounds
    return {
      x: Math.max(0, Math.min(4900, snappedX)), // 5000 - 100 (shape width)
      y: Math.max(0, Math.min(4900, snappedY))  // 5000 - 100 (shape height)
    }
  }, [shape.type, shape.width, shape.height])

  // ✅ SHAPE RENDERING: Support both rectangles and circles
  const renderShape = () => {
    const strokeColor = isLockedByMe 
      ? (user?.cursorColor || '#0066ff')
      : isLockedByOthers
        ? (shape.lockedByColor || '#ff6b6b')
        : 'transparent'
    const strokeWidth = isLockedByMe || isLockedByOthers ? 2 : 0

    const commonProps = {
      fill: shape.fill,
      stroke: strokeColor,
      strokeWidth,
      draggable: canDrag,
      dragBoundFunc: canDrag ? dragBoundFunc : undefined,
      onClick: handleClick,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    }

    if (shape.type === 'circle') {
      return (
        <Circle
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          radius={Math.min(shape.width, shape.height) / 2}
          {...commonProps}
        />
      )
    } else {
      return (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...commonProps}
        />
      )
    }
  }

  return (
    <>
      {renderShape()}
      
      {/* Text overlay (works for both shapes) */}
      {shape.text && (
        <Text
          x={shape.x}
          y={shape.y + shape.height / 2 - 7}
          width={shape.width}
          text={shape.text}
          fontSize={shape.fontSize}
          fill={shape.textColor}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
    </>
  )
})

// ✅ PERFORMANCE: Memoize shape layer to prevent unnecessary re-renders
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