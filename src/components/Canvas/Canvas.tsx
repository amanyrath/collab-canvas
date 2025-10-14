import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { useShapeSync } from '../../hooks/useShapeSync'
import { usePresenceMonitor } from '../../hooks/usePresenceMonitor'
import { createShape } from '../../utils/shapeUtils'
import GridLayer from './GridLayer'
import ShapeLayer from './ShapeLayer'
import CursorLayer from './CursorLayer'
import SelectionLayer from './SelectionLayer'

// Canvas constants
const CANVAS_WIDTH = 5000
const CANVAS_HEIGHT = 5000
const MIN_SCALE = 0.1
const MAX_SCALE = 3

interface CanvasProps {
  width: number
  height: number
}

const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  
  const { viewport, setViewport, selectShape } = useCanvasStore()
  const { user } = useUserStore()
  
  // Set up real-time shape synchronization
  useShapeSync()

  // Monitor user presence and cleanup locks for disconnected users
  usePresenceMonitor()

  // All drag logic is now handled by ShapeLayer using Konva's built-ins

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

  // Smart stage click - deselect if something selected, otherwise create shape
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current || e.evt.button !== 0 || e.evt.ctrlKey || isPanning) {
      return
    }
    
    // Check if something is currently selected
    const { selectedShapeId } = useCanvasStore.getState()
    
    if (selectedShapeId) {
      // Something is selected, just deselect it (don't create new shape)
      console.log('🎯 Deselecting shape:', selectedShapeId)
      selectShape(null)
      return
    }
    
    // Nothing selected, create new shape
    if (!user) return
    
    try {
      const stage = stageRef.current
      if (!stage) return
      
      const pointerPosition = stage.getPointerPosition()
      if (!pointerPosition) return
      
      const canvasX = (pointerPosition.x - viewport.x) / viewport.scale
      const canvasY = (pointerPosition.y - viewport.y) / viewport.scale
      
      const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - 100, canvasX))
      const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - 100, canvasY))
      
      await createShape(constrainedX, constrainedY, user.uid, user.displayName)
      
      console.log(`✨ Shape created at (${constrainedX}, ${constrainedY})`)
    } catch (error) {
      console.error('Error creating shape:', error)
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
        <ShapeLayer listening={true} />
        
        {/* Selection Layer - Visual indicators */}
        <SelectionLayer listening={false} />
        
        {/* Cursors Layer - Multiplayer cursors */}
        <CursorLayer listening={false} />
      </Stage>
      
      {/* Simple indicators */}
      <div className="absolute top-2 right-2">
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
          Scale: {(viewport.scale * 100).toFixed(0)}%
        </div>
      </div>
      
        {isPanning && (
        <div className="absolute bottom-2 left-2">
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded shadow">
            Panning...
          </div>
          </div>
        )}
    </div>
  )
}

export default Canvas
