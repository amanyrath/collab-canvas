import React from 'react'
import { Layer } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'

interface ShapeLayerProps {
  listening: boolean
}

const ShapeLayer: React.FC<ShapeLayerProps> = ({ listening }) => {
  const { shapes } = useCanvasStore()

  return (
    <Layer listening={listening}>
      {/* TODO: Render shapes here */}
      {/* For now, just an empty layer */}
      {shapes.length > 0 && (
        <>{/* Shape components will go here */}</>
      )}
    </Layer>
  )
}

export default ShapeLayer
