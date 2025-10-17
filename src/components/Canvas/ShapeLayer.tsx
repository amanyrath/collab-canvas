import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Layer, Rect, Circle, Text, Transformer } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'
import { updateShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock, acquireLockBatch, releaseLockBatch } from '../../utils/lockUtils'
import { updateCursorPosition } from '../../utils/presenceUtils'

interface ShapeLayerProps {
  listening: boolean
  isDragSelectingRef?: React.MutableRefObject<boolean>
}

// ✅ PERFORMANCE: Custom comparison for React.memo to prevent unnecessary re-renders
const areShapePropsEqual = (
  prevProps: { shape: Shape; isSelected: boolean; onSelect: (e: any) => void; shapeRef: React.RefObject<Konva.Shape> },
  nextProps: { shape: Shape; isSelected: boolean; onSelect: (e: any) => void; shapeRef: React.RefObject<Konva.Shape> }
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
    prevProps.isSelected === nextProps.isSelected
    // Note: We don't compare onSelect or shapeRef as they are stable
  )
}

// ✅ SIMPLIFIED: Selection = Locking (no dual state)
const SimpleShape: React.FC<{ 
  shape: Shape
  isSelected: boolean
  onSelect: (e: any) => void
  shapeRef: React.RefObject<Konva.Shape>
}> = React.memo(({ shape, isSelected: _isSelected, onSelect, shapeRef }) => {
  const { shapes } = useCanvasStore()
  const { user } = useUserStore()
  
  const isLockedByMe = shape.isLocked && shape.lockedBy === user?.uid
  const isLockedByOthers = shape.isLocked && shape.lockedBy !== user?.uid
  const canDrag = !isLockedByOthers && !!user

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
          })
          releaseLock(shape.id, user.uid, user.displayName)
        } else {
          // Add to selection
          updateShapeOptimistic(shape.id, {
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor
          })
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
        })
      })
      
        // Lock new shape (single selection)
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      })
      
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

  // ✅ MULTI-SELECT DRAG: Track starting positions for "virtual group"
  const dragStartPositionsRef = useRef<Map<string, { startX: number; startY: number }>>(new Map())
  
  // ✅ DRAG START: Support both single and multi-select dragging
  const handleDragStart = useCallback((e: any) => {
    // ✅ Clear node cache at start of drag
    dragNodesCache.current.clear()
    
    // ✅ GET FRESH DATA: Read latest shape positions from store
    const { shapes: freshShapes } = useCanvasStore.getState()
    const userLockedShapes = freshShapes.filter(s => s.lockedBy === user?.uid)
    const isMultiSelect = userLockedShapes.length > 1 && isLockedByMe
    
    if (isMultiSelect) {
      // ✅ MULTI-SELECT: Store starting positions for all selected shapes
      console.log('🚀 Multi-select drag starting with', userLockedShapes.length, 'shapes')
      
      dragStartPositionsRef.current.clear()
      
      // ✅ ALWAYS GET FRESH NODE POSITIONS: This handles shape type changes
      const layer = e.target.getLayer()
      userLockedShapes.forEach(s => {
        const node = layer?.findOne(`#${s.id}`)
        if (node) {
          // Store current Konva position (whatever it is right now)
          dragStartPositionsRef.current.set(s.id, {
            startX: node.x(),
            startY: node.y()
          })
        }
      })
    } else {
      // ✅ SINGLE SELECT: Release others and select only this shape
      dragStartPositionsRef.current.clear()
      onSelect({ evt: { shiftKey: false } })
      
      if (!isLockedByMe && user) {
        const { updateShapeOptimistic } = useCanvasStore.getState()
        
        // Release other shapes
        userLockedShapes.forEach(s => {
          if (s.id !== shape.id) {
            updateShapeOptimistic(s.id, { 
              isLocked: false, 
              lockedBy: null, 
              lockedByName: null, 
              lockedByColor: null 
            })
            releaseLock(s.id, user.uid, user.displayName)
          }
        })
        
        // Lock the shape being dragged
        updateShapeOptimistic(shape.id, {
          isLocked: true,
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByColor: user.cursorColor
        })
        
        acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
      }
    }
  }, [shape.id, isLockedByMe, user, onSelect])
  
  // ✅ Cache for drag nodes to reduce lookups
  const dragNodesCache = useRef<Map<string, Konva.Node>>(new Map())
  
  // ✅ DRAG MOVE: Move all selected shapes together (virtual group)
  const handleDragMove = useCallback((e: any) => {
    // ✅ Update cursor position during drag
    if (user) {
      const stage = e.target.getStage()
      const pointerPos = stage.getRelativePointerPosition()
      if (pointerPos) {
        updateCursorPosition(user.uid, Math.round(pointerPos.x), Math.round(pointerPos.y))
      }
    }
    
    if (dragStartPositionsRef.current.size <= 1) return // Single or no selection
    
    const thisShapeStart = dragStartPositionsRef.current.get(shape.id)
    if (!thisShapeStart) return
    
    // Calculate how much this shape has moved
    const deltaX = e.target.x() - thisShapeStart.startX
    const deltaY = e.target.y() - thisShapeStart.startY
    
    // ✅ OPTIMIZED: Use cached layer reference
    const layer = e.target.getLayer()
    if (!layer) return
    
    // ✅ PERFORMANCE: Build node cache on first drag move if needed
    if (dragNodesCache.current.size === 0) {
      dragStartPositionsRef.current.forEach((_, shapeId) => {
        if (shapeId !== shape.id) {
          const node = layer.findOne(`#${shapeId}`)
          if (node) {
            dragNodesCache.current.set(shapeId, node)
          }
        }
      })
    }
    
    // Move all other selected shapes by the same delta (using cached nodes)
    dragStartPositionsRef.current.forEach((data, shapeId) => {
      if (shapeId !== shape.id) {
        const node = dragNodesCache.current.get(shapeId)
        if (node) {
          node.x(data.startX + deltaX)
          node.y(data.startY + deltaY)
        }
      }
    })
    
    // Batch draw for performance
    layer.batchDraw()
  }, [shape.id, user])

  // ✅ DRAG END: Save final positions for all moved shapes
  const handleDragEnd = useCallback((e: any) => {
    if (!user) return
    
    // ✅ Clear caches
    dragNodesCache.current.clear()
    
    const { updateShapeOptimistic, shapes: freshShapes } = useCanvasStore.getState()
    
    if (dragStartPositionsRef.current.size > 1) {
      // ✅ MULTI-SELECT: Update all shapes that were moved together
      console.log(`💾 Saving positions for ${dragStartPositionsRef.current.size} shapes`)
      
      // ✅ USE CACHED NODES: Reuse from drag operation
      const layer = e.target.getLayer()
      
      dragStartPositionsRef.current.forEach((_data, shapeId) => {
        const currentShape = freshShapes.find(s => s.id === shapeId)
        if (!currentShape) return
        
        // Get node from cache or lookup
        let node = dragNodesCache.current.get(shapeId)
        if (!node && layer) {
          node = layer.findOne(`#${shapeId}`) as Konva.Node
        }
        if (!node) return
        
        // Get final position from node
        let finalX = Math.round(node.x())
        let finalY = Math.round(node.y())
        
        // Convert to store coordinates (top-left for all shapes)
        if (currentShape.type === 'circle') {
          finalX = finalX - currentShape.width / 2
          finalY = finalY - currentShape.height / 2
        }
        
        // Update store and Firebase
        updateShapeOptimistic(shapeId, { x: finalX, y: finalY })
        updateShape(shapeId, { x: finalX, y: finalY }, user.uid)
      })
      
      dragStartPositionsRef.current.clear()
    } else {
      // ✅ SINGLE SELECT: Update just this shape
      let finalX = Math.round(e.target.x())
      let finalY = Math.round(e.target.y())
      
      // Convert to store coordinates
      if (shape.type === 'circle') {
        finalX = finalX - shape.width / 2
        finalY = finalY - shape.height / 2
      }
      
      updateShapeOptimistic(shape.id, { x: finalX, y: finalY })
      updateShape(shape.id, { x: finalX, y: finalY }, user.uid)
    }
  }, [shape.id, shape.type, shape.width, shape.height, user])

  // ✅ RESIZE HANDLER: Update shape dimensions after transform
  const handleTransformEnd = useCallback((_e: any) => {
    const node = shapeRef.current
    if (!node || !user) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    // Calculate new dimensions
    let newWidth = Math.max(20, Math.round(node.width() * scaleX))
    let newHeight = Math.max(20, Math.round(node.height() * scaleY))
    let newX = Math.round(node.x())
    let newY = Math.round(node.y())
    
    // Reset scale to 1 (bake the scale into width/height)
    node.scaleX(1)
    node.scaleY(1)
    
    // For circles, maintain circular shape or update based on scale
    if (shape.type === 'circle') {
      // Adjust position for circle center
      newX = newX - newWidth / 2
      newY = newY - newHeight / 2
    }
    
    // ✅ BOUNDARY CONSTRAINTS: Ensure resized shape stays within canvas
    if (shape.type === 'circle') {
      const radius = Math.min(newWidth, newHeight) / 2
      // Constrain position so circle doesn't go outside
      newX = Math.max(-newWidth / 2 + radius, Math.min(5000 - newWidth / 2 - radius, newX))
      newY = Math.max(-newHeight / 2 + radius, Math.min(5000 - newHeight / 2 - radius, newY))
    } else {
      // Constrain so rectangle doesn't exceed boundaries
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
  }, [shape.id, shape.type, user, shapeRef])

  // ✅ DRAG BOUNDS: Constrain individual shapes and virtual group within canvas
  const dragBoundFunc = useCallback((pos: any) => {
    // Get fresh shape data
    const { shapes: freshShapes } = useCanvasStore.getState()
    const currentShape = freshShapes.find(s => s.id === shape.id)
    if (!currentShape) return pos
    
    // Ensure positive dimensions
    const shapeWidth = Math.max(1, currentShape.width)
    const shapeHeight = Math.max(1, currentShape.height)
    
    // Snap to grid
    const gridSize = 1
    let x = Math.round(pos.x / gridSize) * gridSize
    let y = Math.round(pos.y / gridSize) * gridSize
    
    // Check if multi-select
    const userLockedShapes = freshShapes.filter(s => s.lockedBy === user?.uid)
    const isMultiSelect = userLockedShapes.length > 1
    
    if (isMultiSelect && dragStartPositionsRef.current.size > 1) {
      // ✅ VIRTUAL GROUP: Calculate bounds for entire group
      const thisStart = dragStartPositionsRef.current.get(shape.id)
      if (!thisStart) return { x, y }
      
      const deltaX = x - thisStart.startX
      const deltaY = y - thisStart.startY
      
      let constrainedDeltaX = deltaX
      let constrainedDeltaY = deltaY
      
      // Check boundaries for each shape in the group
      dragStartPositionsRef.current.forEach((data, shapeId) => {
        const s = freshShapes.find(sh => sh.id === shapeId)
        if (!s) return
        
        const newX = data.startX + deltaX
        const newY = data.startY + deltaY
        
        // Calculate bounds (Konva coordinates)
        let minX, maxX, minY, maxY
        
        // Ensure positive dimensions
        const w = Math.max(1, s.width)
        const h = Math.max(1, s.height)
        
        if (s.type === 'circle') {
          const radius = Math.min(w, h) / 2
          minX = radius
          maxX = Math.max(radius, 5000 - radius)
          minY = radius
          maxY = Math.max(radius, 5000 - radius)
        } else {
          minX = 0
          maxX = Math.max(0, 5000 - w)
          minY = 0
          maxY = Math.max(0, 5000 - h)
        }
        
        // Constrain delta to keep this shape in bounds
        if (newX < minX) {
          // Moving too far left - reduce negative delta (make it less negative)
          const maxAllowedDelta = minX - data.startX
          constrainedDeltaX = Math.max(constrainedDeltaX, maxAllowedDelta)
        } else if (newX > maxX) {
          // Moving too far right - reduce positive delta
          const maxAllowedDelta = maxX - data.startX
          constrainedDeltaX = Math.min(constrainedDeltaX, maxAllowedDelta)
        }
        
        if (newY < minY) {
          // Moving too far up - reduce negative delta (make it less negative)
          const maxAllowedDelta = minY - data.startY
          constrainedDeltaY = Math.max(constrainedDeltaY, maxAllowedDelta)
        } else if (newY > maxY) {
          // Moving too far down - reduce positive delta
          const maxAllowedDelta = maxY - data.startY
          constrainedDeltaY = Math.min(constrainedDeltaY, maxAllowedDelta)
        }
      })
      
      return {
        x: thisStart.startX + constrainedDeltaX,
        y: thisStart.startY + constrainedDeltaY
      }
    }
    
    // ✅ SINGLE SELECT: Standard boundary constraints
    if (currentShape.type === 'circle') {
      const radius = Math.min(shapeWidth, shapeHeight) / 2
      const maxPos = Math.max(radius, 5000 - radius)
      return {
        x: Math.max(radius, Math.min(maxPos, x)),
        y: Math.max(radius, Math.min(maxPos, y))
      }
    }
    
    // Rectangle: constrain top-left corner
    const maxX = Math.max(0, 5000 - shapeWidth)
    const maxY = Math.max(0, 5000 - shapeHeight)
    
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y))
    }
  }, [shape.id, user])

  // ✅ SHAPE RENDERING: Support both rectangles and circles
  const renderShape = () => {
    const strokeColor = isLockedByMe 
      ? (user?.cursorColor || '#0066ff')
      : isLockedByOthers
        ? (shape.lockedByColor || '#ff6b6b')
        : 'transparent'
    const strokeWidth = isLockedByMe || isLockedByOthers ? 2 : 0

    const commonProps = {
      fill: shape.fill,
      stroke: strokeColor,
      strokeWidth,
      strokeScaleEnabled: false, // Keep stroke width constant during transforms
      draggable: canDrag,
      dragBoundFunc: canDrag ? dragBoundFunc : undefined,
      onClick: handleClick,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove, // ✅ VIRTUAL GROUP: Sync other shapes during drag
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      ref: (shapeRef as any).callback || shapeRef,
    }

    if (shape.type === 'circle') {
      return (
        <Circle
          id={shape.id} // ✅ Required for findOne() in handleDragStart
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          radius={Math.min(shape.width, shape.height) / 2}
          {...commonProps}
        />
      )
    } else {
      return (
        <Rect
          id={shape.id} // ✅ Required for findOne() in handleDragStart
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...commonProps}
        />
      )
    }
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
const ShapeLayer: React.FC<ShapeLayerProps> = ({ listening, isDragSelectingRef }) => {
  const { shapes } = useCanvasStore()
  const { user } = useUserStore()
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([])
  const [isShiftPressed, setIsShiftPressed] = useState(false)
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
      
      {shapes.map((shape) => {
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
            shapeRef={{ current: null, callback: handleRef } as any}
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
    </Layer>
  )
}

export default ShapeLayer