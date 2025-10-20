import React, { useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { ShapeType } from '../../utils/types'
import { TEXTURES } from '../../constants/textureManifest'
import { useColorHistory } from '../../hooks/useColorHistory'

interface ShapeSelectorProps {
  currentShapeType: ShapeType
  onShapeTypeChange: (shapeType: ShapeType) => void
  currentColor: string
  onColorChange: (color: string) => void
  customColor: string
  onCustomColorChange: (color: string) => void
  isChristmasMode?: boolean // 🎄 Whether Christmas Mode is active
  selectedTexture?: string | null // 🎄 Currently selected texture
  onTextureChange?: (texture: string) => void // 🎄 Texture selection handler
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
  onCustomColorChange,
  isChristmasMode = false,
  selectedTexture = null,
  onTextureChange
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [tempColor, setTempColor] = useState(customColor)
  const [colorBeforePickerOpen, setColorBeforePickerOpen] = useState(customColor)
  const [showPalettes, setShowPalettes] = useState(false)
  const [savePaletteName, setSavePaletteName] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  
  const { recentColors, savedPalettes, addRecentColor, savePalette, deletePalette } = useColorHistory()
  
  const handleCustomColorClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Store the current color in case user cancels
    setColorBeforePickerOpen(currentColor)
    
    // Apply the current custom color immediately (like other color buttons)
    onColorChange(customColor)
    
    // Open the custom color picker
    setTempColor(customColor)
    setIsPickerOpen(true)
  }
  
  const handleColorPickerChange = (color: string) => {
    // Update temporary color as user drags
    setTempColor(color)
    // ✅ LIVE PREVIEW: Update shape color in real-time
    onColorChange(color)
  }
  
  const handleAcceptColor = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Custom color accepted:', tempColor)
    // Add to recent colors
    addRecentColor(tempColor)
    // Update the custom color slot
    onCustomColorChange(tempColor)
    // Apply to selected shapes
    onColorChange(tempColor)
    // Close the picker
    setIsPickerOpen(false)
  }
  
  const handleColorSelect = (color: string) => {
    addRecentColor(color)
    onColorChange(color)
  }
  
  const handleSavePalette = () => {
    if (!savePaletteName.trim()) return
    
    const colorsToSave = [
      ...colorOptions.map(c => c.value),
      customColor,
      ...recentColors.slice(0, 4)
    ].filter((c, i, arr) => arr.indexOf(c) === i).slice(0, 8)
    
    savePalette(savePaletteName, colorsToSave)
    setSavePaletteName('')
    alert(`Palette "${savePaletteName}" saved!`)
  }
  
  const handleCancelPicker = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // ✅ REVERT: Restore color to what it was before picker opened
    onColorChange(colorBeforePickerOpen)
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
        <div className="text-xs text-gray-500 font-medium mb-1 w-full">
          {isChristmasMode ? '🎄 Festive Shapes' : 'Shape'}
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {/* Rectangle Button (Gift Box in Christmas Mode) */}
        <button
          onClick={() => onShapeTypeChange('rectangle')}
          className={`
            w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-200
            ${currentShapeType === 'rectangle' 
              ? 'border-blue-500 bg-blue-50 text-blue-600' 
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          title={isChristmasMode ? "Gift Box (R)" : "Rectangle (R)"}
        >
          {isChristmasMode ? (
            <span className="text-2xl">🎁</span>
          ) : (
            <div className="w-6 h-4 border-2 border-current rounded-sm"></div>
          )}
        </button>

        {/* Circle Button (Ornament in Christmas Mode) */}
        <button
          onClick={() => onShapeTypeChange('circle')}
          className={`
            w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-200
            ${currentShapeType === 'circle' 
              ? 'border-blue-500 bg-blue-50 text-blue-600' 
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          title={isChristmasMode ? "Ornament (C)" : "Circle (C)"}
        >
          {isChristmasMode ? (
            <span className="text-2xl">🔴</span>
          ) : (
            <div className="w-6 h-6 border-2 border-current rounded-full"></div>
          )}
        </button>

        {/* Triangle Button (Tree in Christmas Mode) */}
        <button
          onClick={() => onShapeTypeChange('triangle')}
          className={`
            w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-200
            ${currentShapeType === 'triangle' 
              ? 'border-blue-500 bg-blue-50 text-blue-600' 
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          title={isChristmasMode ? "Pine Tree (T)" : "Triangle (T)"}
        >
          {isChristmasMode ? (
            <span className="text-2xl">🌲</span>
          ) : (
            <div 
              className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-current"
              style={{ borderBottomColor: 'currentColor' }}
            ></div>
          )}
        </button>
      </div>

      {/* Color/Texture Selector */}
      <div className="border-t border-gray-200 pt-3">
        <div className="text-xs text-gray-500 font-medium mb-2">
          {isChristmasMode ? '🎄 Texture' : 'Color'}
        </div>
        
        {/* 🎄 CHRISTMAS MODE: Texture Picker */}
        {isChristmasMode && onTextureChange ? (
          <div className="flex gap-2 flex-wrap">
            {(() => {
              // Get textures based on current shape type
              let textures: readonly string[] = []
              if (currentShapeType === 'rectangle') {
                textures = [...TEXTURES.gifts, ...TEXTURES.trunks]
              } else if (currentShapeType === 'circle') {
                textures = TEXTURES.ornaments
              } else if (currentShapeType === 'triangle') {
                textures = TEXTURES.trees
              }
              
              return textures.map((texturePath) => (
                <button
                  key={texturePath}
                  onClick={() => onTextureChange(texturePath)}
                  className={`
                    w-12 h-12 rounded-lg border-2 transition-all duration-200 overflow-hidden bg-gray-100
                    ${selectedTexture === texturePath 
                      ? 'border-blue-500 scale-110 ring-2 ring-blue-200' 
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  title={texturePath.split('/').pop()?.replace(/\.\w+$/, '')}
                >
                  <img 
                    src={texturePath} 
                    alt="texture" 
                    className="w-full h-full object-cover"
                  />
                </button>
              ))
            })()}
          </div>
        ) : (
          // NORMAL MODE: Color Picker
          <div className="space-y-3">
            {/* Main color palette */}
            <div className="flex gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorSelect(color.value)}
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
            
            {/* Recent Colors */}
            {recentColors.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 font-medium mb-1.5">Recent</div>
                <div className="flex gap-1.5 flex-wrap">
                  {recentColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      onClick={() => handleColorSelect(color)}
                      className={`
                        w-6 h-6 rounded border transition-all duration-200
                        ${currentColor === color 
                          ? 'border-gray-800 ring-2 ring-gray-300' 
                          : 'border-gray-200 hover:border-gray-400'
                        }
                      `}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Saved Palettes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs text-gray-500 font-medium">Palettes</div>
                <button
                  onClick={() => setShowPalettes(!showPalettes)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showPalettes ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showPalettes && (
                <div className="space-y-2">
                  {/* Save current palette */}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={savePaletteName}
                      onChange={(e) => setSavePaletteName(e.target.value)}
                      placeholder="Palette name..."
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePalette()}
                    />
                    <button
                      onClick={handleSavePalette}
                      disabled={!savePaletteName.trim()}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                  
                  {/* Saved palettes list */}
                  {savedPalettes.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {savedPalettes.map((palette) => (
                        <div key={palette.id} className="bg-gray-50 rounded p-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {palette.name}
                            </span>
                            <button
                              onClick={() => deletePalette(palette.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                              title="Delete palette"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex gap-1">
                            {palette.colors.map((color, idx) => (
                              <button
                                key={`${palette.id}-${idx}`}
                                onClick={() => handleColorSelect(color)}
                                className="w-5 h-5 rounded border border-gray-200 hover:border-gray-400"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic py-1">
                      No saved palettes yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
