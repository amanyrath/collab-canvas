import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { useShapeSync } from '../../hooks/useShapeSync'
import { usePresenceMonitor } from '../../hooks/usePresenceMonitor'
import { createShape, deleteShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock } from '../../utils/lockUtils'
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
  
  // ✅ SIMPLIFIED: No selection state - using locks only
  const { user } = useUserStore()
  
  useShapeSync()
  usePresenceMonitor()

  // ✅ PHASE 7: Delete currently locked shape with OPTIMISTIC updates
  const handleDeleteShape = useCallback(async () => {
    if (!user) return

    const { shapes, deleteShape: deleteShapeLocal } = useCanvasStore.getState()
    const userLockedShape = shapes.find(shape => shape.lockedBy === user.uid)
    
    if (!userLockedShape) {
      console.log('No shape selected for deletion')
      return
    }

    // ✅ INSTANT: Optimistic deletion (remove from UI immediately)
    deleteShapeLocal(userLockedShape.id)
    console.log(`⚡ Instantly deleted: ${userLockedShape.id}`)

    // ✅ BACKGROUND: Sync to Firestore (doesn't block UI)
    try {
      await deleteShape(userLockedShape.id)
      console.log(`🗑️ Deletion synced to Firestore: ${userLockedShape.id}`)
    } catch (error) {
      console.error('Deletion sync failed:', error)
      
      // ✅ ROLLBACK: Restore shape on error (rare but important)
      const { addShape } = useCanvasStore.getState()
      addShape(userLockedShape)
      console.log(`🔄 Restored shape after sync failure: ${userLockedShape.id}`)
      
      // TODO: Show error toast to user
    }
  }, [user])

  // ✅ COMBINED: Space key + Delete key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Delete/Backspace for shape deletion
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.repeat) {
        e.preventDefault()
        handleDeleteShape()
        return
      }
      
      // Handle Space for panning
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
  }, [isSpacePressed, user, handleDeleteShape])

  // ✅ HYBRID: Custom boundary constraints for stage dragging
  const stageDragBound = useCallback((pos: { x: number; y: number }) => {
    const minX = width - CANVAS_WIDTH
    const minY = height - CANVAS_HEIGHT
    return {
      x: Math.max(minX, Math.min(0, pos.x)),
      y: Math.max(minY, Math.min(0, pos.y))
    }
  }, [width, height])

  // ✅ SIMPLIFIED: Click canvas to release all user locks OR create shape
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current || isSpacePressed || !user) return
    
    // ✅ Release all locks held by current user (deselect everything)
    const { shapes } = useCanvasStore.getState()
    const userLockedShapes = shapes.filter(shape => shape.lockedBy === user.uid)
    
    if (userLockedShapes.length > 0) {
      // Release all user's locks
      await Promise.all(
        userLockedShapes.map(shape => 
          releaseLock(shape.id, user.uid, user.displayName)
        )
      )
      console.log(`🔓 Released ${userLockedShapes.length} locks`)
      return
    }
    
    // ✅ No locks to release - create new shape and auto-lock it
    const stage = stageRef.current!
    const canvasPos = stage.getRelativePointerPosition()!
    
    const shapeId = await createShape(
      Math.max(0, Math.min(CANVAS_WIDTH - 100, canvasPos.x)),
      Math.max(0, Math.min(CANVAS_HEIGHT - 100, canvasPos.y)),
      user.uid, 
      user.displayName
    )
    
    // ✅ Auto-lock the newly created shape (this IS selection)
    await acquireLock(shapeId, user.uid, user.displayName, user.cursorColor)
    
    console.log(`✨ Shape created and locked:`, shapeId)
  }, [isSpacePressed, user])

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
