import React from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { Shape } from '../../utils/types'

interface ShapeLayerProps {
  listening: boolean
}

// Individual shape component with React.memo for performance
const ShapeComponent: React.FC<{ shape: Shape }> = React.memo(({ shape }) => {
  const { selectShape, selectedShapeId } = useCanvasStore()
  
  const handleClick = (e: any) => {
    e.cancelBubble = true // Prevent event from bubbling to stage
    selectShape(shape.id)
  }

  const isSelected = selectedShapeId === shape.id

  return (
    <>
      {/* Rectangle */}
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        fill={shape.fill}
        stroke={isSelected ? '#0066ff' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        onClick={handleClick}
        onTap={handleClick}
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
