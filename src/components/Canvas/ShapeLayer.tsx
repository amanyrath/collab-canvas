import React, { useCallback } from 'react'
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

  // Handle shape click (selection)
  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true
    e.evt.stopPropagation()
    
    if (!isLockedByOthers && !isDragging) {
      selectShape(shape.id)
      console.log(`🎯 Selected shape: ${shape.id}`)
    }
  }, [shape.id, selectShape, isLockedByOthers, isDragging])

  // Handle mouse down (potential drag start)
  const handleMouseDown = useCallback((e: any) => {
    if (!user || isLockedByOthers || isDragging) return
    
    e.cancelBubble = true
    e.evt.stopPropagation()
    
    // Start drag
    onDragStart(shape.id, shape.x, shape.y)
  }, [user, isLockedByOthers, isDragging, onDragStart, shape.id, shape.x, shape.y])

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: any) => {
    if (!isBeingDragged) return
    
    const stage = e.target.getStage()
    if (!stage) return
    
    const pos = stage.getPointerPosition()
    if (!pos) return
    
    // Convert to canvas coordinates
    const canvasX = (pos.x - stage.x()) / stage.scaleX()
    const canvasY = (pos.y - stage.y()) / stage.scaleY()
    
    onDragMove(canvasX, canvasY)
  }, [isBeingDragged, onDragMove])

  // Handle mouse up (drag end)
  const handleMouseUp = useCallback(() => {
    if (isBeingDragged) {
      onDragEnd()
    }
  }, [isBeingDragged, onDragEnd])

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
