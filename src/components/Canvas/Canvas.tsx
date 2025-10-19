import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { useSimpleCursorTracking, getCanvasCoordinates } from '../../hooks/useSimpleCursorTracking'
import { useFigmaNavigation } from '../../hooks/useFigmaNavigation'
import { useShapeSync } from '../../hooks/useShapeSync'
import { usePresenceMonitor } from '../../hooks/usePresenceMonitor'
import { createShape, deleteShape, updateShape } from '../../utils/shapeUtils'
import { releaseLock } from '../../utils/lockUtils'
import { Shape, ShapeType } from '../../utils/types'
import { historyManager } from '../../utils/historyManager'
import GridLayer from './GridLayer'
import ShapeLayer from './ShapeLayer'
import SelectionLayer from './SelectionLayer'
import SimpleCursorLayer from './SimpleCursorLayer'
import { ShapeSelector } from './ShapeSelector'
import AgentChat from '../Chat/AgentChat'
import { createClassicTree } from '../../utils/treeTemplates'
import { createShape as createShapeFirebase } from '../../utils/shapeUtils'
import { useTexturePreload } from '../../hooks/useTexturePreload'
import { CommentsSidebar } from '../Comments/CommentsSidebar'
import { useCommentCount } from '../../hooks/useCommentCount'

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
  const [isAgentChatOpen, setIsAgentChatOpen] = useState(false)
  const [magicNotification, setMagicNotification] = useState<string | null>(null)
  
  // 🎄 CHRISTMAS MODE: Toggle for texture-based shape creation
  const [isChristmasMode, setIsChristmasMode] = useState(false)
  const [selectedTexture, setSelectedTexture] = useState<string | null>(null)
  
  // 💬 COMMENTS: Sidebar state
  const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState(false)
  const [commentShapeId, setCommentShapeId] = useState<string | null>(null)
  
  const { user } = useUserStore()
  
  // 🎄 CHRISTMAS: Preload textures and track loading state
  const { texturesLoaded } = useTexturePreload()
  
  // ⚡ ULTRA-FAST cursor tracking
  const { updateCursor } = useSimpleCursorTracking(user)
  
  // ✅ FIGMA UX: Industry-standard trackpad navigation with conflict prevention
  const { handleWheel, handleTouchStart, handleTouchMove } = useFigmaNavigation(stageRef, setIsNavigating)
  
  useShapeSync()
  usePresenceMonitor()

  // ✅ MULTI-SELECT DELETE: Delete all locked shapes with OPTIMISTIC updates
  const handleDeleteShape = useCallback(async () => {
    if (!user) return

    const { shapes, deleteShape: deleteShapeLocal } = useCanvasStore.getState()
    const userLockedShapes = shapes.filter(shape => shape.lockedBy === user.uid)
    
    if (userLockedShapes.length === 0) {
      console.log('No shapes selected for deletion')
      return
    }

    console.log(`🗑️ Deleting ${userLockedShapes.length} selected shapes`)

    // ✅ INSTANT: Optimistic deletion (remove all from UI immediately)
    userLockedShapes.forEach(shape => {
      deleteShapeLocal(shape.id)
      console.log(`⚡ Instantly deleted: ${shape.id}`)
    })

    // ✅ BACKGROUND: Sync all deletions to Firestore (doesn't block UI)
    const deletionPromises = userLockedShapes.map(async (shape) => {
      try {
        await deleteShape(shape.id)
        console.log(`🗑️ Deletion synced to Firestore: ${shape.id}`)
      } catch (error) {
        console.error(`Deletion sync failed for ${shape.id}:`, error)
        
        // ✅ ROLLBACK: Restore shape on error (rare but important)
        const { addShape } = useCanvasStore.getState()
        addShape(shape)
        console.log(`🔄 Restored shape after sync failure: ${shape.id}`)
      }
    })

    await Promise.all(deletionPromises)
  }, [user])

  // 🎄 TOGGLE CHRISTMAS MODE: Switch between normal and festive mode
  const toggleChristmasMode = useCallback(async () => {
    const newMode = !isChristmasMode
    setIsChristmasMode(newMode)
    
    if (newMode) {
      // Auto-select rectangle (gift box) when entering Christmas Mode
      setCurrentShapeType('rectangle')
      // Set default texture (first gift texture)
      const { TEXTURES } = await import('../../constants/textureManifest')
      setSelectedTexture(TEXTURES.gifts[0])
      setMagicNotification('🎄 Christmas Mode ON! Creating gift boxes 🎁')
      console.log('🎅 Christmas Mode activated - switched to rectangle (gift box)')
    } else {
      setSelectedTexture(null)
      setMagicNotification('👋 Christmas Mode OFF')
      console.log('👋 Christmas Mode deactivated')
    }
    
    setTimeout(() => setMagicNotification(null), 2500)
  }, [isChristmasMode])

  // 🎄 QUICK TREE: Create a Christmas tree template
  const handleQuickTree = useCallback(async () => {
    if (!user || !stageRef.current) return

    const { addShape } = useCanvasStore.getState()
    
    console.log('🎄 Quick Tree button clicked!')
    
    // Get center of current viewport
    const stage = stageRef.current
    const scale = stage.scaleX()
    const stageX = stage.x()
    const stageY = stage.y()
    
    // Calculate center of visible area in canvas coordinates
    const viewportCenterX = (width / 2 - stageX) / scale
    const viewportCenterY = (height / 2 - stageY) / scale
    
    console.log(`🎄 Creating tree at viewport center: (${viewportCenterX.toFixed(0)}, ${viewportCenterY.toFixed(0)})`)
    
    // Tree dimensions for 'large' size (1.5x multiplier)
    // Layers overlap at 70%, total triangles height ≈ 430px * 1.5 = 645px
    const treeHeight = 645
    const centerY = viewportCenterY + treeHeight / 2 // Center of tree at viewport center
    
    // Generate large tree shapes (centered in viewport)
    const treeShapes = createClassicTree(viewportCenterX, centerY, 'large', user.uid)
    
    // Add shapes to canvas (locally first for instant feedback)
    treeShapes.forEach(shape => {
      addShape(shape as Shape, false) // Don't record in history yet
    })

    // Sync to Firestore in background
    try {
      await Promise.all(
        treeShapes.map(shape =>
          createShapeFirebase(
            shape.x!,
            shape.y!,
            shape.type!,
            shape.fill!,
            user.uid,
            user.displayName!,
            shape.width!,
            shape.height!,
            shape.text || '',
            shape.texture // 🎄 Pass the texture to Firebase
          )
        )
      )
      
      setMagicNotification('🎄 Christmas tree created!')
      setTimeout(() => setMagicNotification(null), 2000)
    } catch (error) {
      console.error('❌ Quick Tree failed:', error)
      setMagicNotification('❌ Tree creation failed!')
      setTimeout(() => setMagicNotification(null), 2000)
    }
  }, [user, stageRef, width, height])

  // ✅ COMBINED: Space key + Delete key + Undo/Redo handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ✅ FIX: Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      
      // Handle Undo/Redo shortcuts (Cmd+Z / Cmd+Shift+Z)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.repeat) {
        if (isTyping) return
        
        e.preventDefault()
        const { undo, redo } = useCanvasStore.getState()
        
        if (e.shiftKey) {
          // Cmd+Shift+Z = Redo
          redo()
        } else {
          // Cmd+Z = Undo
          undo()
        }
        return
      }
      
      // Handle Delete/Backspace for shape deletion
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.repeat) {
        if (isTyping) {
          return // Let the input handle the backspace
        }
        e.preventDefault()
        handleDeleteShape()
        return
      }
      
      // Handle Space for panning
      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        if (isTyping) {
          return // Let the input handle the space
        }
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

  // ✅ Picker state and creation preferences
  const [currentShapeType, setCurrentShapeType] = useState<ShapeType>('rectangle')
  const [currentColor, setCurrentColor] = useState<string>('#CCCCCC')
  const [customColor, setCustomColor] = useState<string>('#9333ea') // Default purple
  const [isUpdatingState, setIsUpdatingState] = useState(false)
  const [lastSelectedShapeId, setLastSelectedShapeId] = useState<string | null>(null)
  
  // 💬 Get comment count for selected shape (DISABLED - was causing too many subscriptions)
  // const selectedShapeCommentCount = useCommentCount(lastSelectedShapeId)
  const selectedShapeCommentCount = 0 // Disabled for performance
  
  // 💬 Auto-update comment target when selecting shapes (if sidebar is open)
  // Add debouncing to prevent rapid subscription changes
  useEffect(() => {
    if (isCommentsSidebarOpen && lastSelectedShapeId) {
      const timeoutId = setTimeout(() => {
        console.log(`💬 Canvas: Switching to shape ${lastSelectedShapeId.slice(-6)}`)
        setCommentShapeId(lastSelectedShapeId)
      }, 500) // 500ms debounce (increased for stability)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isCommentsSidebarOpen, lastSelectedShapeId])
  
  // ✅ Track user's creation preferences (separate from current picker display)
  const [creationShapeType, setCreationShapeType] = useState<ShapeType>('rectangle')
  const [creationColor, setCreationColor] = useState<string>('#CCCCCC')
  
  // Shape and color change handlers
  const handleShapeTypeChange = useCallback(async (shapeType: ShapeType) => {
    setIsUpdatingState(true)
    setCurrentShapeType(shapeType)
    
    // Update creation preferences when not editing a selected shape
    if (!lastSelectedShapeId) {
      setCreationShapeType(shapeType)
    }
    
    // 🎄 Update selected texture when changing shape type in Christmas Mode
    if (isChristmasMode) {
      const { TEXTURES } = await import('../../constants/textureManifest')
      if (shapeType === 'rectangle') {
        setSelectedTexture(TEXTURES.gifts[0])
      } else if (shapeType === 'circle') {
        setSelectedTexture(TEXTURES.ornaments[0])
      } else if (shapeType === 'triangle') {
        setSelectedTexture(TEXTURES.trees[0])
      }
    }
    
    // Update selected shapes' type
    if (user) {
      const { shapes, updateShapeOptimistic } = useCanvasStore.getState()
      const mySelectedShapes = shapes.filter(shape => shape.lockedBy === user.uid)
      
      if (mySelectedShapes.length > 0) {
        // Batch update all selected shapes
        mySelectedShapes.forEach(shape => {
          updateShapeOptimistic(shape.id, { 
            type: shapeType,
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor
          })
        })
        
        // Batch Firebase updates
        Promise.all(
          mySelectedShapes.map(shape => 
            updateShape(shape.id, { type: shapeType }, user.uid)
          )
        )
      }
    }
    
    setTimeout(() => setIsUpdatingState(false), 100)
  }, [lastSelectedShapeId, user])
  
  const handleColorChange = useCallback((color: string) => {
    console.log('handleColorChange called with:', color, 'lastSelectedShapeId:', lastSelectedShapeId)
    setIsUpdatingState(true)
    setCurrentColor(color)
    
    // ✅ MULTIPLAYER-SAFE: Only change MY selected shapes
    if (user) {
      const { shapes, updateShapeOptimistic } = useCanvasStore.getState()
      
      const mySelectedShapes = shapes.filter(shape => {
        return shape.lockedBy === user.uid
      })
      
      console.log('My selected shapes:', mySelectedShapes.length)
      
      if (mySelectedShapes.length > 0) {
        // ✅ FAST: Batch update all my selected shapes
        mySelectedShapes.forEach(shape => {
          console.log('Updating shape', shape.id, 'to color', color)
          updateShapeOptimistic(shape.id, { 
            fill: color,
            isLocked: true, // Keep selected
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor
          })
        })
        
        // ✅ EFFICIENT: Single Firebase batch for all updates
        Promise.all(
          mySelectedShapes.map(shape => {
            return updateShape(shape.id, { fill: color }, user.uid)
          })
        )
        // ✅ UPDATE CREATION PREFERENCES: When shapes are being edited
        setCreationColor(color)
      } else {
        // ✅ UPDATE CREATION PREFERENCES: When no shapes selected
        setCreationColor(color)
      }
    }
    
    // Allow creation after state settles
    setTimeout(() => {
      setIsUpdatingState(false)
    }, 100)
  }, [user, lastSelectedShapeId, isChristmasMode])
  
  // Preset color values for comparison
  const presetColors = ['#ef4444', '#22c55e', '#3b82f6', '#CCCCCC']
  
  // Picker sync: Update picker state when shapes are selected/deselected
  const { shapes } = useCanvasStore()
  useEffect(() => {
    if (user) {
      const mySelectedShapes = shapes.filter(shape => shape.lockedBy === user.uid)
      
      if (mySelectedShapes.length === 1) {
        // Update picker to match selected shape
        const mySelectedShape = mySelectedShapes[0]
        
        if (mySelectedShape.id !== lastSelectedShapeId) {
          setLastSelectedShapeId(mySelectedShape.id)
          
          if (mySelectedShape.fill !== currentColor) {
            setCurrentColor(mySelectedShape.fill)
            
            // ✅ UPDATE CUSTOM COLOR: If shape has non-preset color, update custom color square
            if (!presetColors.includes(mySelectedShape.fill.toLowerCase())) {
              setCustomColor(mySelectedShape.fill)
            }
          }
          
          if (mySelectedShape.type !== currentShapeType) {
            setCurrentShapeType(mySelectedShape.type)
          }
        }
        
      } else if (mySelectedShapes.length === 0 && lastSelectedShapeId) {
        // Reset picker to creation preferences on deselect
        setLastSelectedShapeId(null)
        
        if (currentColor !== creationColor) {
          setCurrentColor(creationColor)
        }
        if (currentShapeType !== creationShapeType) {
          setCurrentShapeType(creationShapeType)
        }
      }
    }
  }, [shapes, user, currentColor, currentShapeType, lastSelectedShapeId, creationColor, creationShapeType])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      switch (e.key.toLowerCase()) {
        case 'r': handleShapeTypeChange('rectangle'); break
        case 'c': handleShapeTypeChange('circle'); break
        case 't': handleShapeTypeChange('triangle'); break
        case '1': handleColorChange('#ef4444'); break // Red
        case '2': handleColorChange('#22c55e'); break // Green
        case '3': handleColorChange('#3b82f6'); break // Blue
        case '4': handleColorChange('#CCCCCC'); break // Grey
        case '5': handleColorChange(customColor); break // Custom color
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleColorChange, handleShapeTypeChange, customColor])

  // Shape creation and deselection
  const lastShapeCreationRef = useRef<number>(0)
  const shapeCreationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingShapeCreations = useRef<Set<string>>(new Set())
  
  // Track if we're in a drag-to-select operation (to prevent shape creation on mouseup)
  const isDragSelecting = useRef(false)
  
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Don't create shapes if we just finished a drag-to-select
    if (isDragSelecting.current) {
      isDragSelecting.current = false
      return
    }
    
    // Only create shapes if clicking on empty canvas (Stage or background rectangle)
    const targetType = e.target.getType()
    const targetName = e.target.name ? e.target.name() : ''
    const isEmptyArea = targetType === 'Stage' || targetName === 'background-rect'
    
    if (!isEmptyArea || isSpacePressed || !user) return
    
    // Prevent creation during state updates
    if (isUpdatingState) return
    
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
        }, false) // Don't record lock changes in history
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
    
    // Throttle creation: Prevent spam (10 shapes/sec)
    if (now - lastShapeCreationRef.current < 100) {
      return
    }
    lastShapeCreationRef.current = now
    
    const stage = stageRef.current!
    const canvasPos = stage.getRelativePointerPosition()!
    const shapeId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const x = Math.max(0, Math.min(CANVAS_WIDTH - 100, canvasPos.x))
    const y = Math.max(0, Math.min(CANVAS_HEIGHT - 100, canvasPos.y))
    
    // 🎄 Apply texture if Christmas Mode is ON
    let texture: string | undefined
    if (isChristmasMode) {
      // Use selected texture if available, otherwise pick random
      if (selectedTexture) {
        texture = selectedTexture
        console.log(`🎄 Christmas Mode: Using selected texture for ${creationShapeType}: ${texture}`)
      } else {
        const { getTextureCategoryForShape, getRandomTexture } = await import('../../constants/textureManifest')
        const category = getTextureCategoryForShape(creationShapeType)
        texture = getRandomTexture(category)
        console.log(`🎄 Christmas Mode: Using random ${category} texture for ${creationShapeType}`)
      }
    }

    const optimisticShape: Shape = {
      id: shapeId,
      type: creationShapeType,
      x, y,
      width: 100,
      height: 100,
      fill: creationColor,
      text: '',
      textColor: '#000000',
      fontSize: 14,
      createdBy: user.uid,
      createdAt: new Date(),
      lastModifiedBy: user.uid,
      lastModifiedAt: new Date(),
      isLocked: false,
      lockedBy: null,
      lockedByName: null,
      lockedByColor: null,
      ...(texture && { texture }) // 🎄 Add texture if in Christmas Mode
    }
    
    // ✅ FASTEST: Direct store update without validation delays
    // Record history immediately with temp ID (will be updated later)
    addShape(optimisticShape) // recordHistory = true (default)
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
        console.log(`🔄 Syncing shape ${tempId}...`)
        const currentShapes = useCanvasStore.getState().shapes
        const tempShape = currentShapes.find(s => s.id === tempId)
        
        if (!tempShape) {
          console.warn(`⚠️ Shape ${tempId} not found in store, skipping`)
          return // Shape was deleted before sync
        }
        
        console.log(`✓ Found ${tempShape.type} shape ${tempId} in store`)
        
            try {
              // 🔍 DEBUG: Log what we're about to send
              console.log(`🔍 About to create ${tempShape.type} in Firebase:`, {
                x: tempShape.x,
                y: tempShape.y,
                type: tempShape.type,
                fill: tempShape.fill,
                userId: user.uid,
                displayName: user.displayName
              })
              
              // Create real shape in Firebase (including texture if present)
              const realShapeId = await createShape(
                tempShape.x, 
                tempShape.y, 
                tempShape.type, 
                tempShape.fill, 
                user.uid, 
                user.displayName,
                tempShape.width,
                tempShape.height,
                tempShape.text || '',
                tempShape.texture // 🎄 Pass texture to Firebase
              )
          
          // ✅ Replace the temp shape with the real Firebase ID
          const { shapes, setShapes } = useCanvasStore.getState()
          
          // Find and replace the temp shape with the real ID in the store
          const updatedShapes = shapes.map(shape => 
            shape.id === tempId ? { ...shape, id: realShapeId } : shape
          )
          setShapes(updatedShapes)
          
          // ✅ Update history to use real Firebase ID (for cleaner logs)
          historyManager.updateShapeId(tempId, realShapeId)
          
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
    
  }, [isSpacePressed, user, isUpdatingState, isChristmasMode, selectedTexture])

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
        customColor={customColor}
        onCustomColorChange={setCustomColor}
        isChristmasMode={isChristmasMode} // 🎄 Pass Christmas Mode state
        selectedTexture={selectedTexture} // 🎄 Pass selected texture
        onTextureChange={(texture) => {
          console.log('🎄 Texture selected:', texture)
          setSelectedTexture(texture)
        }} // 🎄 Pass texture change handler
      />
      
      {/* Debug Info - Moved to left to avoid covering AI chat button */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/80 text-white p-2 rounded text-xs max-w-xs">
          <div>Shape: {currentShapeType} | Color: {currentColor}</div>
          <div>User: {user?.displayName?.slice(0, 10)} ({user?.uid?.slice(-4)})</div>
          {isUpdatingState && <div className="text-yellow-400">⏳ Updating...</div>}
          {lastSelectedShapeId && <div className="text-blue-400">✏️ Editing: {lastSelectedShapeId.slice(-4)}</div>}
        </div>
      )}
      
      {/* 🎄 CHRISTMAS: Texture loading indicator */}
      {!texturesLoaded && (
        <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded text-sm">
          🎄 Loading Christmas textures...
        </div>
      )}
      
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
        key={texturesLoaded ? 'loaded' : 'loading'} // Force re-render when textures load
      >
        <GridLayer width={CANVAS_WIDTH} height={CANVAS_HEIGHT} listening={false} />
        <ShapeLayer listening={true} isDragSelectingRef={isDragSelecting} stageRef={stageRef} onCursorUpdate={updateCursor} />
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

      {/* 🎄 Christmas Buttons */}
      <div className="fixed bottom-4 left-4 flex gap-2">
        {/* Christmas Mode Toggle */}
        <button
          onClick={toggleChristmasMode}
          className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all font-semibold ${
            isChristmasMode
              ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-yellow-300'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
          title={isChristmasMode ? "Christmas Mode ON - New shapes will be festive!" : "Click to enable Christmas Mode"}
          aria-label="Christmas Mode Toggle"
        >
          <span className="text-2xl">{isChristmasMode ? '🎅' : '🎄'}</span>
          <span>{isChristmasMode ? 'Christmas Mode ON' : 'Christmas Mode'}</span>
        </button>

        {/* Quick Tree Button */}
        <button
          onClick={handleQuickTree}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg flex items-center gap-2 transition-all font-semibold"
          title="Create a large Christmas tree in your current view"
          aria-label="Quick Tree"
        >
          <span className="text-2xl">🎄</span>
          <span>Quick Tree</span>
        </button>
      </div>

      {/* Magic Notification */}
      {magicNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-fade-in">
          {magicNotification}
        </div>
      )}

      {/* AI Agent Chat Toggle Button */}
      {!isAgentChatOpen && (
        <button
          onClick={() => setIsAgentChatOpen(true)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          title="Open AI Agent Chat"
          aria-label="Open AI Agent Chat"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* AI Agent Chat */}
      <AgentChat isOpen={isAgentChatOpen} onClose={() => setIsAgentChatOpen(false)} />

      {/* 💬 Comments Toggle Button (near shape picker) */}
      {!isCommentsSidebarOpen && (
        <button
          onClick={() => {
            setIsCommentsSidebarOpen(true)
            // If a shape is selected, set it as the comment target
            const selectedShape = shapes.find(s => s.lockedBy === user?.uid)
            if (selectedShape) {
              setCommentShapeId(selectedShape.id)
            }
          }}
          className="fixed top-[320px] left-4 w-[216px] px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors z-20"
          title={lastSelectedShapeId ? `Open Comments${selectedShapeCommentCount > 0 ? ` (${selectedShapeCommentCount})` : ''}` : "Open Comments"}
          aria-label="Open Comments"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span className="text-sm font-semibold">💬 Comments</span>
          
          {/* Comment count badge (when shape selected with comments) */}
          {lastSelectedShapeId && selectedShapeCommentCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full">
              {selectedShapeCommentCount}
            </span>
          )}
        </button>
      )}

      {/* 💬 Comments Sidebar */}
      <CommentsSidebar
        shapeId={commentShapeId}
        isOpen={isCommentsSidebarOpen}
        onClose={() => {
          setIsCommentsSidebarOpen(false)
          setCommentShapeId(null)
        }}
      />
    </div>
  )
}

export default Canvas
