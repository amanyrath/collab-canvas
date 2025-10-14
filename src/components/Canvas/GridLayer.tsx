import React from 'react'
import { Layer, Rect, Line } from 'react-konva'

interface GridLayerProps {
  width: number
  height: number
  listening: boolean
}

const GridLayer: React.FC<GridLayerProps> = ({ width, height, listening }) => {
  const gridSize = 50 // Grid spacing in pixels
  
  // Generate vertical lines
  const verticalLines = []
  for (let i = 0; i <= width / gridSize; i++) {
    const x = i * gridSize
    verticalLines.push(
      <Line
        key={`v-${i}`}
        points={[x, 0, x, height]}
        stroke="#f0f0f0"
        strokeWidth={0.5}
        listening={false}
      />
    )
  }
  
  // Generate horizontal lines
  const horizontalLines = []
  for (let i = 0; i <= height / gridSize; i++) {
    const y = i * gridSize
    horizontalLines.push(
      <Line
        key={`h-${i}`}
        points={[0, y, width, y]}
        stroke="#f0f0f0"
        strokeWidth={0.5}
        listening={false}
      />
    )
  }
  
  return (
    <Layer listening={listening}>
      {/* Canvas background */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="white"
        listening={false}
      />
      
      {/* Grid lines */}
      {verticalLines}
      {horizontalLines}
      
      {/* Canvas border */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke="#cccccc"
        strokeWidth={2}
        fill="transparent"
        listening={false}
      />
    </Layer>
  )
}

export default GridLayer
