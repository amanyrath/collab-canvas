// Figma-inspired navigation UX using built-in browser APIs
import { useCallback, useRef } from 'react'

/**
 * ✅ FIGMA UX: Unified navigation system (prevents conflicts)
 * - Trackpad scroll = Pan (natural two-finger drag)
 * - Pinch = Zoom (Cmd/Ctrl + trackpad scroll)  
 * - Mouse wheel = Zoom (traditional mouse)
 * - Prevents cursor updates during navigation
 */
export const useFigmaNavigation = (
  stageRef: React.RefObject<any>, 
  setIsNavigating?: (nav: boolean) => void
) => {
  const lastPanRef = useRef({ x: 0, y: 0, time: 0 })

  // ✅ BUILT-IN: Use native browser wheel event detection
  const handleWheel = useCallback((e: any) => {
    // ✅ CRITICAL: Prevent page scroll leakage (Figma behavior)
    e.evt.preventDefault()
    e.evt.stopPropagation()
    
    const stage = stageRef.current
    if (!stage) return
    
    // ✅ FIX CONFLICT: Signal that we're navigating (stops cursor updates)
    setIsNavigating?.(true)
    
    const { deltaX, deltaY, ctrlKey, metaKey } = e.evt
    const isTrackpad = Math.abs(deltaY) < 50 // Detect trackpad vs mouse wheel
    
    // ✅ FIGMA UX: Cmd/Ctrl + scroll = Zoom (pinch gesture equivalent)
    if (ctrlKey || metaKey) {
      handleZoom(e, stage, deltaY)
    }
    // ✅ FIGMA UX: Trackpad scroll = Pan (natural)
    else if (isTrackpad && (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0)) {
      handlePan(stage, deltaX, deltaY)
    }
    // ✅ FIGMA UX: Mouse wheel = Zoom (traditional)
    else {
      handleZoom(e, stage, deltaY)
    }
    
    // ✅ FIX CONFLICT: Stop navigation signal after short delay
    setTimeout(() => setIsNavigating?.(false), 50)
    
  }, [stageRef, setIsNavigating])

  // ✅ BUILT-IN: Konva zoom with pointer focus (Figma-style)
  const handleZoom = useCallback((_e: any, stage: any, deltaY: number) => {
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    const oldScale = stage.scaleX()
    
    // ✅ FIGMA UX: Smooth zoom scaling (feels natural)
    const zoomFactor = 1 + Math.abs(deltaY) * 0.02 // More granular than 1.05
    const newScale = deltaY > 0 ? oldScale / zoomFactor : oldScale * zoomFactor
    const clampedScale = Math.max(0.01, Math.min(100, newScale)) // Figma-like zoom range
    
    // ✅ BUILT-IN: Zoom to pointer position
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    
    stage.scale({ x: clampedScale, y: clampedScale })
    
    // ✅ FIGMA UX: Smooth zoom positioning
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }
    
    const constrainedPos = constrainPosition(newPos, stage, clampedScale)
    stage.position(constrainedPos)
  }, [])

  // ✅ FIGMA UX: Natural pan direction (matches trackpad scroll direction)
  const handlePan = useCallback((stage: any, deltaX: number, deltaY: number) => {
    const currentPos = stage.position()
    const now = Date.now()
    
    // ✅ FIGMA UX: Natural scroll direction (don't invert)
    // Trackpad scroll down = canvas moves down (content scrolls up)
    const newPos = {
      x: currentPos.x - deltaX,
      y: currentPos.y - deltaY
    }
    
    const scale = stage.scaleX()
    const constrainedPos = constrainPosition(newPos, stage, scale)
    stage.position(constrainedPos)
    
    // Track for potential momentum (future enhancement)
    lastPanRef.current = { x: deltaX, y: deltaY, time: now }
  }, [])

  // ✅ FIGMA UX: Generous canvas bounds (can pan beyond edges slightly)
  const constrainPosition = useCallback((pos: { x: number; y: number }, stage: any, scale: number) => {
    const stageWidth = stage.width()
    const stageHeight = stage.height()
    const canvasWidth = 5000 * scale
    const canvasHeight = 5000 * scale
    
    // ✅ FIGMA UX: Allow some over-pan for natural feel
    const margin = Math.min(stageWidth, stageHeight) * 0.1
    
    return {
      x: Math.max(stageWidth - canvasWidth - margin, Math.min(margin, pos.x)),
      y: Math.max(stageHeight - canvasHeight - margin, Math.min(margin, pos.y))
    }
  }, [])

  // ✅ BUILT-IN: Touch gesture support for mobile/trackpad
  const handleTouchStart = useCallback((_e: any) => {
    // Future: Could add multi-touch gesture support here
    // For now, let browser handle it naturally
  }, [])

  const handleTouchMove = useCallback((e: any) => {
    // ✅ FIGMA UX: Prevent page scroll on mobile too
    e.evt.preventDefault()
  }, [])

  return { 
    handleWheel, 
    handleTouchStart, 
    handleTouchMove 
  }
}
