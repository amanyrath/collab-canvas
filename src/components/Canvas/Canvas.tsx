import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { useShapeSync } from '../../hooks/useShapeSync'
import { usePresenceMonitor } from '../../hooks/usePresenceMonitor'
import { createShape } from '../../utils/shapeUtils'
import GridLayer from './GridLayer'
import ShapeLayer from './ShapeLayer'
import CursorLayer from './CursorLayer'
import SelectionLayer from './SelectionLayer'

const CANVAS_WIDTH = 5000
const CANVAS_HEIGHT = 5000

interface CanvasProps {
  width: number
  height: number
}

const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  
  const { selectShape } = useCanvasStore()
  const { user } = useUserStore()
  
  useShapeSync()
  usePresenceMonitor()

  // ✅ HYBRID: Custom space handling + Konva draggable
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        e.preventDefault()
        setIsSpacePressed(true)
        
        // ✅ CUSTOM: Only enable stage dragging when no shapes are being interacted with
        const stage = stageRef.current
        if (stage) {
          // Disable all shape interactions during space+drag
          stage.find('Rect').forEach(rect => rect.draggable(false))
          stage.draggable(true)
        }
        console.log('⌨️ Space pressed - panning mode enabled')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        
        const stage = stageRef.current
        if (stage) {
          stage.draggable(false)
          // Re-enable shape dragging
          stage.find('Rect').forEach(rect => {
            // Check if shape should be draggable (not locked by others)
            const shapeId = rect.id()
            const { shapes } = useCanvasStore.getState()
            const shape = shapes.find(s => s.id === shapeId)
            const isLockedByOthers = shape?.isLocked && shape?.lockedBy !== user?.uid
            rect.draggable(!isLockedByOthers && !!user)
          })
        }
        console.log('⌨️ Space released - panning mode disabled')
      }
    }

    const handleWindowBlur = () => {
      setIsSpacePressed(false)
      const stage = stageRef.current
      if (stage) {
        stage.draggable(false)
      }
      console.log('🪟 Window blur - reset panning state')
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [isSpacePressed, user])

  // ✅ HYBRID: Custom boundary constraints for stage dragging
  const stageDragBound = useCallback((pos: { x: number; y: number }) => {
    const minX = width - CANVAS_WIDTH
    const minY = height - CANVAS_HEIGHT
    return {
      x: Math.max(minX, Math.min(0, pos.x)),
      y: Math.max(minY, Math.min(0, pos.y))
    }
  }, [width, height])

  // ✅ BUILT-IN: Simple click handling
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current || isSpacePressed) return

    const { selectedShapeId } = useCanvasStore.getState()
    
    if (selectedShapeId) {
      selectShape(null)
      console.log('🎯 Deselected shape:', selectedShapeId)
      return
    }
    
    if (!user) return
    
    const stage = stageRef.current!
    const canvasPos = stage.getRelativePointerPosition()!
    
    await createShape(
      Math.max(0, Math.min(CANVAS_WIDTH - 100, canvasPos.x)),
      Math.max(0, Math.min(CANVAS_HEIGHT - 100, canvasPos.y)),
      user.uid, 
      user.displayName
    )
    console.log(`✨ Shape created at (${canvasPos.x}, ${canvasPos.y})`)
  }, [isSpacePressed, user, selectShape])

  return (
    <div className={`relative overflow-hidden bg-white border border-gray-300 rounded-lg shadow-sm ${
      isSpacePressed ? 'cursor-grab' : 'cursor-default'
    }`}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable={false}
        dragBoundFunc={isSpacePressed ? stageDragBound : undefined}
        // ✅ BUILT-IN: Simple wheel zoom
        onWheel={(e) => {
          e.evt.preventDefault()
          const stage = stageRef.current!
          const scaleBy = 1.05
          const oldScale = stage.scaleX()
          const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
          const clampedScale = Math.max(0.1, Math.min(3, newScale))
          
          const pointer = stage.getPointerPosition()!
          const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
          }
          
          stage.scale({ x: clampedScale, y: clampedScale })
          
          // ✅ CUSTOM: Apply boundary constraints after zoom
          const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
          }
          
          const constrainedPos = stageDragBound(newPos)
          stage.position(constrainedPos)
        }}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <GridLayer width={CANVAS_WIDTH} height={CANVAS_HEIGHT} listening={false} />
        <ShapeLayer listening={!isSpacePressed} />
        <SelectionLayer listening={false} />
        <CursorLayer listening={false} />
      </Stage>
      
      <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
        Scale: {stageRef.current ? (stageRef.current.scaleX() * 100).toFixed(0) : '100'}%
      </div>
      
      {isSpacePressed && (
        <div className="absolute bottom-2 left-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded shadow">
          Space + Drag to Pan
        </div>
      )}
    </div>
  )
}

export default Canvas
