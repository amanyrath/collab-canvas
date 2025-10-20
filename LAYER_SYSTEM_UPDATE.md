# Layer System Update - Photoshop-Style Layers

## What Changed

Implemented a true layer system like Photoshop, where shapes don't automatically get new layers.

### Before (Auto-Stacking)
- Every shape got unique zIndex using `Date.now()`
- Each shape was effectively on its own "layer"
- No control over which shapes share layers

### After (True Layers)
- **All shapes start on Layer 1** (zIndex = 0)
- Multiple shapes can share the same layer
- Layers only created when user explicitly moves shapes up/down
- Clear layer numbering: Layer 1, Layer 2, etc.

## Implementation Details

### 1. Default Layer
```typescript
// All new shapes start on base layer
zIndex: 0  // This is "Layer 1" in UI
```

### 2. Layer Movement
```typescript
// Move up one layer
newZIndex = (currentZIndex ?? 0) + 1

// Move down one layer  
newZIndex = (currentZIndex ?? 0) - 1
```

### 3. UI Display
```typescript
// Convert zIndex to user-friendly layer number
"Layer " + (zIndex ?? 0) + 1)
// zIndex 0 → "Layer 1"
// zIndex 1 → "Layer 2"
// zIndex -1 → "Layer 0"
```

## User Experience

### Creating Shapes
- Click canvas → Shape created on **Layer 1**
- Create another → Also on **Layer 1** (same layer)
- Shapes render in creation order within same layer

### Moving Between Layers
- **⌘/Ctrl + ]** → Move up one layer (0 → 1)
- **⌘/Ctrl + [** → Move down one layer (0 → -1)
- **Toolbar buttons**: ⬆️ Up / ⬇️ Down
- **Layer panel buttons**: ⬆️ / ⬇️ icons

### Layer Panel
- Shows "Layer 1", "Layer 2", etc.
- Sorted by layer (top layer first)
- Multiple shapes on same layer grouped visually
- Clear indication of which shapes are on which layer

## Examples

### Example 1: Basic Usage
```
1. Create Circle → Layer 1 (zIndex: 0)
2. Create Square → Layer 1 (zIndex: 0)
3. Select Circle, press ⌘] → Layer 2 (zIndex: 1)

Result: Square below Circle
```

### Example 2: Multi-Layer
```
1. Create 3 shapes → All on Layer 1
2. Select shape 2 → Move up → Layer 2
3. Select shape 3 → Move up twice → Layer 3

Layers:
- Layer 3: Shape 3 (top)
- Layer 2: Shape 2 (middle)
- Layer 1: Shape 1 (bottom)
```

### Example 3: Negative Layers
```
1. Create shape → Layer 1 (zIndex: 0)
2. Move down → Layer 0 (zIndex: -1)
3. Move down → Layer -1 (zIndex: -2)

Yes, negative layers work! They render below Layer 1.
```

## Benefits

1. **Intuitive**: Matches Photoshop/Figma layer model
2. **Controlled**: Layers only created on purpose
3. **Flexible**: Can have many shapes per layer
4. **Simple**: No timestamp collisions or sorting issues
5. **Predictable**: Same layer = predictable render order

## Fixed Issues

This also likely fixes the "shapes not appearing" bug because:
- No more timestamp-based zIndex (was creating huge numbers)
- Simple sorting by small integers
- No viewport filtering issues with weird zIndex values

## Files Modified

- `src/utils/shapeUtils.ts` - Default zIndex = 0
- `src/store/canvasStore.ts` - Layer movement logic
- `src/components/Canvas/Canvas.tsx` - Keyboard shortcuts
- `src/components/Layout/Navbar.tsx` - Toolbar buttons
- `src/components/Canvas/LayersPanel.tsx` - UI display
- `src/App.tsx` - Shortcuts documentation

## Migration Note

Existing shapes with timestamp-based zIndex will still work, but:
- They'll have very high layer numbers initially
- Use "Move down" repeatedly to bring them to normal layers
- Or just delete and recreate them

## Future Enhancements

- [ ] Group layers (folders)
- [ ] Layer naming
- [ ] Layer colors
- [ ] Copy layer
- [ ] Merge layers
- [ ] Jump to specific layer number
- [ ] Show shapes per layer count

