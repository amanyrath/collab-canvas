import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { useSimpleCursorTracking, getCanvasCoordinates } from '../../hooks/useSimpleCursorTracking'
import { useFigmaNavigation } from '../../hooks/useFigmaNavigation'
import { useShapeSync } from '../../hooks/useShapeSync'
import { usePresenceMonitor } from '../../hooks/usePresenceMonitor'
import { createShape, deleteShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock } from '../../utils/lockUtils'
import { Shape } from '../../utils/types'
import GridLayer from './GridLayer'
import ShapeLayer from './ShapeLayer'
import SelectionLayer from './SelectionLayer'
import SimpleCursorLayer from './SimpleCursorLayer'

const CANVAS_WIDTH = 5000
const CANVAS_HEIGHT = 5000

interface CanvasProps {
  width: number
  height: number
}

const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  
  const { user } = useUserStore()
  
  // ⚡ ULTRA-FAST cursor tracking
  const { updateCursor } = useSimpleCursorTracking(user)
  
  // ✅ FIGMA UX: Industry-standard trackpad navigation with conflict prevention
  const { handleWheel, handleTouchStart, handleTouchMove } = useFigmaNavigation(stageRef, setIsNavigating)
  
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
        e.stopPropagation()
        setIsSpacePressed(true)
        
        // ✅ FIX: Prevent page scroll during space+drag
        document.body.style.overflow = 'hidden'
        
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
        e.preventDefault()
        e.stopPropagation()
        setIsSpacePressed(false)

        // ✅ FIX: Restore page scroll after space+drag
        document.body.style.overflow = 'auto'

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
      
      // ✅ FIX: Restore page scroll on window blur
      document.body.style.overflow = 'auto'
      
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
      // ✅ FIX: Cleanup - restore page scroll on unmount
      document.body.style.overflow = 'auto'
      
      // ✅ Cleanup shape creation timeout
      if (shapeCreationTimeoutRef.current) {
        clearTimeout(shapeCreationTimeoutRef.current)
      }
      
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [isSpacePressed, user, handleDeleteShape])

  // ✅ SPACE+DRAG: Boundary constraints for stage dragging
  const stageDragBound = useCallback((pos: { x: number; y: number }) => {
    const minX = width - CANVAS_WIDTH
    const minY = height - CANVAS_HEIGHT
    return {
      x: Math.max(minX, Math.min(0, pos.x)),
      y: Math.max(minY, Math.min(0, pos.y))
    }
  }, [width, height])

  // ✅ OPTIMIZED: Fast shape creation with throttling and optimistic updates
  const lastShapeCreationRef = useRef<number>(0)
  const shapeCreationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current || isSpacePressed || !user) return
    
    // ✅ THROTTLE: Prevent spam clicking (max 5 shapes per second)
    const now = Date.now()
    if (now - lastShapeCreationRef.current < 200) { // 200ms = 5fps max
      return
    }
    lastShapeCreationRef.current = now
    
    // ✅ Release all locks held by current user (deselect everything)
    const { shapes, addShape } = useCanvasStore.getState()
    const userLockedShapes = shapes.filter(shape => shape.lockedBy === user.uid)
    
    if (userLockedShapes.length > 0) {
      // Release all user's locks (background operation)
      Promise.all(
        userLockedShapes.map(shape => 
          releaseLock(shape.id, user.uid, user.displayName)
        )
      )
      console.log(`🔓 Released ${userLockedShapes.length} locks`)
      return
    }
    
    // ✅ INSTANT: Create shape optimistically (immediate UI feedback)
    const stage = stageRef.current!
    const canvasPos = stage.getRelativePointerPosition()!
    const shapeId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const x = Math.max(0, Math.min(CANVAS_WIDTH - 100, canvasPos.x))
    const y = Math.max(0, Math.min(CANVAS_HEIGHT - 100, canvasPos.y))
    
    // Create shape locally first (instant feedback)
    const optimisticShape: Shape = {
      id: shapeId,
      type: 'rectangle',
      x, y,
      width: 100,
      height: 100,
      fill: '#CCCCCC',
      text: '',
      textColor: '#000000',
      fontSize: 14,
      createdBy: user.uid,
      createdAt: new Date(), // Temporary local timestamp
      lastModifiedBy: user.uid,
      lastModifiedAt: new Date(),
      isLocked: true, // Auto-lock immediately
      lockedBy: user.uid,
      lockedByName: user.displayName,
      lockedByColor: user.cursorColor
    }
    
    addShape(optimisticShape)
    
    // ✅ BACKGROUND: Sync to Firebase (non-blocking)
    // Clear any existing timeout to batch rapid clicks
    if (shapeCreationTimeoutRef.current) {
      clearTimeout(shapeCreationTimeoutRef.current)
    }
    
    shapeCreationTimeoutRef.current = setTimeout(async () => {
      try {
        // Create real shape in Firebase
        const realShapeId = await createShape(x, y, user.uid, user.displayName)
        
        // Update the optimistic shape with real ID
        const { updateShapeOptimistic } = useCanvasStore.getState()
        updateShapeOptimistic(shapeId, { id: realShapeId })
        
        // Acquire lock in background
        acquireLock(realShapeId, user.uid, user.displayName, user.cursorColor).catch(() => {})
        
      } catch (error) {
        console.error('Failed to sync shape to Firebase:', error)
        // Remove optimistic shape on error
        const { deleteShape } = useCanvasStore.getState()
        deleteShape(shapeId)
      }
    }, 100) // 100ms debounce for rapid clicking
    
  }, [isSpacePressed, user])

  // ✅ PHASE 8: Handle mouse move for cursor tracking (with navigation conflict prevention)
  const handleMouseMove = useCallback((e: any) => {
    // ✅ FIX CONFLICT: Don't update cursor during navigation (pan/zoom)
    if (isNavigating || isSpacePressed) return
    
    const coordinates = getCanvasCoordinates(e.evt, stageRef)
    if (coordinates && user) {
      updateCursor(coordinates.x, coordinates.y)
    }
  }, [updateCursor, user, isNavigating, isSpacePressed])

  return (
    <div 
      className={`relative overflow-hidden bg-white border border-gray-300 rounded-lg shadow-sm ${
        isSpacePressed ? 'cursor-grab' : 'cursor-default'
      }`}
      // ✅ FIX: Prevent page scroll leak during navigation
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }} // Prevent mobile scroll
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable={false}
        dragBoundFunc={isSpacePressed ? stageDragBound : undefined}
        // ✅ FIGMA UX: Industry-standard trackpad/touch navigation
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={handleMouseMove}
      >
        <GridLayer width={CANVAS_WIDTH} height={CANVAS_HEIGHT} listening={false} />
        <ShapeLayer listening={!isSpacePressed} />
        <SelectionLayer listening={false} />
        <SimpleCursorLayer />
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
