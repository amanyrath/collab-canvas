import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Layer, Group, Rect, Text, Transformer, Line } from 'react-konva'
import Konva from 'konva'
import { shallow } from 'zustand/shallow' // ⚡ PERFORMANCE: For selective subscriptions
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'
import { updateShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock, acquireLockBatch, releaseLockBatch } from '../../utils/lockUtils'
import { TextEditor } from './TextEditor'
import { getTexture } from '../../utils/textureLoader'

interface ShapeLayerProps {
  listening: boolean
  isDragSelectingRef?: React.MutableRefObject<boolean>
  stageRef?: React.RefObject<Konva.Stage>
  onCursorUpdate?: (x: number, y: number) => void
}

// ✅ PERFORMANCE: Custom comparison for React.memo to prevent unnecessary re-renders
const areShapePropsEqual = (
  prevProps: { shape: Shape; isSelected: boolean; onSelect: (e: any) => void; onDoubleClick: (id: string) => void; shapeRef: React.RefObject<Konva.Shape>; disableDrag?: boolean; onCursorUpdate?: (x: number, y: number) => void },
  nextProps: { shape: Shape; isSelected: boolean; onSelect: (e: any) => void; onDoubleClick: (id: string) => void; shapeRef: React.RefObject<Konva.Shape>; disableDrag?: boolean; onCursorUpdate?: (x: number, y: number) => void }
) => {
  // Only re-render if shape properties that affect rendering changed
  const prev = prevProps.shape
  const next = nextProps.shape
  
  return (
    prev.id === next.id &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.fill === next.fill &&
    prev.type === next.type &&
    prev.text === next.text &&
    prev.textColor === next.textColor &&
    prev.fontSize === next.fontSize &&
    prev.isLocked === next.isLocked &&
    prev.lockedBy === next.lockedBy &&
    prev.lockedByColor === next.lockedByColor &&
    prev.texture === next.texture && // 🎄 CHRISTMAS: Include texture in comparison
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.disableDrag === nextProps.disableDrag
    // Note: We don't compare onSelect, onCursorUpdate, or shapeRef as they are stable
  )
}

