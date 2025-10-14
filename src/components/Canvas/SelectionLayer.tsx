import React from 'react'
import { Layer, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'

interface SelectionLayerProps {
  listening: boolean
}

const SelectionLayer: React.FC<SelectionLayerProps> = ({ listening }) => {
  const { getSelectedShape } = useCanvasStore()
  const selectedShape = getSelectedShape()

  if (!selectedShape) return <Layer listening={listening} />

  return (
    <Layer listening={listening}>
      {/* Selection border */}
      <Rect
        x={selectedShape.x - 2}
        y={selectedShape.y - 2}
        width={selectedShape.width + 4}
        height={selectedShape.height + 4}
        stroke="#0066ff"
        strokeWidth={2}
        fill="transparent"
        dash={[5, 5]}
        listening={false}
      />
      
      {/* Selection handles (corners) */}
      {[-2, selectedShape.width + 2].map(x => (
        [-2, selectedShape.height + 2].map(y => (
          <Rect
            key={`handle-${x}-${y}`}
            x={selectedShape.x + x - 3}
            y={selectedShape.y + y - 3}
            width={6}
            height={6}
            fill="#0066ff"
            stroke="white"
            strokeWidth={1}
            listening={false}
          />
        ))
      ))}
    </Layer>
  )
}

export default SelectionLayer
