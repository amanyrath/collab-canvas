// Trackpad-friendly navigation hook for Canvas
import { useCallback } from 'react'

/**
 * ✅ TRACKPAD-FRIENDLY: Enhanced wheel/gesture handling
 * Supports: trackpad scroll, pinch-zoom, mouse wheel, touch gestures
 */
export const useTrackpadNavigation = (stageRef: React.RefObject<any>) => {
  
  // ✅ BUILT-IN: Detect trackpad vs mouse wheel
  const detectTrackpad = useCallback((e: WheelEvent): boolean => {
    // Trackpad usually has smaller, more frequent deltaY values
    // and often includes deltaX (horizontal scroll)
    return (
      Math.abs(e.deltaY) < 50 && // Small scroll increments
      (e.deltaX !== 0 || e.ctrlKey || e.metaKey) // Has horizontal or modifier keys
    )
  }, [])

  const handleWheel = useCallback((e: any) => {
    // ✅ CRITICAL: Always prevent page scroll
    e.evt.preventDefault()
    e.evt.stopPropagation()
    
    const stage = stageRef.current
    if (!stage) return
    
    const isTrackpad = detectTrackpad(e.evt)
    const { deltaX, deltaY, ctrlKey, metaKey, shiftKey } = e.evt
    
    // ✅ TRACKPAD: Pinch-to-zoom (Ctrl/Cmd + scroll)
    if ((ctrlKey || metaKey) && isTrackpad) {
      handleZoom(e, stage, deltaY)
      return
    }
    
    // ✅ TRACKPAD: Two-finger pan (default trackpad scroll)
    if (isTrackpad && !shiftKey) {
      handlePan(stage, deltaX, deltaY)
      return
    }
    
    // ✅ MOUSE: Traditional mouse wheel zoom
    if (!isTrackpad) {
      handleZoom(e, stage, deltaY)
      return
    }
    
    // ✅ FALLBACK: Shift+scroll for pan (universal)
    if (shiftKey) {
      handlePan(stage, deltaX || deltaY, 0)
      return
    }
    
    // ✅ DEFAULT: Zoom for everything else
    handleZoom(e, stage, deltaY)
    
  }, [detectTrackpad, stageRef])

  // ✅ BUILT-IN: Zoom with pointer focus (same as current)
  const handleZoom = useCallback((_e: any, stage: any, deltaY: number) => {
    const scaleBy = 1.05
    const oldScale = stage.scaleX()
    const newScale = deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(0.1, Math.min(3, newScale))
    
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    
    stage.scale({ x: clampedScale, y: clampedScale })
    
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }
    
    // Apply boundary constraints
    const constrainedPos = constrainStagePosition(newPos, stage, clampedScale)
    stage.position(constrainedPos)
  }, [])

  // ✅ BUILT-IN: Pan with boundary constraints
  const handlePan = useCallback((stage: any, deltaX: number, deltaY: number) => {
    const currentPos = stage.position()
    const scale = stage.scaleX()
    
    // ✅ TRACKPAD: Invert scroll direction to feel natural
    const newPos = {
      x: currentPos.x - deltaX,
      y: currentPos.y - deltaY
    }
    
    const constrainedPos = constrainStagePosition(newPos, stage, scale)
    stage.position(constrainedPos)
  }, [])

  // ✅ BUILT-IN: Boundary constraint helper
  const constrainStagePosition = useCallback((pos: { x: number; y: number }, stage: any, scale: number) => {
    const stageWidth = stage.width()
    const stageHeight = stage.height()
    const canvasWidth = 5000 * scale
    const canvasHeight = 5000 * scale
    
    return {
      x: Math.max(stageWidth - canvasWidth, Math.min(0, pos.x)),
      y: Math.max(stageHeight - canvasHeight, Math.min(0, pos.y))
    }
  }, [])

  return { handleWheel }
}
