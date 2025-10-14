import React from 'react'
import { ShapeType } from '../../utils/types'

interface ShapeSelectorProps {
  currentShapeType: ShapeType
  onShapeTypeChange: (shapeType: ShapeType) => void
  currentColor: string
  onColorChange: (color: string) => void
}

const colorOptions = [
  { name: 'Red', value: '#ef4444', shortcut: '1' },
  { name: 'Green', value: '#22c55e', shortcut: '2' }, 
  { name: 'Blue', value: '#3b82f6', shortcut: '3' }
]

export const ShapeSelector: React.FC<ShapeSelectorProps> = ({
  currentShapeType,
  onShapeTypeChange,
  currentColor,
  onColorChange
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      {/* Shape Type Selector */}
      <div className="flex gap-2 mb-3">
        <div className="text-xs text-gray-500 font-medium mb-1 w-full">Shape</div>
      </div>
      <div className="flex gap-2 mb-4">
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

      {/* Color Selector */}
      <div className="border-t border-gray-200 pt-3">
        <div className="text-xs text-gray-500 font-medium mb-2">Color</div>
        <div className="flex gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className={`
                w-8 h-8 rounded-lg border-2 transition-all duration-200 relative
                ${currentColor === color.value 
                  ? 'border-gray-800 scale-110' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
              style={{ backgroundColor: color.value }}
              title={`${color.name} (${color.shortcut})`}
            >
              {/* Checkmark for selected color */}
              {currentColor === color.value && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
