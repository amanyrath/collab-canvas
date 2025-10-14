import React, { useCallback } from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'

interface ShapeLayerProps {
  listening: boolean
  onDragStart: (shapeId: string, x: number, y: number) => Promise<boolean>
  onDragMove: (x: number, y: number) => void
  onDragEnd: (finalX: number, finalY: number) => void
  isDragging: boolean
  draggingShapeId: string | null
}

// Individual shape component with React.memo for performance
const ShapeComponent: React.FC<{ 
  shape: Shape
  onDragStart: (shapeId: string, x: number, y: number) => Promise<boolean>
  onDragMove: (x: number, y: number) => void
  onDragEnd: (finalX: number, finalY: number) => void
  isDragging: boolean
  draggingShapeId: string | null
}> = React.memo(({ shape, onDragStart, onDragMove, onDragEnd, isDragging, draggingShapeId }) => {
  const { selectShape, selectedShapeId } = useCanvasStore()
  const { user } = useUserStore()
  
  const isSelected = selectedShapeId === shape.id
  const isLocked = shape.isLocked
  const isLockedByOthers = isLocked && shape.lockedBy !== user?.uid
  const isBeingDragged = isDragging && draggingShapeId === shape.id
  
  // Determine if shape can be dragged
  const isDraggable = !isLockedByOthers && !!user

  // Handle shape click (selection only)
  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true
    e.evt.stopPropagation()
    
    // Only select if we're not dragging and not locked by others
    if (!isLockedByOthers && !isDragging) {
      selectShape(shape.id)
      console.log(`🎯 Selected shape: ${shape.id}`)
    }
  }, [shape.id, selectShape, isLockedByOthers, isDragging])

  // Konva drag start handler
  const handleKonvaDragStart = useCallback(async (e: any) => {
    const node = e.target
    console.log(`🚀 Konva drag start: ${shape.id}`)
    
    // Call parent drag start handler
    const success = await onDragStart(shape.id, node.x(), node.y())
    if (!success) {
      // Lock failed, stop Konva's drag operation immediately
      e.target.stopDrag()
      console.warn(`❌ Failed to start drag for shape: ${shape.id}`)
    }
  }, [onDragStart, shape.id])

  // Konva drag move handler
  const handleKonvaDragMove = useCallback((e: any) => {
    const node = e.target
    onDragMove(node.x(), node.y())
  }, [onDragMove])

  // Konva drag end handler
  const handleKonvaDragEnd = useCallback((e: any) => {
    const node = e.target
    console.log(`🎯 Konva drag end: ${shape.id} -> (${node.x()}, ${node.y()})`)
    onDragEnd(node.x(), node.y())
  }, [onDragEnd, shape.id])

  // Determine cursor style
  const getCursor = () => {
    if (isLockedByOthers) return 'not-allowed'
    if (isBeingDragged) return 'grabbing'
    if (isDraggable && isSelected) return 'grab'
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
        stroke={isSelected ? (user?.cursorColor || '#0066ff') : isLockedByOthers ? '#ff6b6b' : 'transparent'}
        strokeWidth={isSelected || isLockedByOthers ? 2 : 0}
        opacity={isLockedByOthers ? 0.7 : 1}
        draggable={isDraggable}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={handleKonvaDragStart}
        onDragMove={handleKonvaDragMove}
        onDragEnd={handleKonvaDragEnd}
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
