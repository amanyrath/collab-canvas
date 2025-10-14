import React, { useCallback } from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'

interface SimpleShapeLayerProps {
  onDragStart: (shapeId: string) => Promise<boolean>
  onDragEnd: (shapeId: string, finalX: number, finalY: number) => void
}

const SimpleShape: React.FC<{ 
  shape: Shape
  onDragStart: (shapeId: string) => Promise<boolean>
  onDragEnd: (shapeId: string, finalX: number, finalY: number) => void
}> = ({ shape, onDragStart, onDragEnd }) => {
  const { selectShape, selectedShapeId } = useCanvasStore()
  const { user } = useUserStore()
  
  const isSelected = selectedShapeId === shape.id
  const isLocked = shape.isLocked
  const isLockedByOthers = isLocked && shape.lockedBy !== user?.uid
  const isDraggable = !isLockedByOthers && !!user

  // Handle shape selection
  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true
    if (!isLockedByOthers) {
      selectShape(shape.id)
      console.log(`🎯 Selected shape: ${shape.id}`)
    }
  }, [shape.id, selectShape, isLockedByOthers])

  // Konva drag start - simple and clean
  const handleDragStart = useCallback(async (e: any) => {
    console.log(`🚀 Drag start: ${shape.id}`)
    
    const success = await onDragStart(shape.id)
    if (!success) {
      // Stop drag if lock failed
      e.target.stopDrag()
      console.warn(`❌ Drag stopped - lock failed: ${shape.id}`)
    }
  }, [onDragStart, shape.id])

  // Konva drag end - pass final position
  const handleDragEnd = useCallback((e: any) => {
    const node = e.target
    console.log(`🎯 Drag end: ${shape.id} -> (${node.x()}, ${node.y()})`)
    onDragEnd(shape.id, node.x(), node.y())
  }, [onDragEnd, shape.id])

  return (
    <>
      <Rect
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      
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
      
      {isLockedByOthers && (
        <Text
          x={shape.x}
          y={shape.y - 20}
          text="🔒 Locked"
          fontSize={12}
          fontFamily="sans-serif"
          fill="#ff6b6b"
          listening={false}
        />
      )}
    </>
  )
}

const SimpleShapeLayer: React.FC<SimpleShapeLayerProps> = ({ onDragStart, onDragEnd }) => {
  const { shapes } = useCanvasStore()

  return (
    <Layer>
      {shapes.map((shape) => (
        <SimpleShape 
          key={shape.id} 
          shape={shape}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </Layer>
  )
}

export default SimpleShapeLayer
