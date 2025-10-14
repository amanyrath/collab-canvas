import React, { useRef, useCallback, useState, useEffect } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { useShapeSync } from '../../hooks/useShapeSync'
import { createShape, updateShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock } from '../../utils/lockUtils'
import GridLayer from './GridLayer'
import SimpleShapeLayer from './SimpleShapeLayer'

// Constants
const CANVAS_WIDTH = 5000
const CANVAS_HEIGHT = 5000
const MIN_SCALE = 0.1
const MAX_SCALE = 3
const GRID_SIZE = 20

interface CanvasProps {
  width: number
  height: number
}

const SimpleCanvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  
  const { viewport, setViewport, selectShape, shapes, updateShape: updateLocalShape } = useCanvasStore()
  const { user } = useUserStore()
  
  // Set up real-time shape synchronization
  useShapeSync()

  // Snap to grid utility
  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }, [])

  // Simple drag handlers - called from ShapeLayer
  const handleDragStart = useCallback(async (shapeId: string): Promise<boolean> => {
    if (!user) return false

    console.log(`🚀 Starting drag: ${shapeId}`)
    
    // Try to acquire lock
    const lockResult = await acquireLock(shapeId, user.uid, user.displayName)
    if (!lockResult.success) {
      console.warn('Failed to acquire lock')
      return false
    }

    // Select the shape being dragged
    selectShape(shapeId)
    return true
  }, [user, selectShape])

  const handleDragEnd = useCallback(async (shapeId: string, finalX: number, finalY: number) => {
    if (!user) return

    console.log(`🎯 Ending drag: ${shapeId} -> (${finalX}, ${finalY})`)

    const shape = shapes.find(s => s.id === shapeId)
    if (!shape) return

    // Apply snap to grid and constraints
    const snappedX = snapToGrid(finalX)
    const snappedY = snapToGrid(finalY)
    const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - shape.width, snappedX))
    const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - shape.height, snappedY))

    try {
      // Update position in Firestore and local store
      await updateShape(shapeId, { x: constrainedX, y: constrainedY }, user.uid)
      updateLocalShape(shapeId, { x: constrainedX, y: constrainedY })

      // Release lock
      await releaseLock(shapeId, user.uid, user.displayName)
      
      console.log(`✅ Drag completed and synced`)
    } catch (error) {
      console.error('Error ending drag:', error)
    }
  }, [user, shapes, snapToGrid, updateLocalShape])

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.05
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }

    const constrainedPos = constrainViewport(newPos.x, newPos.y, clampedScale)

    setViewport({
      x: constrainedPos.x,
      y: constrainedPos.y,
      scale: clampedScale
    })

    stage.position(constrainedPos)
    stage.scale({ x: clampedScale, y: clampedScale })
  }, [setViewport])

  // Constrain viewport
  const constrainViewport = useCallback((x: number, y: number, scale: number) => {
    const minX = width - CANVAS_WIDTH * scale
    const minY = height - CANVAS_HEIGHT * scale
    const maxX = 0
    const maxY = 0

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    }
  }, [width, height])

  // Handle panning
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.ctrlKey)) {
      e.evt.preventDefault()
      setIsPanning(true)
      const pos = e.target.getStage()?.getPointerPosition()
      if (pos) setLastPanPoint(pos)
    }
  }, [])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return
    
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
    
    const constrainedPos = constrainViewport(newPos.x, newPos.y, viewport.scale)
    
    setViewport({
      x: constrainedPos.x,
      y: constrainedPos.y,
      scale: viewport.scale
    })
    
    setLastPanPoint(pos)
  }, [isPanning, lastPanPoint, viewport, constrainViewport, setViewport])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Handle stage click for creating shapes and deselecting
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current || e.evt.button !== 0 || e.evt.ctrlKey) return
    if (isPanning) return
    
    // Always deselect first
    selectShape(null)
    
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

  // Update stage position when viewport changes
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
        <GridLayer 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          listening={false}
        />
        
        <SimpleShapeLayer 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      </Stage>
      
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

export default SimpleCanvas
