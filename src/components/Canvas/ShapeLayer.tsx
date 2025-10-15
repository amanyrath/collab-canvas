import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Layer, Rect, Circle, Text, Transformer } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'
import { updateShape } from '../../utils/shapeUtils'
import { acquireLock, releaseLock } from '../../utils/lockUtils'

interface ShapeLayerProps {
  listening: boolean
  isDragSelectingRef?: React.MutableRefObject<boolean>
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

  // ✅ DRAG START: Ensure single selection + lock for dragging
  const handleDragStart = useCallback(() => {
    onSelect({ evt: { shiftKey: false } }) // Ensure this shape is selected (single-select for drag)
    
    if (!isLockedByMe && user) {
      const { updateShapeOptimistic } = useCanvasStore.getState()
      const userLockedShapes = shapes.filter(s => s.lockedBy === user.uid && s.id !== shape.id)
      
      // ✅ SINGLE SELECTION: Release other shapes when starting drag
      userLockedShapes.forEach(s => {
        updateShapeOptimistic(s.id, { 
          isLocked: false, 
          lockedBy: null, 
          lockedByName: null, 
          lockedByColor: null 
        })
        releaseLock(s.id, user.uid, user.displayName)
      })
      
      // Lock the shape being dragged
      updateShapeOptimistic(shape.id, {
        isLocked: true,
        lockedBy: user.uid,
        lockedByName: user.displayName,
        lockedByColor: user.cursorColor
      })
      
      // Background Firebase lock acquisition
      acquireLock(shape.id, user.uid, user.displayName, user.cursorColor)
    }
  }, [shape.id, isLockedByMe, user, shapes, onSelect])

  // ✅ OPTIMISTIC DRAG END: Instant position updates with proper circle handling
  const handleDragEnd = useCallback((e: any) => {
    let newX = Math.round(e.target.x())
    let newY = Math.round(e.target.y())
    
    // ✅ CIRCLE FIX: Adjust position for circles since they're positioned by center
    if (shape.type === 'circle') {
      newX = newX - shape.width / 2
      newY = newY - shape.height / 2
    }
    
    if (user) {
      const { updateShapeOptimistic } = useCanvasStore.getState()
      
      // ✅ INSTANT: Update position locally first
      updateShapeOptimistic(shape.id, { x: newX, y: newY })
      
      // ✅ BACKGROUND: Sync to Firebase (non-blocking)
      updateShape(shape.id, { x: newX, y: newY }, user.uid)
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

  // ✅ PERFORMANCE: Drag boundary constraints with circle support
  const dragBoundFunc = useCallback((pos: any) => {
    // Snap to grid (optional - can be disabled for smoother dragging)
    const gridSize = 1 // Set to 1 for pixel-perfect positioning
    const snappedX = Math.round(pos.x / gridSize) * gridSize
    const snappedY = Math.round(pos.y / gridSize) * gridSize
    
    // ✅ CIRCLE BOUNDS: Account for circle center positioning
    if (shape.type === 'circle') {
      const radius = Math.min(shape.width, shape.height) / 2
      return {
        x: Math.max(radius, Math.min(5000 - radius, snappedX)),
        y: Math.max(radius, Math.min(5000 - radius, snappedY))
      }
    }
    
    // Rectangle bounds
    return {
      x: Math.max(0, Math.min(4900, snappedX)), // 5000 - 100 (shape width)
      y: Math.max(0, Math.min(4900, snappedY))  // 5000 - 100 (shape height)
    }
  }, [shape.type, shape.width, shape.height])

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
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      ref: (shapeRef as any).callback || shapeRef,
    }

    if (shape.type === 'circle') {
      return (
        <Circle
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          radius={Math.min(shape.width, shape.height) / 2}
          {...commonProps}
        />
      )
    } else {
      return (
        <Rect
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
})

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

  // Update transformer when selection changes
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    if (selectedShapeIds.length > 0) {
      const selectedNodes = selectedShapeIds
        .map(id => shapeRefs.current[id])
        .filter(node => node !== undefined && node !== null)
      
      if (selectedNodes.length > 0) {
        transformer.nodes(selectedNodes)
        transformer.getLayer()?.batchDraw()
      } else {
        transformer.nodes([])
        transformer.getLayer()?.batchDraw()
      }
    } else {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
    }
  }, [selectedShapeIds])

  // Track which shapes are selected (should match locked shapes)
  useEffect(() => {
    if (user) {
      const myLockedShapes = shapes.filter(s => s.lockedBy === user.uid)
      const lockedIds = myLockedShapes.map(s => s.id)
      
      // Only update if the selection actually changed
      if (JSON.stringify(lockedIds.sort()) !== JSON.stringify(selectedShapeIds.sort())) {
        setSelectedShapeIds(lockedIds)
      }
    }
  }, [shapes, user, selectedShapeIds])

