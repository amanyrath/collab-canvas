# Marquee Selection Debug

## How Marquee Selection Works

**Requirements:**
1. Hold **Shift key**
2. Click and drag on empty background (not on a shape)
3. Release mouse to complete selection

## Code Flow

1. `handleLayerMouseDown` (line 682):
   - Checks if Shift is pressed
   - Checks if clicking on background (not shape)
   - Sets `isDrawingSelection.current = true`
   - Sets `isDragSelectingRef.current = true`

2. `handleStageMouseMove` (line 716):
   - Only runs if `isDrawingSelection.current` is true
   - Updates selection rectangle coordinates

3. `handleStageMouseUp` (line 738):
   - Finalizes selection
   - Finds shapes in selection box
   - Locks selected shapes

## Potential Issues from Text Editor Changes

### ❌ No issues found:
- Text editor only renders when `editingShape` exists
- Text editor has its own event handlers (doesn't interfere with Layer)
- `stageRef` prop is only used for positioning text editor

### ✅ Marquee code is intact:
- All event handlers are unchanged
- `isDragSelectingRef` prop is still passed correctly
- Background rect is still listening to events

## Test Steps

1. **Basic test:**
   - Hold Shift
   - Click empty space
   - Drag to create blue rectangle
   - Should see selection box

2. **Shape selection test:**
   - Shift + drag over multiple shapes
   - Shapes should get selected (locked)

3. **Text editor test:**
   - Double-click shape → text editor opens
   - Try marquee while text editor is open → might not work (expected)
   - Close text editor (Esc or click outside)
   - Try marquee again → should work

## Debug Console Logs

Check browser console for:
- "📝 Double-clicked shape for text editing:" - text editor opening
- Selection-related logs from ShapeLayer

## Quick Fix if Broken

If marquee isn't working, check:
1. Are you holding Shift? (Required!)
2. Is text editor open? (Close it with Esc)
3. Are you clicking on empty space? (Not on a shape)

