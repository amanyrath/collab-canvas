# Layers Panel Redesign - Photoshop/Procreate Style

## Overview

Complete redesign of the layers panel to match professional design tools like Photoshop and Procreate.

### Before
```
├─ Rectangle 1 (z-index: 0)
├─ Circle 1 (z-index: 0)
├─ Triangle 1 (z-index: 0)
├─ Rectangle 2 (z-index: 1)
└─ Circle 2 (z-index: 1)
```
*Every shape was a separate entry* ❌

### After
```
├─ Layer 2 ▶
│  ├─ Rectangle 2
│  └─ Circle 2
└─ Layer 1 ▼
   ├─ Rectangle 1
   ├─ Circle 1
   └─ Triangle 1
```
*Grouped by layer with expand/collapse* ✅

## New Features

### 1. **Layer-Based Organization**
- Shapes grouped by zIndex (layer number)
- Each layer shows as one entry
- Expandable to see shapes within

### 2. **Layer Header**
```
┌────────────────────────────────────┐
│ ▶ [1] Layer 1                      │
│     3 shapes              ⬆️ ⬇️ 🗑  │
└────────────────────────────────────┘
```

Components:
- **▶/▼** Expand/collapse toggle
- **[1]** Layer number badge
- **Layer 1** Layer name
- **3 shapes** Shape count
- **⬆️ ⬇️ 🗑** Layer actions

### 3. **Expanded View**
When expanded, shows all shapes in layer:
```
┌────────────────────────────────────┐
│ ▼ [1] Layer 1                      │
│     3 shapes              ⬆️ ⬇️ 🗑  │
├────────────────────────────────────┤
│   ▢ Rectangle - "Title"      👁 ×  │
│   ○ Circle                   👁 ×  │
│   △ Triangle                 👁 ×  │
└────────────────────────────────────┘
```

### 4. **Layer Actions**
- **⬆️** Move entire layer up one level
- **⬇️** Move entire layer down one level
- **🗑** Delete entire layer (with confirmation)

### 5. **Shape Actions** (when expanded)
- **👁/👁‍🗨** Toggle visibility
- **×** Delete individual shape

### 6. **Selection Behavior**

**Click Layer Header:**
- Selects ALL shapes in that layer
- Deselects shapes in other layers
- Entire layer becomes selected

**Click Individual Shape:**
- Normal click: Select only that shape
- Shift+Click: Toggle shape in multi-select

### 7. **Visual Indicators**

**Layer Selection States:**
- **Blue background** - All shapes selected
- **Light blue** - Some shapes selected
- **White** - No shapes selected

**Shape Indicators:**
- **Color dot** - Locked by another user
- **Blue background** - Selected by you
- **Colored icon** - Shape fill color

## User Workflows

### Workflow 1: Working with Layers
```
1. Create 3 shapes → All on Layer 1
2. Click "Layer 1" header → All 3 selected
3. Press ⌘] → All move to Layer 2
4. Create 2 more shapes → On Layer 1
Result: Layer 2 has 3 shapes, Layer 1 has 2 shapes
```

### Workflow 2: Managing Individual Shapes
```
1. Click ▶ to expand Layer 1
2. See all shapes in layer
3. Click shape name to select it
4. Shift+Click others to multi-select
5. Use toolbar buttons or keyboard shortcuts
```

### Workflow 3: Layer Organization
```
1. Layer 3 has too many shapes
2. Expand layer to see all shapes
3. Select some shapes (Shift+Click)
4. Press ⌘[ to move them down
5. They now form Layer 2
```

## Technical Implementation

### Data Structure
```typescript
interface LayerGroup {
  zIndex: number        // Layer number (0 = Layer 1)
  shapes: Shape[]       // All shapes in this layer
  isExpanded: boolean   // UI state
}
```

