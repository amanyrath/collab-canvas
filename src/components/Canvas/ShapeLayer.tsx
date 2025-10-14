import React, { useCallback, useState } from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'

interface ShapeLayerProps {
  listening: boolean
  onDragStart: (shapeId: string, x: number, y: number) => Promise<boolean>
  onDragMove: (x: number, y: number) => void
  onDragEnd: () => void
  isDragging: boolean
  draggingShapeId: string | null
}

// Individual shape component with React.memo for performance
const ShapeComponent: React.FC<{ 
  shape: Shape
  onDragStart: (shapeId: string, x: number, y: number) => Promise<boolean>
  onDragMove: (x: number, y: number) => void
  onDragEnd: () => void
  isDragging: boolean
  draggingShapeId: string | null
}> = React.memo(({ shape, onDragStart, onDragMove, onDragEnd, isDragging, draggingShapeId }) => {
  const { selectShape, selectedShapeId } = useCanvasStore()
  const { user } = useUserStore()
  
  const isSelected = selectedShapeId === shape.id
  const isLocked = shape.isLocked
  const isLockedByOthers = isLocked && shape.lockedBy !== user?.uid
  const isBeingDragged = isDragging && draggingShapeId === shape.id

  // State for click vs drag detection
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null)
  const [mouseDownTime, setMouseDownTime] = useState<number>(0)
  const dragThreshold = 5 // pixels to move before considering it a drag
  const clickTimeout = 150 // ms to wait before starting drag

  // Handle shape click (selection only)
  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true
    e.evt.stopPropagation()
    
    if (!isLockedByOthers && !isDragging) {
      selectShape(shape.id)
      console.log(`🎯 Selected shape: ${shape.id}`)
    }
  }, [shape.id, selectShape, isLockedByOthers, isDragging])

  // Handle mouse down (start click/drag detection)
  const handleMouseDown = useCallback((e: any) => {
    if (!user || isLockedByOthers || isDragging) return
    
    e.cancelBubble = true
    e.evt.stopPropagation()
    
    const stage = e.target.getStage()
    if (!stage) return
    
    const pos = stage.getPointerPosition()
    if (!pos) return
    
    // Record mouse down position and time
    setMouseDownPos(pos)
    setMouseDownTime(Date.now())
    
    // Set a timeout to start drag if mouse is held down
    setTimeout(() => {
      const currentPos = stage.getPointerPosition()
      if (!currentPos || !mouseDownPos) return
      
      // Check if mouse is still down and hasn't moved much
      const distance = Math.sqrt(
        Math.pow(currentPos.x - pos.x, 2) + Math.pow(currentPos.y - pos.y, 2)
      )
      
      // If mouse is still in roughly the same position, start drag
      if (distance < dragThreshold && mouseDownPos) {
        console.log(`🚀 Starting drag after hold: ${shape.id}`)
        onDragStart(shape.id, shape.x, shape.y)
        setMouseDownPos(null) // Clear to prevent click
      }
    }, clickTimeout)
    
  }, [user, isLockedByOthers, isDragging, onDragStart, shape.id, shape.x, shape.y, mouseDownPos, dragThreshold, clickTimeout])

  // Handle mouse move during potential drag
  const handleMouseMove = useCallback((e: any) => {
    if (isBeingDragged) {
      // Already dragging - update position with simple coordinate conversion
      const stage = e.target.getStage()
      if (!stage) return
      
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      // Simple coordinate conversion for better performance
      const canvasX = (pos.x - stage.x()) / stage.scaleX()
      const canvasY = (pos.y - stage.y()) / stage.scaleY()
      
      // Direct call to Canvas drag handler - no throttling here
      onDragMove(canvasX, canvasY)
    } else if (mouseDownPos) {
      // Check if we should start dragging due to mouse movement
      const stage = e.target.getStage()
      if (!stage) return
      
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      const distance = Math.sqrt(
        Math.pow(pos.x - mouseDownPos.x, 2) + Math.pow(pos.y - mouseDownPos.y, 2)
      )
      
      // If moved beyond threshold, start drag immediately
      if (distance > dragThreshold) {
        console.log(`🚀 Starting drag due to movement: ${shape.id}`)
        onDragStart(shape.id, shape.x, shape.y)
        setMouseDownPos(null)
      }
    }
  }, [isBeingDragged, onDragMove, mouseDownPos, onDragStart, shape.id, shape.x, shape.y, dragThreshold])

  // Handle mouse up
  const handleMouseUp = useCallback((e: any) => {
    if (isBeingDragged) {
      // End drag
      onDragEnd()
    } else if (mouseDownPos) {
      // This was a click, not a drag
      const clickDuration = Date.now() - mouseDownTime
      
      // Only trigger click if it was quick and didn't move much
      if (clickDuration < clickTimeout) {
        handleClick(e)
      }
      
      setMouseDownPos(null)
    }
  }, [isBeingDragged, onDragEnd, mouseDownPos, mouseDownTime, clickTimeout, handleClick])

  // Clear mouse down state if dragging starts from elsewhere
  React.useEffect(() => {
    if (isDragging && draggingShapeId !== shape.id) {
      setMouseDownPos(null)
    }
  }, [isDragging, draggingShapeId, shape.id])

  // Determine cursor style
  const getCursor = () => {
    if (isLockedByOthers) return 'not-allowed'
    if (isBeingDragged) return 'grabbing'
    if (isSelected && !isLocked) return 'grab'
    return 'default'
  }

  return (
    <>
      {/* Rectangle */}
      <Rect
        id={`shape-${shape.id}`} // Important: ID for Canvas drag system
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onMouseEnter={(e) => {
          e.target.getStage()!.container().style.cursor = getCursor()
        }}
        onMouseLeave={(e) => {
          if (!isBeingDragged) {
            e.target.getStage()!.container().style.cursor = 'default'
          }
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

const ShapeLayer: React.FC<ShapeLayerProps> = ({ 
  listening, 
  onDragStart, 
  onDragMove, 
  onDragEnd, 
  isDragging, 
  draggingShapeId 
}) => {
  const { shapes } = useCanvasStore()

  return (
    <Layer listening={listening}>
      {shapes.map((shape) => (
        <ShapeComponent 
          key={shape.id} 
          shape={shape}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          isDragging={isDragging}
          draggingShapeId={draggingShapeId}
        />
      ))}
    </Layer>
  )
}

export default ShapeLayer
