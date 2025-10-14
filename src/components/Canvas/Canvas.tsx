import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { useShapeSync } from '../../hooks/useShapeSync'
import { createShape, updateShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock } from '../../utils/lockUtils'
import GridLayer from './GridLayer'
import ShapeLayer from './ShapeLayer'
import CursorLayer from './CursorLayer'
import SelectionLayer from './SelectionLayer'

// Canvas constants from PRD
const CANVAS_WIDTH = 5000
const CANVAS_HEIGHT = 5000
const MIN_SCALE = 0.1
const MAX_SCALE = 3
const GRID_SIZE = 20 // For snapping
const DRAG_SCALE_FACTOR = 1.05 // Slight scale up during drag

// Performance constants
const THROTTLE_DRAG_MS = 16 // ~60fps
const ANIMATION_DURATION = 0.2

interface CanvasProps {
  width: number
  height: number
}

interface DragState {
  isDragging: boolean
  shapeId: string | null
  startPos: { x: number; y: number }
  hasLock: boolean
  originalScale: { x: number; y: number }
  originalZIndex: number
}

const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isCreatingShape, setIsCreatingShape] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    shapeId: null,
    startPos: { x: 0, y: 0 },
    hasLock: false,
    originalScale: { x: 1, y: 1 },
    originalZIndex: 0
  })
  const dragThrottleRef = useRef<NodeJS.Timeout | null>(null)
  
  const { viewport, setViewport, selectShape, shapes, updateShape: updateLocalShape } = useCanvasStore()
  const { user } = useUserStore()
  
  // Set up real-time shape synchronization
  useShapeSync()

  // Snap to grid utility
  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }, [])

  // Update cursor based on state
  const updateCursor = useCallback((newCursor: string) => {
    const stage = stageRef.current
    if (stage) {
      stage.container().style.cursor = newCursor
    }
  }, [])

  // Robust drag start handler
  const handleDragStart = useCallback(async (shapeId: string, startX: number, startY: number) => {
    if (!user || dragState.isDragging) return false

    console.log(`🚀 Starting drag for shape: ${shapeId}`)
    
    try {
      // Acquire lock
      const lockResult = await acquireLock(shapeId, user.uid, user.displayName)
      if (!lockResult.success) {
        console.warn('Failed to acquire lock:', lockResult.error)
        return false
      }

      const stage = stageRef.current
      if (!stage) return false

      // Find the shape node
      const shapeNode = stage.findOne(`#shape-${shapeId}`)
      if (!shapeNode) return false

      // Store original properties
      const originalScale = { x: shapeNode.scaleX(), y: shapeNode.scaleY() }
      const originalZIndex = shapeNode.zIndex()

      // Move to top and scale up for visual feedback
      shapeNode.moveToTop()
      shapeNode.scale({ 
        x: originalScale.x * DRAG_SCALE_FACTOR, 
        y: originalScale.y * DRAG_SCALE_FACTOR 
      })
      
      // Enable caching for performance
      shapeNode.cache()

      setDragState({
        isDragging: true,
        shapeId,
        startPos: { x: startX, y: startY },
        hasLock: true,
        originalScale,
        originalZIndex
      })

      updateCursor('grabbing')
      selectShape(shapeId)

      // Force redraw
      stage.batchDraw()
      
      console.log(`✅ Drag started for shape: ${shapeId}`)
      return true
    } catch (error) {
      console.error('Error starting drag:', error)
      return false
    }
  }, [user, dragState.isDragging, updateCursor, selectShape])

  // Throttled drag move handler
  const handleDragMove = useCallback((newX: number, newY: number) => {
    if (!dragState.isDragging || !dragState.shapeId) return

    // Clear existing throttle
    if (dragThrottleRef.current) {
      clearTimeout(dragThrottleRef.current)
    }

    // Throttle updates for 60fps performance
    dragThrottleRef.current = setTimeout(() => {
      const stage = stageRef.current
      if (!stage) return

      const shapeNode = stage.findOne(`#shape-${dragState.shapeId}`)
      if (!shapeNode) return

      // Constrain to canvas boundaries
      const shape = shapes.find(s => s.id === dragState.shapeId)
      if (!shape) return

      const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - shape.width, newX))
      const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - shape.height, newY))

      // Update visual position
      shapeNode.x(constrainedX)
      shapeNode.y(constrainedY)

      // Update local store for immediate feedback
      updateLocalShape(dragState.shapeId!, { x: constrainedX, y: constrainedY })

      // Use batchDraw for performance
      stage.batchDraw()
    }, THROTTLE_DRAG_MS)
  }, [dragState.isDragging, dragState.shapeId, shapes, updateLocalShape])

  // Robust drag end handler with global event listeners
  const handleDragEnd = useCallback(async (finalX?: number, finalY?: number) => {
    if (!dragState.isDragging || !dragState.shapeId || !user) return

    console.log(`🎯 Ending drag for shape: ${dragState.shapeId}`)

    const stage = stageRef.current
    if (!stage) return

    const shapeNode = stage.findOne(`#shape-${dragState.shapeId}`)
    const shape = shapes.find(s => s.id === dragState.shapeId)
    
    if (!shapeNode || !shape) return

    try {
      // Get final position (use provided or current)
      const endX = finalX !== undefined ? finalX : shapeNode.x()
      const endY = finalY !== undefined ? finalY : shapeNode.y()

      // Snap to grid
      const snappedX = snapToGrid(endX)
      const snappedY = snapToGrid(endY)

      // Constrain to boundaries
      const finalPosX = Math.max(0, Math.min(CANVAS_WIDTH - shape.width, snappedX))
      const finalPosY = Math.max(0, Math.min(CANVAS_HEIGHT - shape.height, snappedY))

      // Animate to final position with easing
      const tween = new Konva.Tween({
        node: shapeNode,
        duration: ANIMATION_DURATION,
        x: finalPosX,
        y: finalPosY,
        scaleX: dragState.originalScale.x,
        scaleY: dragState.originalScale.y,
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          // Clear cache after animation
          shapeNode.clearCache()
          
          // Restore original z-index
          shapeNode.zIndex(dragState.originalZIndex)
          
          stage.batchDraw()
        }
      })
      tween.play()

      // Update Firestore with final position
      await updateShape(dragState.shapeId, { 
        x: finalPosX, 
        y: finalPosY 
      }, user.uid)

      // Update local store
      updateLocalShape(dragState.shapeId, { x: finalPosX, y: finalPosY })

      // Release lock
      if (dragState.hasLock) {
        await releaseLock(dragState.shapeId, user.uid, user.displayName)
      }

      console.log(`✅ Drag completed: ${dragState.shapeId} -> (${finalPosX}, ${finalPosY})`)

      // Auto-deselect after drag
      selectShape(null)

    } catch (error) {
      console.error('Error ending drag:', error)
      
      // Reset to original position on error
      if (shapeNode) {
        shapeNode.x(dragState.startPos.x)
        shapeNode.y(dragState.startPos.y)
        shapeNode.scale(dragState.originalScale)
        shapeNode.clearCache()
        stage.batchDraw()
      }
    } finally {
      // Clear drag state
      setDragState({
        isDragging: false,
        shapeId: null,
        startPos: { x: 0, y: 0 },
        hasLock: false,
        originalScale: { x: 1, y: 1 },
        originalZIndex: 0
      })

      updateCursor('default')
      
      // Clear any pending throttle
      if (dragThrottleRef.current) {
        clearTimeout(dragThrottleRef.current)
        dragThrottleRef.current = null
      }
    }
  }, [dragState, user, shapes, snapToGrid, updateLocalShape, selectShape, updateCursor])

  // Global mouse/touch event handlers for reliable drag end detection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isDragging) {
        handleDragEnd()
      }
    }

    const handleGlobalMouseLeave = () => {
      if (dragState.isDragging) {
        handleDragEnd()
      }
    }

    // Add global listeners to ensure drag always ends
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mouseleave', handleGlobalMouseLeave)
    document.addEventListener('touchend', handleGlobalMouseUp)
    window.addEventListener('blur', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mouseleave', handleGlobalMouseLeave)
      document.removeEventListener('touchend', handleGlobalMouseUp)
      window.removeEventListener('blur', handleGlobalMouseUp)
    }
  }, [dragState.isDragging, handleDragEnd])

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Calculate zoom
    const scaleBy = 1.05
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

    // Calculate new position to zoom towards pointer
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }

    // Apply constraints
    const constrainedPos = constrainViewport(newPos.x, newPos.y, clampedScale)

    // Update viewport
    setViewport({
      x: constrainedPos.x,
      y: constrainedPos.y,
      scale: clampedScale
    })

    // Update stage
    stage.position(constrainedPos)
    stage.scale({ x: clampedScale, y: clampedScale })
  }, [setViewport])

  // Constrain viewport to canvas boundaries
  const constrainViewport = useCallback((x: number, y: number, scale: number) => {
    const stageWidth = width
    const stageHeight = height

    // Calculate bounds
    const minX = stageWidth - CANVAS_WIDTH * scale
    const minY = stageHeight - CANVAS_HEIGHT * scale
    const maxX = 0
    const maxY = 0

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    }
  }, [width, height])

  // Handle mouse down for panning (middle-click or Ctrl+click on Mac)
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle mouse button (button 1) OR Ctrl+left-click (for Mac)
    const isPanTrigger = e.evt.button === 1 || (e.evt.button === 0 && e.evt.ctrlKey)
    
    if (isPanTrigger) {
      e.evt.preventDefault()
      setIsPanning(true)
      const pos = e.target.getStage()?.getPointerPosition()
      if (pos) {
        setLastPanPoint(pos)
      }
    }
  }, [])

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return
    
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    
    const pos = stage.getPointerPosition()
    if (!pos) return
    
    const dx = pos.x - lastPanPoint.x
    const dy = pos.y - lastPanPoint.y
    
    const newPos = {
      x: viewport.x + dx,
      y: viewport.y + dy
    }
    
    // Apply constraints
    const constrainedPos = constrainViewport(newPos.x, newPos.y, viewport.scale)
    
    setViewport({
      x: constrainedPos.x,
      y: constrainedPos.y,
      scale: viewport.scale
    })
    
    setLastPanPoint(pos)
  }, [isPanning, lastPanPoint, viewport, constrainViewport, setViewport])

  // Handle mouse up to stop panning
  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Stop panning on middle-click release or Ctrl+click release
    const isPanRelease = e.evt.button === 1 || (e.evt.button === 0 && isPanning)
    
    if (isPanRelease) {
      setIsPanning(false)
    }
  }, [isPanning])

  // Handle stage click (deselect or create shape)
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only handle left clicks on the stage itself (empty area), not Ctrl+clicks
    if (e.target !== stageRef.current || e.evt.button !== 0 || e.evt.ctrlKey) {
      return
    }
    
    // Don't create shapes if we were panning
    if (isPanning) {
      console.log('Was panning, ignoring click')
      return
    }
    
    // Don't create shapes if user is not authenticated
    if (!user) return
    
    try {
      setIsCreatingShape(true)
      
      // Get click position relative to canvas
      const stage = stageRef.current
      if (!stage) return
      
      const pointerPosition = stage.getPointerPosition()
      if (!pointerPosition) return
      
      // Convert screen coordinates to canvas coordinates
      const canvasX = (pointerPosition.x - viewport.x) / viewport.scale
      const canvasY = (pointerPosition.y - viewport.y) / viewport.scale
      
      // Constrain to canvas boundaries (account for shape size)
      const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - 100, canvasX))
      const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - 100, canvasY))
      
      // Create shape in Firestore
      await createShape(constrainedX, constrainedY, user.uid, user.displayName)
      
      // Deselect any selected shape
      selectShape(null)
      
      console.log(`✨ Shape created at (${constrainedX}, ${constrainedY}) by ${user.displayName}`)
    } catch (error) {
      console.error('Error creating shape:', error)
    } finally {
      setIsCreatingShape(false)
    }
  }, [isPanning, user, viewport, selectShape])

  // Update stage position when viewport changes externally
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    stage.position({ x: viewport.x, y: viewport.y })
    stage.scale({ x: viewport.scale, y: viewport.scale })
  }, [viewport])

  return (
    <div className="relative overflow-hidden bg-white border border-gray-300 rounded-lg shadow-sm">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Grid Layer - Non-interactive background */}
        <GridLayer 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          listening={false}
        />
        
        {/* Shapes Layer - Interactive shapes */}
        <ShapeLayer 
          listening={true}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          isDragging={dragState.isDragging}
          draggingShapeId={dragState.shapeId}
        />
        
        {/* Selection Layer - Visual indicators */}
        <SelectionLayer listening={false} />
        
        {/* Cursors Layer - Multiplayer cursors */}
        <CursorLayer listening={false} />
      </Stage>
      
      {/* Performance and state indicators */}
      <div className="absolute top-2 right-2 space-y-1">
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
          Scale: {(viewport.scale * 100).toFixed(0)}%
        </div>
        {dragState.isDragging && (
          <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded shadow">
            Dragging: {dragState.shapeId}
          </div>
        )}
      </div>
      
      {/* Status indicators */}
      <div className="absolute bottom-2 left-2 space-y-1">
        {isPanning && (
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded shadow">
            Panning canvas...
          </div>
        )}
        
        {isCreatingShape && (
          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded shadow">
            Creating rectangle...
          </div>
        )}
        
        {dragState.isDragging && (
          <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded shadow">
            🎯 Dragging (Snap to grid: {GRID_SIZE}px)
          </div>
        )}
      </div>
    </div>
  )
}

export default Canvas