  // ✅ DRAG-TO-SELECT: Handle mouse down on layer (requires Shift key)
  const handleLayerMouseDown = useCallback((e: any) => {
    console.log('🎯 MOUSE DOWN ON LAYER!', {
      shiftKey: e.evt?.shiftKey,
      targetType: e.target.getType(),
      listening: listening
    })
    
    const targetType = e.target.getType()
    const isShiftKey = e.evt?.shiftKey || false
    
    // Only start drag-to-select if Shift is held and clicking on empty area
    if (!isShiftKey) {
      console.log('❌ No shift key pressed')
      return
    }
    
    // Only start selection if clicking on empty area (Stage or Layer, not a shape)
    if (targetType !== 'Stage' && targetType !== 'Layer') {
      console.log('❌ Target is not Stage/Layer:', targetType)
      return
    }

    const stage = e.target.getStage()
    const pointerPosition = stage.getPointerPosition()
    
    if (!pointerPosition) {
      console.log('❌ No pointer position')
      return
    }

    console.log('✅ Shift+drag to select started at', pointerPosition)
    isDrawingSelection.current = true
    
    // Tell Canvas we're doing a drag-to-select (prevents shape creation)
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
  }, [isDragSelectingRef, listening])

  // ✅ DRAG-TO-SELECT: Handle mouse move
  const handleStageMouseMove = useCallback((e: any) => {
    if (!isDrawingSelection.current) return

    const stage = e.target.getStage()
    const pointerPosition = stage.getPointerPosition()
    
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
      // Not drawing, reset the flag just in case
      if (isDragSelectingRef) {
        isDragSelectingRef.current = false
      }
      return
    }
    
    console.log('✅ Shift+drag selection complete')
    isDrawingSelection.current = false

    // Calculate selection box bounds
    const box = {
      x: Math.min(selectionRect.x1, selectionRect.x2),
      y: Math.min(selectionRect.y1, selectionRect.y2),
      width: Math.abs(selectionRect.x2 - selectionRect.x1),
      height: Math.abs(selectionRect.y2 - selectionRect.y1)
    }

    // Find shapes that intersect with selection box
    const selectedIds: string[] = []
    shapes.forEach(shape => {
      const shapeNode = shapeRefs.current[shape.id]
      if (!shapeNode) return

      // Get shape bounding box
      const shapeBox = shapeNode.getClientRect()

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

    // Update selection and lock shapes
    if (selectedIds.length > 0 && user) {
      const { updateShapeOptimistic } = useCanvasStore.getState()
      
      // Release previous selections
      const previouslyLocked = shapes.filter(s => s.lockedBy === user.uid && !selectedIds.includes(s.id))
      previouslyLocked.forEach(s => {
        updateShapeOptimistic(s.id, {
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedByColor: null
        })
        releaseLock(s.id, user.uid, user.displayName)
      })

      // Lock newly selected shapes
      selectedIds.forEach(id => {
        const shape = shapes.find(s => s.id === id)
        if (shape && !shape.isLocked) {
          updateShapeOptimistic(id, {
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor
          })
          acquireLock(id, user.uid, user.displayName, user.cursorColor)
        }
      })

      setSelectedShapeIds(selectedIds)
    }

    // Hide selection rectangle
    setSelectionRect(prev => ({ ...prev, visible: false }))
  }, [selectionRect, shapes, user])

  // Handle deselection when clicking outside (without drag)
  const handleStageClick = useCallback((e: any) => {
    // Check if clicked on empty area (stage)
    if (e.target === e.target.getStage()) {
      setSelectedShapeIds([])
    }
  }, [])

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

  // Select all shapes with Cmd/Ctrl+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        const allShapeIds = shapes.map(s => s.id)
        setSelectedShapeIds(allShapeIds)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shapes])

  // Calculate selection rectangle display coordinates
  const selectionRectAttrs = {
    x: Math.min(selectionRect.x1, selectionRect.x2),
    y: Math.min(selectionRect.y1, selectionRect.y2),
    width: Math.abs(selectionRect.x2 - selectionRect.x1),
    height: Math.abs(selectionRect.y2 - selectionRect.y1)
  }

  return (
    <Layer 
      listening={listening}
    >
      {/* Invisible rectangle to capture mouse events on empty canvas areas */}
      <Rect
        x={0}
        y={0}
        width={5000}
        height={5000}
        fill="transparent"
        listening={listening}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseDown={handleLayerMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
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