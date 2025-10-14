import React from 'react'
import { ShapeType } from '../../utils/types'

interface ShapeSelectorProps {
  currentShapeType: ShapeType
  onShapeTypeChange: (shapeType: ShapeType) => void
}

export const ShapeSelector: React.FC<ShapeSelectorProps> = ({
  currentShapeType,
  onShapeTypeChange
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2">
      {/* Rectangle Button */}
      <button
        onClick={() => onShapeTypeChange('rectangle')}
        className={`
          w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-200
          ${currentShapeType === 'rectangle' 
            ? 'border-blue-500 bg-blue-50 text-blue-600' 
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
        title="Rectangle (R)"
      >
        <div className="w-6 h-4 border-2 border-current rounded-sm"></div>
      </button>

      {/* Circle Button */}
      <button
        onClick={() => onShapeTypeChange('circle')}
        className={`
          w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-200
          ${currentShapeType === 'circle' 
            ? 'border-blue-500 bg-blue-50 text-blue-600' 
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
        title="Circle (C)"
      >
        <div className="w-6 h-6 border-2 border-current rounded-full"></div>
      </button>
    </div>
  )
}
