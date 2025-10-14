import React from 'react'
import { Layer } from 'react-konva'

interface CursorLayerProps {
  listening: boolean
}

const CursorLayer: React.FC<CursorLayerProps> = ({ listening }) => {
  // TODO: Implement multiplayer cursors
  // This will be connected to Firebase Realtime Database for cursor positions
  
  return (
    <Layer listening={listening}>
      {/* Multiplayer cursors will be rendered here */}
    </Layer>
  )
}

export default CursorLayer
