import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import GridLayer from './GridLayer'
import ShapeLayer from './ShapeLayer'
import CursorLayer from './CursorLayer'
import SelectionLayer from './SelectionLayer'

// Canvas constants from PRD
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
  const [isDragging, setIsDragging] = useState(false)
  
  const { viewport, setViewport, selectShape } = useCanvasStore()

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

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false)
    
    const stage = e.target as Konva.Stage
    const pos = stage.position()
    const scale = stage.scaleX()
    
    // Apply constraints
    const constrainedPos = constrainViewport(pos.x, pos.y, scale)
    
    // Update viewport
    setViewport({
      x: constrainedPos.x,
      y: constrainedPos.y,
      scale
    })

    // Update stage if position changed
    if (constrainedPos.x !== pos.x || constrainedPos.y !== pos.y) {
      stage.position(constrainedPos)
    }
  }, [constrainViewport, setViewport])

  // Handle stage click (deselect)
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only deselect if clicking on the stage itself (empty area)
    if (e.target === stageRef.current) {
      selectShape(null)
    }
  }, [selectShape])

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
        draggable
        onWheel={handleWheel}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
      
      {/* Performance indicator */}
      <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
        Scale: {(viewport.scale * 100).toFixed(0)}%
      </div>
      
      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute bottom-2 left-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded shadow">
          Panning canvas...
        </div>
      )}
    </div>
  )
}

export default Canvas
