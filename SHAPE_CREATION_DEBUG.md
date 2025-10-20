# Shape Creation Debug Guide

## Issue
Shapes not appearing after recent updates.

## Debug Logging Added

I've added comprehensive logging throughout the shape creation pipeline. When you create a shape, you should see console output like:

```
🔍 Creating rectangle shape: { x: 100, y: 200, ... }
🎯 Shape created by UserName: abc123
🔄 setShapes called with 5 shapes from Firebase
   No optimistic updates, using Firebase data directly
🔍 No viewport bounds yet, showing all 5/5 shapes
```

## Debugging Steps

### 1. Open Browser DevTools Console
- Press F12 or Cmd+Option+I
- Go to Console tab
- Clear the console (clear button or Cmd+K)

### 2. Try Creating a Shape
- Click anywhere on the canvas
- Watch the console for output

### 3. Expected Console Output

You should see these logs in order:
1. `🔍 Creating [type] shape` - Shape being created
2. `🎯 Shape created by [user]` - Shape saved to Firebase
3. `🔄 setShapes called with N shapes` - Firebase sync received
4. `🔍 No viewport bounds yet...` OR `⚡ Viewport culling...` - Shapes being filtered for rendering

### 4. Common Issues

#### Issue: No logs appear at all
**Problem**: Shape creation not triggered
**Fix**: Check if canvas click handler is working

#### Issue: Logs 1-2 appear but not 3-4
**Problem**: Firebase sync issue
**Fix**: Check Firebase connection, check browser console for errors

#### Issue: All logs appear but shape not visible
**Problem**: Rendering or viewport issue
**Possible causes**:
- Shape created outside viewport
- Shape hidden property set to true
- Z-index issue
- Viewport culling too aggressive

## Quick Fixes

### If shapes are being created but not visible:

1. **Check the Layers Panel** (left sidebar)
   - Do you see the shape listed?
   - Is it marked as hidden (eye icon)?
   - What's the z-index?

2. **Check Shape Properties in Console**
After seeing the logs, type this in console:
```javascript
window.canvasDebug = () => {
  const store = require('./src/store/canvasStore').useCanvasStore.getState()
  console.log('All shapes:', store.shapes)
  store.shapes.forEach(s => {
    console.log(`  ${s.id}: pos(${s.x},${s.y}) size(${s.width}x${s.height}) zIndex:${s.zIndex} hidden:${s.hidden}`)
  })
}
window.canvasDebug()
```

3. **Pan/Zoom to Find Shape**
   - Maybe shape was created outside current view
   - Try zooming out (scroll)
   - Try panning (space + drag)

## What I Changed

The recent updates that might affect shape visibility:

1. **Added zIndex sorting** - Shapes now render in z-index order
2. **Added hidden filter** - Hidden shapes don't render
3. **Modified viewport culling** - Reorganized filtering logic

## Rollback If Needed

If shapes still don't appear, I can rollback these specific changes:
- zIndex sorting (not likely the issue)
- hidden shape filtering (might be filtering incorrectly)
- viewport culling changes (might be too aggressive)

## Contact Me

Please share:
1. Full console output when creating a shape
2. Screenshot of Layers Panel
3. Any error messages (red text in console)

