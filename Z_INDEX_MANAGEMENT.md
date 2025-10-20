# Canvas Z-Index Management

## Overview
Complete Z-index management system with keyboard shortcuts, toolbar buttons, and layers panel integration.

## Features Implemented

### 1. **Keyboard Shortcuts** ✅
Added industry-standard keyboard shortcuts for Z-index control:

- **⌘/Ctrl + ]** - Bring selected shape(s) to front
- **⌘/Ctrl + [** - Send selected shape(s) to back

These shortcuts:
- Work with single or multiple selected shapes
- Are disabled when typing in input fields
- Show console feedback for debugging
- Sync changes to Firebase instantly

### 2. **Toolbar Controls** ✅
Added dynamic toolbar in the Navbar that appears when shapes are selected:

```
┌─────────────────────────────────────┐
│ 2 selected  [⬆️ Front]  [⬇️ Back]   │
└─────────────────────────────────────┘
```

Features:
- Only visible when shapes are selected
- Shows count of selected shapes
- Hover tooltips with keyboard shortcuts
- Blue highlight for visibility
- Instant visual feedback

### 3. **Layers Panel Selection Fix** ✅
Fixed the multi-selection issue in the Layers Panel:

#### Before (Buggy):
- Clicking a layer added to selection
- No way to select just one layer
- Previous selections never cleared

#### After (Fixed):
- **Click**: Select only that layer (clears others)
- **Shift+Click**: Toggle layer in multi-select
- Proper visual feedback with batch updates
- Performance optimized with batch Firebase writes

### 4. **Updated Documentation** ✅
Updated the shortcuts panel in the sidebar:
```
⌘/Ctrl+A → Select all
Delete → Delete selected
⌘/Ctrl+] → Bring to front
⌘/Ctrl+[ → Send to back
⌘/Ctrl+Z → Undo
⌘/Ctrl+⇧+Z → Redo
```

## Technical Implementation

### Selection Logic (Layers Panel)
```typescript
// Normal click: Single selection (clear others)
const batchUpdates = [
  ...userLockedShapes.map(s => ({ 
    shapeId: s.id, 
    updates: { isLocked: false, ... } 
  })),
  { 
    shapeId: clickedId, 
    updates: { isLocked: true, ... } 
  }
]
batchUpdateShapesOptimistic(batchUpdates)

// Shift+click: Toggle multi-select
if (shape.isLocked) {
  // Remove from selection
} else {
  // Add to selection
}
```

### Z-Index Management
```typescript
// Bring to front
bringToFront(shapeId)
updateShape(shapeId, { 
  zIndex: Math.max(...shapes.map(s => s.zIndex ?? 0)) + 1 
}, userId)

// Send to back
sendToBack(shapeId)
updateShape(shapeId, { 
  zIndex: Math.min(...shapes.map(s => s.zIndex ?? 0)) - 1 
}, userId)
```

### Performance Optimizations
1. **Batch Updates**: All multi-shape operations use `batchUpdateShapesOptimistic()` for single re-render
2. **Batch Firebase Writes**: Use `updateShapeBatch()` to reduce network requests
3. **Optimistic UI**: Instant feedback before Firebase confirms

## User Experience Flow

### From Layers Panel
1. **Select single layer**: Click layer name
   - ✅ Clears all other selections
   - ✅ Locks and highlights clicked layer
   - ✅ Shows selection in canvas

2. **Multi-select layers**: Shift+Click additional layers
   - ✅ Adds/removes from selection
   - ✅ All selected layers highlighted
   - ✅ Can manipulate as group

3. **Reorder layers**: Drag to new position
   - ✅ Updates z-index automatically
   - ✅ Syncs to all users
   - ✅ Shapes re-render in new order

### From Toolbar
1. User selects shapes (on canvas or layers panel)
2. Toolbar appears with count and buttons
3. Click "⬆️ Front" or "⬇️ Back"
4. Instant visual feedback
5. All users see the change

### From Keyboard
1. Select shapes
2. Press ⌘/Ctrl + ] or [
3. Shapes move to front/back
4. Console logs confirmation
5. Changes sync to Firebase

## Multiplayer Support
- Z-index changes sync to all users in real-time
- Lock indicators show who's manipulating shapes
- Batch updates prevent race conditions
- Optimistic updates ensure responsive UI

## Files Modified
- `src/components/Canvas/Canvas.tsx` - Keyboard shortcuts
- `src/components/Layout/Navbar.tsx` - Toolbar buttons
- `src/components/Canvas/LayersPanel.tsx` - Selection logic fix
- `src/App.tsx` - Shortcuts documentation
- `src/store/canvasStore.ts` - Z-index methods (already existed)
- `src/utils/shapeUtils.ts` - Auto z-index on creation (already existed)

## Future Enhancements
- [ ] "Move forward one" (increase z-index by 1)
- [ ] "Move backward one" (decrease z-index by 1)
- [ ] Layer grouping (parent-child z-index relationships)
- [ ] Snap to adjacent layer z-index
- [ ] Z-index input field for precise control
- [ ] Relative z-index operations (move above/below specific layer)

