import React, { useEffect, useRef, useState } from 'react'
import { Html } from 'react-konva-utils'
import { Shape } from '../../utils/types'

interface TextEditorProps {
  shape: Shape
  stageScale: number
  stageX: number
  stageY: number
  onTextChange: (text: string) => void
  onClose: () => void
}

export const TextEditor: React.FC<TextEditorProps> = ({
  shape,
  stageScale,
  stageX,
  stageY,
  onTextChange,
  onClose
}) => {
  const [text, setText] = useState(shape.text || '')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Focus and select all text when editor opens
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const handleSave = () => {
    onTextChange(text)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Calculate screen position from canvas coordinates
  const screenX = shape.x * stageScale + stageX
  const screenY = shape.y * stageScale + stageY
  const screenWidth = shape.width * stageScale
  const screenHeight = shape.height * stageScale

  return (
    <Html>
      <div
        style={{
          position: 'absolute',
          left: `${screenX}px`,
          top: `${screenY}px`,
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          zIndex: 9999,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            padding: '8px',
            fontSize: `${Math.max(12, shape.fontSize * stageScale)}px`,
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            border: '2px solid #0066ff',
            borderRadius: '4px',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'white',
            color: shape.textColor || '#000000',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          placeholder="Type text here..."
        />
      </div>
    </Html>
  )
}