### Grouping Logic
```typescript
const layerGroups = useMemo(() => {
  const groups = new Map<number, Shape[]>()
  
  shapes.forEach(shape => {
    const zIndex = shape.zIndex ?? 0
    if (!groups.has(zIndex)) {
      groups.set(zIndex, [])
    }
    groups.get(zIndex)!.push(shape)
  })
  
  return Array.from(groups.entries())
    .sort((a, b) => b.zIndex - a.zIndex) // Highest first
}, [shapes])
```

### Selection
```typescript
// Select entire layer
const handleSelectLayer = (zIndex) => {
  const layerShapes = shapes.filter(s => s.zIndex === zIndex)
  // Lock all shapes in this layer
  // Unlock all other shapes
}

// Select individual shape
const handleSelectShape = (shapeId, event) => {
  if (event.shiftKey) {
    // Toggle in multi-select
  } else {
    // Select only this shape
  }
}
```

### Layer Operations
```typescript
// Move entire layer
const handleMoveLayerUp = (zIndex) => {
  const layerShapes = shapes.filter(s => s.zIndex === zIndex)
  layerShapes.forEach(shape => {
    updateShape(shape.id, { zIndex: zIndex + 1 })
  })
}
```

## Benefits

### 1. **Cleaner UI**
- 100 shapes on 5 layers = 5 entries (not 100!)
- Much easier to navigate
- Less scrolling

### 2. **Better Organization**
- Clear layer structure
- Easy to see what's on each layer
- Group related shapes visually

### 3. **Professional Workflow**
- Matches Photoshop/Procreate/Figma
- Familiar to designers
- Industry-standard patterns

### 4. **Efficient Management**
- Operate on entire layers
- Move groups of shapes together
- Bulk operations made easy

### 5. **Scalability**
- Works well with 10 or 1000 shapes
- Collapsible layers keep UI clean
- Performance optimized

## Keyboard Shortcuts

All existing shortcuts still work:
- **⌘/Ctrl+]** Move selection up one layer
- **⌘/Ctrl+[** Move selection down one layer
- **⌘/Ctrl+A** Select all
- **Delete** Delete selected

## Future Enhancements

- [ ] Rename layers ("Background", "Foreground", etc.)
- [ ] Layer thumbnails (preview of shapes)
- [ ] Drag-to-reorder layers
- [ ] Layer folders (nested layers)
- [ ] Layer opacity
- [ ] Layer blend modes
- [ ] Duplicate layer
- [ ] Merge layers
- [ ] Layer search/filter

## Comparison to Other Tools

### Photoshop ✅
- Layer-based organization ✅
- Expand/collapse ✅
- Layer actions ✅
- Visual hierarchy ✅

### Procreate ✅
- Simple layer list ✅
- Numbered layers ✅
- Swipe actions → (Buttons instead)
- Clean UI ✅

### Figma ⚠️
- Shows all objects → (We show layers)
- Tree hierarchy → (Could add as folders)
- Auto-naming → (Could add)

## Migration Guide

### For Existing Users
1. Old shapes still work (same zIndex)
2. Will be grouped by layer automatically
3. UI just shows them differently
4. No data loss or changes needed

### For Developers
```typescript
// Old way
shapes.map(shape => <ShapeItem shape={shape} />)

// New way
layerGroups.map(layer => 
  <LayerItem layer={layer}>
    {layer.shapes.map(shape => <ShapeItem shape={shape} />)}
  </LayerItem>
)
```

## Performance

- **Before**: N shape entries (one per shape)
- **After**: M layer entries (one per layer)
- **Improvement**: If 100 shapes on 5 layers → 95% fewer entries!

Optimizations:
- Memoized layer grouping
- Conditional shape rendering (only if expanded)
- Batch operations for layer actions
- Efficient state management

## Files Changed

- `src/components/Canvas/LayersPanel.tsx` - Complete rewrite

## Summary

The layers panel now works like a professional design tool. Instead of showing every shape individually, it groups them by layer with expand/collapse functionality. This makes the UI much cleaner and more scalable while maintaining all existing functionality.

