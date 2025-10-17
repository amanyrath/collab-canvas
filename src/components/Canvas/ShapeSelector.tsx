import React, { useRef } from 'react'
import { ShapeType } from '../../utils/types'

interface ShapeSelectorProps {
  currentShapeType: ShapeType
  onShapeTypeChange: (shapeType: ShapeType) => void
  currentColor: string
  onColorChange: (color: string) => void
  customColor: string
  onCustomColorChange: (color: string) => void
}

const colorOptions = [
  { name: 'Red', value: '#ef4444', shortcut: '1' },
  { name: 'Green', value: '#22c55e', shortcut: '2' }, 
  { name: 'Blue', value: '#3b82f6', shortcut: '3' },
  { name: 'Grey', value: '#CCCCCC', shortcut: '4' }
]

export const ShapeSelector: React.FC<ShapeSelectorProps> = ({
  currentShapeType,
  onShapeTypeChange,
  currentColor,
  onColorChange,
  customColor,
  onCustomColorChange
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null)
  
  const handleCustomColorClick = () => {
    colorInputRef.current?.click()
  }
  
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    onCustomColorChange(newColor)
    onColorChange(newColor)
  }
  
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
          
          {/* Custom Color Picker */}
          <button
            onClick={handleCustomColorClick}
            className={`
              w-8 h-8 rounded-lg border-2 transition-all duration-200 relative overflow-hidden
              ${currentColor === customColor 
                ? 'border-gray-800 scale-110' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
            style={{ backgroundColor: customColor }}
            title="Custom Color (5)"
          >
            {/* Small paint brush icon in corner - no overlay */}
            <div className="absolute bottom-0 right-0 p-0.5">
              <svg className="w-3 h-3 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            
            {/* Checkmark for selected color - no dark overlay */}
            {currentColor === customColor && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
          
          {/* Hidden color input */}
          <input
            ref={colorInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}