// ✅ SIMPLIFIED: Selection = Locking (no dual state)
const SimpleShape: React.FC<{ 
  shape: Shape
  isSelected: boolean
  onSelect: (e: any) => void
  onDoubleClick: (id: string) => void
  shapeRef: React.RefObject<Konva.Shape>
  disableDrag?: boolean  // Disable dragging when inside a Group
  onCursorUpdate?: (x: number, y: number) => void  // ⚡ Cursor tracking during drag
}> = React.memo(({ shape, isSelected: _isSelected, onSelect, onDoubleClick, shapeRef, disableDrag = false, onCursorUpdate }) => {
  // ⚡ PERFORMANCE: Only subscribe to shapes array (not optimistic updates or other store fields)
  const shapes = useCanvasStore((state) => state.shapes, shallow)
  const { user } = useUserStore()
  
  const isLockedByMe = shape.isLocked && shape.lockedBy === user?.uid
  const isLockedByOthers = shape.isLocked && shape.lockedBy !== user?.uid
  const canDrag = !isLockedByOthers && !!user && !disableDrag

  // ✅ MULTI-SELECT: Support shift+click for multiple selection (Figma-like UX)
  const handleClick = useCallback(async (e: any) => {
    if (!isLockedByOthers && user) {
      const isShiftKey = e.evt?.shiftKey || false
      onSelect(e) // Notify parent of selection with event
      
      const { updateShapeOptimistic } = useCanvasStore.getState()
      const userLockedShapes = shapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      if (isShiftKey) {
        // ✅ MULTI-SELECT: Toggle shape lock
        if (isLockedByMe) {
          // Release this shape
          updateShapeOptimistic(shape.id, { 
            isLocked: false, 
            lockedBy: null, 
            lockedByName: null, 
            lockedByColor: null 
          }, false) // Don't record lock changes in history
          releaseLock(shape.id, user.uid, user.displayName)
        } else {
          // Add to selection
          updateShapeOptimistic(shape.id, {
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor
          }, false) // Don't record lock changes in history
          acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
        }
      } else {
        // ✅ SINGLE SELECT: Release others and lock this one
        if (isLockedByMe && userLockedShapes.length === 0) {
          return // Already the only selection, no work needed
        }
        
        // Release ALL previous selections
      userLockedShapes.forEach(s => {
        updateShapeOptimistic(s.id, { 
          isLocked: false, 
          lockedBy: null, 
          lockedByName: null, 
          lockedByColor: null 
        }, false) // Don't record lock changes in history
      })
      
        // Lock new shape (single selection)
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      }, false) // Don't record lock changes in history
      
      // ✅ BACKGROUND: Firebase operations (non-blocking)
      if (userLockedShapes.length > 0) {
        Promise.all(
          userLockedShapes.map(s => releaseLock(s.id, user.uid, user.displayName))
        )
      }
      
      // Acquire lock for current shape
        if (!isLockedByMe) {
      acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
        }
      }
    }
  }, [shape.id, isLockedByMe, isLockedByOthers, user, shapes, onSelect])

  // ✅ SIMPLIFIED: Drag handlers for single shapes only (multi-select uses Group)
  const handleDragStart = useCallback((_e: any) => {
    // Auto-select and lock this shape when drag starts
    if (!isLockedByMe && user) {
      onSelect({ evt: { shiftKey: false } })
      
      const { updateShapeOptimistic, shapes: freshShapes } = useCanvasStore.getState()
      const userLockedShapes = freshShapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      // Release other shapes
      userLockedShapes.forEach(s => {
        updateShapeOptimistic(s.id, { 
          isLocked: false, 
          lockedBy: null, 
          lockedByName: null, 
          lockedByColor: null 
        }, false) // Don't record lock changes in history
        releaseLock(s.id, user.uid, user.displayName)
      })
      
      // Lock this shape
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      }, false) // Don't record lock changes in history
      acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
    }
  }, [shape.id, isLockedByMe, user, onSelect])

  // ⚡ PERFORMANCE: Throttle cursor updates during drag (10fps instead of 60fps)
  const lastDragUpdateRef = useRef<number>(0)
  const handleDragMove = useCallback((e: any) => {
    // Update cursor position during single shape drag (throttled to 100ms = 10fps)
    if (onCursorUpdate) {
      const now = Date.now()
      // ⚡ OPTIMIZATION: Only update every 100ms (10fps) instead of 60fps = 83% fewer writes
      if (now - lastDragUpdateRef.current < 100) return
      lastDragUpdateRef.current = now
      
      const stage = e.target.getStage()
      const pointerPos = stage?.getPointerPosition()
      if (pointerPos) {
        const transform = stage.getAbsoluteTransform().copy().invert()
        const canvasPos = transform.point(pointerPos)
        onCursorUpdate(Math.round(canvasPos.x), Math.round(canvasPos.y))
      }
    }
  }, [onCursorUpdate])

  const handleDragEnd = useCallback((e: any) => {
    if (!user) return
    
    const finalX = Math.round(e.target.x())
    const finalY = Math.round(e.target.y())
    
    const { updateShapeOptimistic } = useCanvasStore.getState()
    updateShapeOptimistic(shape.id, { x: finalX, y: finalY })
    updateShape(shape.id, { x: finalX, y: finalY }, user.uid)
  }, [shape.id, user])

  // ✅ RESIZE HANDLER: Update shape dimensions after transform
  const handleTransformEnd = useCallback((_e: any) => {
    const node = shapeRef.current
    if (!node || !user) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    // Calculate new dimensions (all shapes use corner positioning now)
    let newWidth = Math.max(20, Math.round(node.width() * scaleX))
    let newHeight = Math.max(20, Math.round(node.height() * scaleY))
    let newX = Math.round(node.x())
    let newY = Math.round(node.y())
    
    // Reset scale to 1 (bake the scale into width/height)
    node.scaleX(1)
    node.scaleY(1)
    
    // ✅ BOUNDARY CONSTRAINTS: Ensure resized shape stays within canvas
    // Constrain so shape doesn't exceed boundaries
    if (newX + newWidth > 5000) {
      newWidth = 5000 - newX
    }
    if (newY + newHeight > 5000) {
      newHeight = 5000 - newY
    }
    if (newX < 0) {
      newWidth = newWidth + newX
      newX = 0
    }
    if (newY < 0) {
      newHeight = newHeight + newY
      newY = 0
    }
    
    const { updateShapeOptimistic } = useCanvasStore.getState()
    
    // ✅ INSTANT: Update dimensions locally first
    updateShapeOptimistic(shape.id, { 
      x: newX,
      y: newY,
      width: newWidth, 
      height: newHeight 
    })
    
    // ✅ BACKGROUND: Sync to Firebase (non-blocking)
    updateShape(shape.id, { 
      x: newX,
      y: newY,
      width: newWidth, 
      height: newHeight 
    }, user.uid)
  }, [shape.id, user, shapeRef])

  // ✅ DRAG BOUNDS: Constrain single shapes within canvas (Group handles multi-select)
  const dragBoundFunc = useCallback((pos: any) => {
    const { shapes: freshShapes } = useCanvasStore.getState()
    const currentShape = freshShapes.find(s => s.id === shape.id)
    if (!currentShape) return pos
    
    const shapeWidth = Math.max(1, currentShape.width)
    const shapeHeight = Math.max(1, currentShape.height)
    
    // Snap to grid
    const gridSize = 1
    const x = Math.round(pos.x / gridSize) * gridSize
    const y = Math.round(pos.y / gridSize) * gridSize
    
    // Constrain to canvas bounds
    const maxX = Math.max(0, 5000 - shapeWidth)
    const maxY = Math.max(0, 5000 - shapeHeight)
    
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y))
    }
  }, [shape.id])

  // ⚡ PERFORMANCE: Cache textured shapes for faster rendering
  React.useEffect(() => {
    if (shape.texture && shapeRef && typeof shapeRef !== 'function' && shapeRef.current) {
      const node = shapeRef.current
      console.log(`🎨 Caching textured shape: ${shape.id.slice(-6)}`)
      
      // Cache the shape to bitmap for faster rendering
      node.cache()
      
      const layer = node.getLayer()
      if (layer) {
        layer.batchDraw()
      }
      
      // Clear cache when shape properties change
      return () => {
        if (node) {
          node.clearCache()
        }
      }
    }
    return undefined // Return undefined for non-textured shapes
  }, [shape.texture, shape.id, shapeRef])
  
  // ⚡ PERFORMANCE: Clear cache when shape geometry changes
  React.useEffect(() => {
    if (shape.texture && shapeRef && typeof shapeRef !== 'function' && shapeRef.current) {
      const node = shapeRef.current
      node.clearCache()
      // Re-cache with new dimensions
      node.cache()
      node.getLayer()?.batchDraw()
    }
  }, [shape.x, shape.y, shape.width, shape.height, shape.texture, shapeRef])

  // ✅ SHAPE RENDERING: Support both rectangles and circles
  const renderShape = () => {
    const strokeColor = isLockedByMe 
      ? (user?.cursorColor || '#0066ff')
      : isLockedByOthers
        ? (shape.lockedByColor || '#ff6b6b')
        : 'transparent'
    const strokeWidth = isLockedByMe || isLockedByOthers ? 2 : 0

    // 🎄 CHRISTMAS: Get texture image if shape has texture property
    const textureImage = shape.texture ? getTexture(shape.texture) : null
    
    // 🎄 DEBUG: Log texture loading status (only once per render)
    if (shape.texture && !textureImage) {
      console.warn(`⚠️ Texture not loaded for shape ${shape.id.slice(-6)}: ${shape.texture}`)
    } else if (shape.texture && textureImage) {
      console.log(`🎨 Rendering ${shape.type} ${shape.id.slice(-6)} WITH texture: ${shape.texture}`)
      console.log(`   Image size: ${textureImage.width}x${textureImage.height}, Shape size: ${shape.width}x${shape.height}`)
      console.log(`   Scale: x=${(shape.width / textureImage.width).toFixed(2)}, y=${(shape.height / textureImage.height).toFixed(2)}`)
    }

    const commonProps = {
      // 🎄 IMPORTANT: When we have a texture, don't set fill color (Konva will ignore the texture)
      fill: textureImage ? undefined : shape.fill,
      fillPatternImage: textureImage || undefined,
      fillPatternScaleX: textureImage ? shape.width / textureImage.width : undefined,
      fillPatternScaleY: textureImage ? shape.height / textureImage.height : undefined,
      stroke: strokeColor,
      strokeWidth,
      strokeScaleEnabled: false, // Keep stroke width constant during transforms
      draggable: canDrag,
      dragBoundFunc: canDrag ? dragBoundFunc : undefined,
      onClick: handleClick,
      onDblClick: () => onDoubleClick(shape.id),
      onDragStart: handleDragStart,
      onDragMove: handleDragMove, // ⚡ NEW: Cursor tracking during drag
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      ref: (shapeRef as any).callback || shapeRef,
    }

    // ✅ CIRCLES: Use Rect with cornerRadius for square bounding box (better drag behavior)
    const isCircle = shape.type === 'circle'
    const cornerRadius = isCircle ? Math.max(shape.width, shape.height) / 2 : 0
    
    // ✅ TRIANGLES: Render triangle using Line with points, bounded by invisible Rect
    if (shape.type === 'triangle') {
      // Triangle points: top-center, bottom-left, bottom-right
      const points = [
        shape.width / 2, 0,                    // Top center
        0, shape.height,                       // Bottom left
        shape.width, shape.height              // Bottom right
      ]
      
      // Separate props for bounding rect (without fill) and common props
      const { fill: _, ...commonPropsWithoutFill } = commonProps
      
      return (
        <>
          {/* Invisible bounding rect for drag behavior */}
          <Rect
            id={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="transparent"
            {...commonPropsWithoutFill}
          />
          {/* Visible triangle */}
          <Line
            x={shape.x}
            y={shape.y}
            points={points}
            closed={true}
            fill={textureImage ? undefined : shape.fill}
            fillPatternImage={commonProps.fillPatternImage}
            fillPatternScaleX={commonProps.fillPatternScaleX}
            fillPatternScaleY={commonProps.fillPatternScaleY}
            stroke={commonProps.stroke}
            strokeWidth={commonProps.strokeWidth}
            listening={false} // Let the bounding rect handle events
          />
        </>
      )
    }
    
    return (
      <Rect
        id={shape.id} // ✅ Required for findOne() in handleDragStart
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        cornerRadius={cornerRadius}
        {...commonProps}
      />
    )
  }

  return (
    <>
      {renderShape()}
      
      {/* Text overlay (works for both shapes) */}
      {shape.text && (
        <Text
          x={shape.x}
          y={shape.y + shape.height / 2 - 7}
          width={shape.width}
          text={shape.text}
          fontSize={shape.fontSize}
          fill={shape.textColor}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
    </>
  )
}, areShapePropsEqual)

SimpleShape.displayName = 'SimpleShape'

// ✅ PERFORMANCE: Memoize shape layer to prevent unnecessary re-renders
const ShapeLayer: React.FC<ShapeLayerProps> = ({ listening, isDragSelectingRef, stageRef, onCursorUpdate }) => {
  // ⚡ PERFORMANCE: Selective subscription - only re-render when shapes array changes
  const shapes = useCanvasStore((state) => state.shapes, shallow)
  const { user } = useUserStore()
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([])
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef<{ [key: string]: Konva.Shape }>({})
  
  // ✅ DRAG-TO-SELECT: Selection rectangle state
  const [selectionRect, setSelectionRect] = useState<{
    visible: boolean
    x1: number
    y1: number
    x2: number
    y2: number
  }>({
    visible: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  })
  const isDrawingSelection = useRef(false)

  // ✅ SHIFT KEY: Track shift key for aspect ratio locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && !isShiftPressed) {
        setIsShiftPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey && isShiftPressed) {
        setIsShiftPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', () => setIsShiftPressed(false))

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', () => setIsShiftPressed(false))
    }
  }, [isShiftPressed])

  // Update transformer aspect ratio based on shift key
  useEffect(() => {
    const transformer = transformerRef.current
    if (transformer) {
      transformer.keepRatio(isShiftPressed)
    }
  }, [isShiftPressed])

  // ✅ PERFORMANCE: Only update transformer when selection changes, not on every shape change
  // Use a separate ref to track if we need to update due to shape type changes
  const lastSelectedShapeTypesRef = useRef<Map<string, string>>(new Map())
  
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    if (selectedShapeIds.length > 0) {
      // Check if any selected shape changed type (rare but needs transformer refresh)
      const currentShapeTypes = new Map<string, string>()
      selectedShapeIds.forEach(id => {
        const shape = shapes.find(s => s.id === id)
        if (shape) currentShapeTypes.set(id, shape.type)
      })
      
      // Only update if selection changed or a shape type changed
      let needsUpdate = selectedShapeIds.length !== lastSelectedShapeTypesRef.current.size
      if (!needsUpdate) {
        for (const [id, type] of currentShapeTypes.entries()) {
          if (lastSelectedShapeTypesRef.current.get(id) !== type) {
            needsUpdate = true
            break
          }
        }
      }
      
      if (needsUpdate) {
        lastSelectedShapeTypesRef.current = currentShapeTypes
        
        // ✅ GET FRESH NODES: Use findOne to get current nodes (handles shape type changes)
        const layer = transformer.getLayer()
        const selectedNodes = selectedShapeIds
          .map(id => layer?.findOne(`#${id}`) as Konva.Shape)
          .filter(node => node !== undefined && node !== null)
        
        if (selectedNodes.length > 0) {
          transformer.nodes(selectedNodes)
          transformer.getLayer()?.batchDraw()
        } else {
          transformer.nodes([])
          transformer.getLayer()?.batchDraw()
        }
      }
    } else {
      lastSelectedShapeTypesRef.current.clear()
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
    }
  }, [selectedShapeIds, shapes])

  // Memoize locked shape IDs to avoid expensive filtering
  const lockedShapeIds = useMemo(() => {
    if (!user) return []
    return shapes.filter(s => s.lockedBy === user.uid).map(s => s.id)
  }, [shapes, user])
  
  // Track which shapes are selected (should match locked shapes)
  useEffect(() => {
    // Fast array equality check (no JSON.stringify)
    if (lockedShapeIds.length !== selectedShapeIds.length ||
        !lockedShapeIds.every(id => selectedShapeIds.includes(id))) {
      setSelectedShapeIds(lockedShapeIds)
    }
  }, [lockedShapeIds, selectedShapeIds])

  // ✅ DRAG-TO-SELECT: Handle mouse down on layer (requires Shift key)
  const handleLayerMouseDown = useCallback((e: any) => {
    const isShiftKey = e.evt?.shiftKey || false
    if (!isShiftKey) return
    
    // Only start selection if clicking on background (not a shape)
    const isBackgroundRect = e.target.name && e.target.name() === 'background-rect'
    const targetType = e.target.getType()
    const isBackgroundClick = targetType === 'Stage' || targetType === 'Layer' || isBackgroundRect
    if (!isBackgroundClick) return

    const stage = e.target.getStage()
    // Use getRelativePointerPosition to account for pan/zoom
    const pointerPosition = stage.getRelativePointerPosition()
    if (!pointerPosition) return

    isDrawingSelection.current = true
    
    if (isDragSelectingRef) {
      isDragSelectingRef.current = true
    }
    
    setSelectionRect({
      visible: true,
      x1: pointerPosition.x,
      y1: pointerPosition.y,
      x2: pointerPosition.x,
      y2: pointerPosition.y
    })
  }, [isDragSelectingRef])

  // Throttle selection rect updates for performance
  const lastMoveTime = useRef(0)
  
  // ✅ DRAG-TO-SELECT: Handle mouse move (throttled for performance)
  const handleStageMouseMove = useCallback((e: any) => {
    if (!isDrawingSelection.current) return

    // Throttle to ~60fps (16ms)
    const now = performance.now()
    if (now - lastMoveTime.current < 16) return
    lastMoveTime.current = now

    const stage = e.target.getStage()
    // Use getRelativePointerPosition to account for pan/zoom
    const pointerPosition = stage.getRelativePointerPosition()
    
    if (!pointerPosition) return

    setSelectionRect(prev => ({
      ...prev,
      x2: pointerPosition.x,
      y2: pointerPosition.y
    }))
  }, [])

  // ✅ DRAG-TO-SELECT: Handle mouse up - finalize selection
  const handleStageMouseUp = useCallback(() => {
    if (!isDrawingSelection.current) {
      if (isDragSelectingRef) {
        isDragSelectingRef.current = false
      }
      return
    }
    
    isDrawingSelection.current = false

    // Calculate selection box bounds
    const box = {
      x: Math.min(selectionRect.x1, selectionRect.x2),
      y: Math.min(selectionRect.y1, selectionRect.y2),
      width: Math.abs(selectionRect.x2 - selectionRect.x1),
      height: Math.abs(selectionRect.y2 - selectionRect.y1)
    }

    // Find shapes that intersect with selection box (using canvas-space coordinates)
    const selectedIds: string[] = []
    shapes.forEach(shape => {
      // Use shape's stored position/dimensions (canvas-space) instead of getClientRect (screen-space)
      const shapeBox = {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      }

      // Check if selection box intersects with shape
      const intersects = !(
        box.x > shapeBox.x + shapeBox.width ||
        box.x + box.width < shapeBox.x ||
        box.y > shapeBox.y + shapeBox.height ||
        box.y + box.height < shapeBox.y
      )

      if (intersects) {
        selectedIds.push(shape.id)
      }
    })

    // ✅ PERFORMANCE: Update selection and lock shapes with batch operations
    if (selectedIds.length > 0 && user) {
      const { batchUpdateShapesOptimistic } = useCanvasStore.getState()
      
      // Release previous selections (optimistic + batch Firebase)
      const previouslyLocked = shapes.filter(s => s.lockedBy === user.uid && !selectedIds.includes(s.id))
      
      // Lock newly selected shapes
      const shapesToLock = selectedIds.filter(id => {
        const shape = shapes.find(s => s.id === id)
        return shape && (!shape.isLocked || shape.lockedBy === user.uid)
      })
      
      // ✅ BATCH: Single state update for all changes
      const allUpdates = [
        // Unlock previously selected shapes
        ...previouslyLocked.map(s => ({
          shapeId: s.id,
          updates: {
            isLocked: false,
            lockedBy: null,
            lockedByName: null,
            lockedByColor: null
          }
        })),
        // Lock newly selected shapes
        ...shapesToLock.map(id => ({
          shapeId: id,
          updates: {
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor
          }
        }))
      ]
      
      if (allUpdates.length > 0) {
        batchUpdateShapesOptimistic(allUpdates)
      }
      
      // ✅ BATCH: Firebase operations in background
      if (previouslyLocked.length > 0) {
        const releaseIds = previouslyLocked.map(s => s.id)
        releaseLockBatch(releaseIds, user.uid).catch(error => {
          console.error('Batch release failed:', error)
        })
      }
      
      if (shapesToLock.length > 0) {
        acquireLockBatch(shapesToLock, user.uid, user.displayName, user.cursorColor).catch(error => {
          console.error('Batch lock failed:', error)
        })
      }

      setSelectedShapeIds(selectedIds)
    }

    // Hide selection rectangle
    setSelectionRect(prev => ({ ...prev, visible: false }))
  }, [selectionRect, shapes, user])

  // ✅ TEXT EDITING: Handle double-click to edit text
  const handleDoubleClick = useCallback((shapeId: string) => {
    setEditingShapeId(shapeId)
  }, [])

  // Get editing shape and stage transform for TextEditor
  const editingShape = editingShapeId ? shapes.find(s => s.id === editingShapeId) : null
  
  // Calculate stage transform on every render so text editor tracks zoom/pan
  const stageTransform = !stageRef?.current 
    ? { scale: 1, x: 0, y: 0 }
    : {
        scale: stageRef.current.scaleX(),
        x: stageRef.current.x(),
        y: stageRef.current.y()
      }

  // Update text in shape
  const handleTextChange = useCallback((shapeId: string, newText: string) => {
    if (!user) return
    const { updateShapeOptimistic } = useCanvasStore.getState()
    updateShapeOptimistic(shapeId, { text: newText })
    updateShape(shapeId, { text: newText }, user.uid)
  }, [user])

  // Close text editor
  const handleCloseTextEditor = useCallback(() => {
    setEditingShapeId(null)
  }, [])

  // Handle deselection when clicking outside (without drag)
  const handleStageClick = useCallback((e: any) => {
    // Don't deselect if we just finished a drag-to-select
    if (isDragSelectingRef && isDragSelectingRef.current) {
      return
    }
    
    // Check if clicked on empty area (stage or background rect)
    const isBackgroundRect = e.target.name && e.target.name() === 'background-rect'
    const isStage = e.target === e.target.getStage()
    
    if (isStage || isBackgroundRect) {
      // ✅ PERFORMANCE: Deselect all and release locks with batch operations
      if (user && selectedShapeIds.length > 0) {
        const { batchUpdateShapesOptimistic } = useCanvasStore.getState()
        
        // ✅ BATCH: Single state update for all deselections
        const updates = selectedShapeIds.map(id => ({
          shapeId: id,
          updates: {
            isLocked: false,
            lockedBy: null,
            lockedByName: null,
            lockedByColor: null
          }
        }))
        
        batchUpdateShapesOptimistic(updates)
        
        // ✅ BATCH: Release locks in background
        releaseLockBatch(selectedShapeIds, user.uid).catch(error => {
          console.error('Batch release failed:', error)
        })
        
        // ✅ CRITICAL: Stop event propagation to prevent shape creation in Canvas
        e.cancelBubble = true
        if (e.evt) {
          e.evt.stopPropagation()
        }
      }
      
      setSelectedShapeIds([])
    }
  }, [user, selectedShapeIds, isDragSelectingRef])

  // Handle shape selection with shift+click for multi-select
  const handleShapeSelect = useCallback((shapeId: string, isShiftKey: boolean) => {
    if (isShiftKey) {
      // Toggle shape in selection
      setSelectedShapeIds(prev => {
        if (prev.includes(shapeId)) {
          return prev.filter(id => id !== shapeId)
        } else {
          return [...prev, shapeId]
        }
      })
    } else {
      // Single select (replace selection)
      setSelectedShapeIds([shapeId])
    }
  }, [])

  // ✅ PERFORMANCE: Select all shapes with Cmd/Ctrl+A (optimized for 500+ shapes)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        
        if (!user) return
        
        // ✅ PERFORMANCE: Batch update all shapes in a SINGLE state update
        const { batchUpdateShapesOptimistic } = useCanvasStore.getState()
        
        // Filter shapes that can be locked
        const lockableShapes = shapes.filter(shape => !shape.isLocked || shape.lockedBy === user.uid)
        
        if (lockableShapes.length === 0) return
        
        console.log(`⚡ Select All: Batching ${lockableShapes.length} shape updates`)
        
        // ✅ INSTANT: Single optimistic update for all shapes (1 re-render instead of 500!)
        const batchUpdates = lockableShapes.map(shape => ({
          shapeId: shape.id,
          updates: {
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor
          }
        }))
        
        batchUpdateShapesOptimistic(batchUpdates)
        
        // ✅ BACKGROUND: Batch Firebase sync (5-10x faster than individual locks)
        const shapeIds = lockableShapes.map(s => s.id)
        acquireLockBatch(shapeIds, user.uid, user.displayName, user.cursorColor).catch(error => {
          console.error('Batch lock acquisition failed:', error)
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shapes, user])

  // Memoize selection rectangle display coordinates  
  const selectionRectAttrs = useMemo(() => ({
    x: Math.min(selectionRect.x1, selectionRect.x2),
    y: Math.min(selectionRect.y1, selectionRect.y2),
    width: Math.abs(selectionRect.x2 - selectionRect.x1),
    height: Math.abs(selectionRect.y2 - selectionRect.y1)
  }), [selectionRect])

  // ✅ KONVA GROUP: Separate shapes into multi-select group and individual shapes
  const multiSelectShapes = useMemo(() => {
    if (!user || selectedShapeIds.length <= 1) return []
    return shapes.filter(s => selectedShapeIds.includes(s.id))
  }, [shapes, selectedShapeIds, user])

  const singleShapes = useMemo(() => {
    if (multiSelectShapes.length === 0) return shapes
    const multiSelectIds = new Set(multiSelectShapes.map(s => s.id))
    return shapes.filter(s => !multiSelectIds.has(s.id))
  }, [shapes, multiSelectShapes])

  // ✅ GROUP DRAG: Handle group drag with proper boundary constraints
  const groupRef = useRef<Konva.Group>(null)
  
  // Ensure group position is always at (0, 0) when selection changes
  useEffect(() => {
    if (groupRef.current && multiSelectShapes.length > 1) {
      groupRef.current.position({ x: 0, y: 0 })
    }
  }, [multiSelectShapes.length])
  
  const handleGroupDragStart = useCallback(() => {
    // Ensure group starts at (0, 0) for consistent boundary calculations
    const group = groupRef.current
    if (group) {
      group.position({ x: 0, y: 0 })
    }
  }, [])

  // ⚡ PERFORMANCE: Throttle cursor updates during group drag
  const lastGroupDragUpdateRef = useRef<number>(0)
  const handleGroupDragMove = useCallback((e: any) => {
    const group = e.target
    const pos = group.position()
    
    // Update cursor position during group drag (throttled to 100ms = 10fps)
    if (onCursorUpdate && user) {
      const now = Date.now()
      // ⚡ OPTIMIZATION: Only update every 100ms (10fps)
      if (now - lastGroupDragUpdateRef.current >= 100) {
        lastGroupDragUpdateRef.current = now
        const stage = e.target.getStage()
        const pointerPos = stage.getPointerPosition()
        if (pointerPos && stageRef?.current) {
          const transform = stage.getAbsoluteTransform().copy().invert()
          const canvasPos = transform.point(pointerPos)
          onCursorUpdate(Math.round(canvasPos.x), Math.round(canvasPos.y))
        }
      }
    }
    
    // Get fresh shapes and calculate bounds
    const { shapes: freshShapes } = useCanvasStore.getState()
    const lockedShapes = user ? freshShapes.filter(s => s.lockedBy === user.uid) : []
    
    if (lockedShapes.length <= 1) return
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    lockedShapes.forEach(shape => {
      minX = Math.min(minX, shape.x)
      minY = Math.min(minY, shape.y)
      maxX = Math.max(maxX, shape.x + shape.width)
      maxY = Math.max(maxY, shape.y + shape.height)
    })
    
    // Calculate new bounds
    const newMinX = minX + pos.x
    const newMinY = minY + pos.y
    const newMaxX = maxX + pos.x
    const newMaxY = maxY + pos.y
    
    // Manually constrain
    let constrainedX = pos.x
    let constrainedY = pos.y
    let constrained = false
    
    if (newMinX < 0) {
      constrainedX = -minX
      constrained = true
    }
    if (newMaxX > 5000) {
      constrainedX = 5000 - maxX
      constrained = true
    }
    if (newMinY < 0) {
      constrainedY = -minY
      constrained = true
    }
    if (newMaxY > 5000) {
      constrainedY = 5000 - maxY
      constrained = true
    }
    
    // Apply constraint if needed
    if (constrained) {
      group.position({ x: constrainedX, y: constrainedY })
      group.getLayer()?.batchDraw()
    }
  }, [user])
  
  const handleGroupDragEnd = useCallback((e: any) => {
    if (!user) return
    
    const group = e.target
    const groupX = group.x()
    const groupY = group.y()
    
    const { updateShapeOptimistic } = useCanvasStore.getState()
    
    // Update all shapes in the group with their new absolute positions
    multiSelectShapes.forEach(shape => {
      const newX = shape.x + groupX
      const newY = shape.y + groupY
      
      updateShapeOptimistic(shape.id, { x: newX, y: newY })
      updateShape(shape.id, { x: newX, y: newY }, user.uid)
    })
    
    // Reset group position after updating shapes
    group.position({ x: 0, y: 0 })
  }, [user, multiSelectShapes])

  const groupDragBoundFunc = useCallback((pos: { x: number, y: number }) => {
    // Get fresh shapes from store to avoid stale closure
    const { shapes: freshShapes } = useCanvasStore.getState()
    const lockedShapes = user ? freshShapes.filter(s => s.lockedBy === user.uid) : []
    
    if (lockedShapes.length <= 1) return pos
    
    // Calculate group bounding box
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    lockedShapes.forEach(shape => {
      minX = Math.min(minX, shape.x)
      minY = Math.min(minY, shape.y)
      maxX = Math.max(maxX, shape.x + shape.width)
      maxY = Math.max(maxY, shape.y + shape.height)
    })
    
    // Apply delta to bounding box
    const newMinX = minX + pos.x
    const newMinY = minY + pos.y
    const newMaxX = maxX + pos.x
    const newMaxY = maxY + pos.y
    
    // Constrain to canvas bounds (check ALL boundaries, not else-if)
    let constrainedX = pos.x
    let constrainedY = pos.y
    
    // Check left boundary
    if (newMinX < 0) {
      constrainedX = -minX
    }
    // Check right boundary
    if (newMaxX > 5000) {
      constrainedX = 5000 - maxX
    }
    
    // Check top boundary
    if (newMinY < 0) {
      constrainedY = -minY
    }
    // Check bottom boundary  
    if (newMaxY > 5000) {
      constrainedY = 5000 - maxY
    }
    
    return { x: constrainedX, y: constrainedY }
  }, [user])

  return (
    <Layer 
      listening={listening}
      onMouseDown={handleLayerMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
    >
      {/* Invisible rectangle to capture mouse events on empty canvas areas */}
      <Rect
        name="background-rect"
        x={0}
        y={0}
        width={5000}
        height={5000}
        fill="transparent"
        listening={listening}
        onClick={handleStageClick}
        onTap={handleStageClick}
      />
      
      {/* ✅ KONVA GROUP: Multi-selected shapes wrapped in draggable group */}
      {multiSelectShapes.length > 1 && (
        <Group
          key={`group-${multiSelectShapes.map(s => s.id).join('-')}`}
          ref={groupRef}
          x={0}
          y={0}
          draggable={true}
          onDragStart={handleGroupDragStart}
          onDragMove={handleGroupDragMove}
          onDragEnd={handleGroupDragEnd}
          dragBoundFunc={groupDragBoundFunc}
        >
          {multiSelectShapes.map((shape) => {
            const handleRef = (node: Konva.Shape | null) => {
              if (node) {
                shapeRefs.current[shape.id] = node
              }
            }
            
            return (
              <SimpleShape 
                key={shape.id} 
                shape={shape}
                isSelected={true}
                onSelect={(e: any) => handleShapeSelect(shape.id, e.evt?.shiftKey || false)}
                onDoubleClick={handleDoubleClick}
                shapeRef={{ current: null, callback: handleRef } as any}
                disableDrag={true}
                onCursorUpdate={onCursorUpdate}
              />
            )
          })}
        </Group>
      )}
      
      {/* ✅ INDIVIDUAL SHAPES: Single shapes or unselected shapes */}
      {singleShapes.map((shape) => {
        const handleRef = (node: Konva.Shape | null) => {
          if (node) {
            shapeRefs.current[shape.id] = node
          }
        }
        
        return (
          <SimpleShape 
            key={shape.id} 
            shape={shape}
            isSelected={selectedShapeIds.includes(shape.id)}
            onSelect={(e: any) => handleShapeSelect(shape.id, e.evt?.shiftKey || false)}
            onDoubleClick={handleDoubleClick}
            shapeRef={{ current: null, callback: handleRef } as any}
            onCursorUpdate={onCursorUpdate}
          />
        )
      })}
      
      {/* ✅ DRAG-TO-SELECT: Selection rectangle (marquee) */}
      {selectionRect.visible && (
        <Rect
          x={selectionRectAttrs.x}
          y={selectionRectAttrs.y}
          width={selectionRectAttrs.width}
          height={selectionRectAttrs.height}
          fill="rgba(0, 102, 255, 0.1)"
          stroke={user?.cursorColor || '#0066ff'}
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}
      
      {/* ✅ FIGMA-LIKE TRANSFORMER: Resize handles with aspect ratio locking */}
      <Transformer
        ref={transformerRef}
        flipEnabled={false}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit resize to minimum size
          if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
            return oldBox
          }
          return newBox
        }}
        onTransformEnd={(e) => {
          // When transform ends, sync the new dimensions
          const node = e.target
          
          if (node && (node.getType() === 'Rect' || node.className === 'Rect')) {
            const shapeId = node.id()
            const shape = shapes.find(s => s.id === shapeId)
            if (shape && user) {
              // Get transformed dimensions
              const scaleX = node.scaleX()
              const scaleY = node.scaleY()
              const newWidth = Math.max(20, Math.round(node.width() * scaleX))
              const newHeight = Math.max(20, Math.round(node.height() * scaleY))
              const newX = Math.round(node.x())
              const newY = Math.round(node.y())
              
              // Reset scale to 1 (bake the scale into width/height)
              node.scaleX(1)
              node.scaleY(1)
              
              // Update store and Firebase
              const { updateShapeOptimistic, optimisticUpdates } = useCanvasStore.getState()
              updateShapeOptimistic(shapeId, { 
                x: newX,
                y: newY,
                width: newWidth, 
                height: newHeight 
              })
              
              // Sync to Firebase and clear optimistic update when done
              updateShape(shapeId, { 
                x: newX,
                y: newY,
                width: newWidth, 
                height: newHeight 
              }, user.uid).then(() => {
                // Clear optimistic update to allow other users' changes through
                const newOptimisticUpdates = new Map(optimisticUpdates)
                newOptimisticUpdates.delete(shapeId)
                useCanvasStore.setState({ optimisticUpdates: newOptimisticUpdates })
              })
            }
          }
        }}
        // ✅ SHIFT-KEY ASPECT RATIO: Enable when shift is pressed
        enabledAnchors={[
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
          'top-center',
          'middle-right',
          'bottom-center',
          'middle-left'
        ]}
        keepRatio={false} // We'll handle this with shift key
        anchorSize={8}
        anchorStroke={user?.cursorColor || '#0066ff'}
        anchorFill="white"
        anchorStrokeWidth={2}
        borderStroke={user?.cursorColor || '#0066ff'}
        borderStrokeWidth={3}
        borderEnabled={true}
        ignoreStroke={true}
        rotateEnabled={false} // Disable rotation for now
      />
      
      {/* ✅ TEXT EDITOR: Double-click shape to edit text */}
      {editingShape && stageRef && (
        <TextEditor
          shape={editingShape}
          stageScale={stageTransform.scale}
          stageX={stageTransform.x}
          stageY={stageTransform.y}
          onTextChange={(text) => handleTextChange(editingShape.id, text)}
          onClose={handleCloseTextEditor}
        />
      )}
    </Layer>
  )
}

export default ShapeLayer