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
import { releaseLock } from '../../utils/lockUtils'
import { Shape, ShapeType } from '../../utils/types'
import GridLayer from './GridLayer'
import ShapeLayer from './ShapeLayer'
import SelectionLayer from './SelectionLayer'
import SimpleCursorLayer from './SimpleCursorLayer'
import { ShapeSelector } from './ShapeSelector'

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

  // ✅ SHAPE MODE: Track current shape type and color to create
  const [currentShapeType, setCurrentShapeType] = useState<ShapeType>('rectangle')
  const [currentColor, setCurrentColor] = useState<string>('#ef4444') // Default to red
  
  // ✅ SHAPE MODE HANDLER: Update shape type from UI
  const handleShapeTypeChange = useCallback((shapeType: ShapeType) => {
    setCurrentShapeType(shapeType)
    const shapeIcon = shapeType === 'rectangle' ? '🔲' : '⭕'
    console.log(`${shapeIcon} Shape mode: ${shapeType}`)
  }, [])
  
  // ✅ COLOR HANDLER: Update color from UI
  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color)
    const colorName = color === '#ef4444' ? 'Red' : color === '#22c55e' ? 'Green' : 'Blue'
    console.log(`🎨 Color mode: ${colorName} (${color})`)
  }, [])
  
  // ✅ KEYBOARD SHORTCUTS: Support both shape and color shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key.toLowerCase()) {
        // Shape shortcuts
        case 'r':
          handleShapeTypeChange('rectangle')
          break
        case 'c':
          handleShapeTypeChange('circle')
          break
        // Color shortcuts
        case '1':
          handleColorChange('#ef4444') // Red
          break
        case '2':
          handleColorChange('#22c55e') // Green
          break
        case '3':
          handleColorChange('#3b82f6') // Blue
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleShapeTypeChange, handleColorChange])

  // ✅ SMART UX: Deselect first, then allow creation
  const lastShapeCreationRef = useRef<number>(0)
  const shapeCreationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingShapeCreations = useRef<Set<string>>(new Set())
  
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current || isSpacePressed || !user) return
    
    const { shapes, addShape, updateShapeOptimistic } = useCanvasStore.getState()
    const userLockedShapes = shapes.filter(shape => shape.lockedBy === user.uid)
    
    // ✅ SMART LOGIC: If shapes are selected, just deselect (no creation)
    if (userLockedShapes.length > 0) {
      // ✅ INSTANT DESELECT: Update UI immediately
      userLockedShapes.forEach(shape => {
        updateShapeOptimistic(shape.id, {
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedByColor: null
        })
      })
      
      // ✅ BACKGROUND SYNC: Release Firebase locks (non-blocking)
      Promise.all(
        userLockedShapes.map(shape => 
          releaseLock(shape.id, user.uid, user.displayName)
        )
      )
      
      console.log(`🔓 Deselected ${userLockedShapes.length} shapes (no creation)`)
      return // Don't create when deselecting
    }
    
    // ✅ CREATE SHAPE: No selection, so create new shape
    const now = Date.now()
    
    // ✅ THROTTLE CREATION: Prevent spam (10 shapes/sec)
    if (now - lastShapeCreationRef.current < 100) {
      return
    }
    lastShapeCreationRef.current = now
    
    // ✅ CREATE SHAPE: No selection, so create new shape
    console.log(`🎯 No selection - creating new ${currentShapeType}`)
    
    // ✅ INSTANT: Create shape optimistically
    const stage = stageRef.current!
    const canvasPos = stage.getRelativePointerPosition()!
    const shapeId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const x = Math.max(0, Math.min(CANVAS_WIDTH - 100, canvasPos.x))
    const y = Math.max(0, Math.min(CANVAS_HEIGHT - 100, canvasPos.y))
    
    // Create shape locally first (instant feedback) with minimal object creation
    const optimisticShape: Shape = {
      id: shapeId,
      type: currentShapeType, // ✅ USE SELECTED SHAPE TYPE
      x, y,
      width: 100,
      height: 100,
      fill: currentColor, // ✅ USE SELECTED COLOR
      text: '',
      textColor: '#000000',
      fontSize: 14,
      createdBy: user.uid,
      createdAt: new Date(), // Temporary local timestamp
      lastModifiedBy: user.uid,
      lastModifiedAt: new Date(),
      isLocked: false, // ✅ START UNSELECTED: Auto-deselect for consistent UX
      lockedBy: null,
      lockedByName: null,
      lockedByColor: null
    }
    
    // ✅ FASTEST: Direct store update without validation delays
    addShape(optimisticShape)
    pendingShapeCreations.current.add(shapeId)
    console.log(`🚀 Created shape instantly: ${shapeId} at (${x}, ${y})`)
    
    // ✅ HIGH-PERFORMANCE: Ultra-fast Firebase batching
    // Clear any existing timeout to batch rapid operations
    if (shapeCreationTimeoutRef.current) {
      clearTimeout(shapeCreationTimeoutRef.current)
    }
    
    shapeCreationTimeoutRef.current = setTimeout(async () => {
      // Process all pending shapes in current batch
      const pendingIds = Array.from(pendingShapeCreations.current)
      pendingShapeCreations.current.clear()
      
      // Process shapes in parallel for maximum speed
      const syncPromises = pendingIds.map(async (tempId) => {
        const currentShapes = useCanvasStore.getState().shapes
        const tempShape = currentShapes.find(s => s.id === tempId)
        
        if (!tempShape) return // Shape was deleted before sync
        
            try {
              // Create real shape in Firebase
              const realShapeId = await createShape(tempShape.x, tempShape.y, tempShape.type, tempShape.fill, user.uid, user.displayName)
          
          // Update the optimistic shape with real ID
          const { updateShapeOptimistic } = useCanvasStore.getState()
          updateShapeOptimistic(tempId, { id: realShapeId })
          
          // ✅ NO AUTO-LOCK: Let users manually select shapes when needed
          // This creates a cleaner UX where every click creates, no auto-selection
          
        } catch (error) {
          console.error(`Failed to sync shape ${tempId}:`, error)
          // Remove failed shape
          const { deleteShape } = useCanvasStore.getState()
          deleteShape(tempId)
        }
      })
      
      // Wait for all syncs to complete
      await Promise.allSettled(syncPromises)
    }, 50) // 50ms debounce - good balance of responsiveness and performance
    
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
      {/* Shape Selector UI */}
      <ShapeSelector 
        currentShapeType={currentShapeType}
        onShapeTypeChange={handleShapeTypeChange}
        currentColor={currentColor}
        onColorChange={handleColorChange}
      />
      
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
