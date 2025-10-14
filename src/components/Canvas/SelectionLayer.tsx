import React from 'react'
import { Layer } from 'react-konva'

interface SelectionLayerProps {
  listening: boolean
}

// ✅ SIMPLIFIED: No separate selection layer - selection handled in ShapeLayer via locks
const SelectionLayer: React.FC<SelectionLayerProps> = ({ listening }) => {
  // Selection visuals now built into ShapeLayer (colored stroke for locked shapes)
  return <Layer listening={listening} />
}

export default SelectionLayer
