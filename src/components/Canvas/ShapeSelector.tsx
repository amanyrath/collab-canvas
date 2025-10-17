import React, { useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
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
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [tempColor, setTempColor] = useState(customColor)
  const pickerRef = useRef<HTMLDivElement>(null)
  
  const handleCustomColorClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Apply the current custom color immediately (like other color buttons)
    onColorChange(customColor)
    
    // Open the custom color picker
    setTempColor(customColor)
    setIsPickerOpen(true)
  }
  
  const handleColorPickerChange = (color: string) => {
    // Update temporary color as user drags
    setTempColor(color)
  }
  
  const handleAcceptColor = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Custom color accepted:', tempColor)
    // Update the custom color slot
    onCustomColorChange(tempColor)
    // Apply to selected shapes
    onColorChange(tempColor)
    // Close the picker
    setIsPickerOpen(false)
  }
  
  const handleCancelPicker = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsPickerOpen(false)
  }
  
  // Close picker when clicking outside
  React.useEffect(() => {
    if (!isPickerOpen) return undefined
    
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPickerOpen])
  
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
          <div className="relative">
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
              {/* Small paint brush icon in corner */}
              <div className="absolute bottom-0 right-0 p-0.5">
                <svg className="w-3 h-3 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
            </button>
            
            {/* Custom Color Picker Popover */}
            {isPickerOpen && (
              <div 
                ref={pickerRef}
                className="absolute left-0 top-10 z-50 bg-white rounded-lg shadow-xl border border-gray-300 p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <HexColorPicker color={tempColor} onChange={handleColorPickerChange} />
                
                {/* Color preview and hex input */}
                <div className="mt-2 flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border-2 border-gray-300"
                    style={{ backgroundColor: tempColor }}
                  />
                  <input
                    type="text"
                    value={tempColor}
                    onChange={(e) => setTempColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono uppercase"
                    placeholder="#000000"
                  />
                </div>
                
                {/* Action buttons */}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleAcceptColor}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Apply
                  </button>
                  <button
                    onClick={handleCancelPicker}
                    className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded text-sm text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
