# 🎬 CollabCanvas - 1-Minute Code Walkthrough Script

> **Goal**: Demonstrate deep understanding of architecture, design patterns, and technical decisions

---

## 🎯 **Script Overview** (60 seconds)

```
[0:00-0:10] Architecture Overview
[0:10-0:25] Core Pattern: Selection = Locking
[0:25-0:40] Multi-Select Challenge & Solution
[0:40-0:55] Real-time Sync Strategy
[0:55-1:00] Wrap Up
```

---

## 📝 **The Script**

### **[0:00-0:10] Opening - Architecture Overview**

**Say:**
> "CollabCanvas uses a lock-based collaboration model. The key insight is that **selection equals locking** - when you select a shape, you acquire a Firestore transaction lock on it. This prevents race conditions without complex CRDTs."

**Show:** Open `ARCHITECTURE.md` (lines 13-17)
```markdown
1. **Optimistic Updates**: UI updates immediately, Firebase syncs in background
2. **Lock-Based Collaboration**: Selection = Locking (prevents race conditions)
3. **Two-Database Strategy**: 
   - Firestore for persistent data (shapes)
   - Realtime Database for transient data (cursors, presence)
```

**Why This Matters:** Shows you understand the fundamental architectural decision and can articulate the trade-offs.

---

### **[0:10-0:25] Core Pattern - Selection = Locking**

**Say:**
> "Here's the lock acquisition logic. Notice we use a Firestore transaction to atomically check if the shape is already locked, then acquire it. This is the foundation for conflict-free collaboration."

**Show:** `src/utils/lockUtils.ts` (lines 26-43)
```typescript
const result = await runTransaction(db, async (transaction) => {
  const shapeDoc = await transaction.get(shapeRef)
  
  if (!shapeDoc.exists()) {
    throw new Error('Shape not found')
  }
  
  const shapeData = shapeDoc.data()
  
  // Check if shape is already locked
  if (shapeData.isLocked && shapeData.lockedBy !== userId) {
    return {
      success: false,
      alreadyLocked: true,
      lockedBy: shapeData.lockedBy
    }
  }
  
  // Acquire lock atomically (this IS selection)
  transaction.update(shapeRef, {
    isLocked: true,
    lockedBy: userId,
    // ...
  })
```

**Point Out:**
- "Atomic check-and-lock prevents two users from grabbing the same shape"
- "This returns immediately if already locked - no retry loops needed"

---

### **[0:25-0:40] The Hard Part - Multi-Select Virtual Groups**

**Say:**
> "The trickiest challenge was multi-select dragging. I can't use Konva Groups because shapes dynamically change between rectangles and circles. So I implemented a 'virtual group' pattern."

**Show:** `src/components/Canvas/ShapeLayer.tsx` (lines 115-125, 161-188)

**First Show - Drag Start:**
```typescript
handleDragStart = (e) => {
  // ✅ ALWAYS GET FRESH NODE POSITIONS: Handles shape type changes
  const layer = e.target.getLayer()
  userLockedShapes.forEach(s => {
    const node = layer?.findOne(`#${s.id}`)  // 🔑 Fresh reference!
    if (node) {
      dragStartPositionsRef.current.set(s.id, {
        startX: node.x(),
        startY: node.y()
      })
    }
  })
}
```

**Then Show - Drag Move:**
```typescript
handleDragMove = (e) => {
  // Calculate delta from primary shape
  const deltaX = e.target.x() - thisShapeStart.startX
  const deltaY = e.target.y() - thisShapeStart.startY
  
  // Apply same delta to ALL selected shapes
  dragStartPositionsRef.current.forEach((data, shapeId) => {
    if (shapeId !== shape.id) {
      const freshNode = layer?.findOne(`#${shapeId}`)  // 🔑 Fresh again!
      if (freshNode) {
        freshNode.x(data.startX + deltaX)  // Move together!
        freshNode.y(data.startY + deltaY)
      }
    }
  })
  
  layer?.batchDraw()  // Single render for all shapes
}
```

**Emphasize:**
- "Fresh node references via `findOne()` - critical for dynamic shape types"
- "All shapes move together by applying the same delta"
- "`batchDraw()` means one render pass for all shapes - performance!"

---

### **[0:40-0:55] Real-time Sync Strategy**

**Say:**
> "For real-time sync, I split the data across two Firebase services. Shapes in Firestore for persistence, cursors in Realtime Database for low-latency updates. The key is optimistic updates - UI changes instantly, Firebase syncs async."

**Show:** `src/store/canvasStore.ts` (lines 50-60)
```typescript
updateShapeOptimistic: (id, updates) => {
  // ⚡ INSTANT: Update UI immediately
  set(state => ({
    shapes: state.shapes.map(s => 
      s.id === id ? { ...s, ...updates } : s
    )
  }))
  // No await! Firebase sync happens in background
}
```

**Then Show:** `src/utils/shapeUtils.ts` (lines 167-177)
```typescript
export const updateShape = async (shapeId, updates, userId) => {
  // This runs AFTER UI already updated
  const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
  
  await updateDoc(shapeRef, {
    ...updates,
    lastModifiedBy: userId,
    lastModifiedAt: serverTimestamp()
  })
  
  // Other users get this via onSnapshot listener
}
```

**Point Out:**
- "Store updates immediately - no lag for the user"
- "Firebase propagates to others within 100ms"
- "If Firebase fails, we can retry without breaking UX"

---

### **[0:55-1:00] Wrap Up - Design Principles**

**Say:**
> "The three key principles that make this work: one, optimistic updates for instant feedback. Two, lock-based transactions for conflict prevention. Three, always fetch fresh references for dynamic canvas operations. These patterns make real-time collaboration both performant and correct."

**Show:** Quickly scroll through `ARCHITECTURE.md` showing the Table of Contents
```markdown
## 🎯 Core Concepts
1. Selection = Locking
2. Optimistic Updates  
3. Two-Database Strategy

## 🐛 Common Issues & Solutions
- Stale Konva Node References → Always fetch fresh
- Coordinate System Mismatch → Convert at boundaries
- Presence Cleanup → Remove BEFORE logout
```

**End with:**
> "Happy to dive deeper into any of these patterns!"

---

## 🎨 **Visual Flow** (What to Show on Screen)

### **Recommended Tab Order:**

1. **Tab 1**: `ARCHITECTURE.md` (overview)
2. **Tab 2**: `src/utils/lockUtils.ts` (lines 20-70)
3. **Tab 3**: `src/components/Canvas/ShapeLayer.tsx` (lines 100-200)
4. **Tab 4**: `src/store/canvasStore.ts` + `src/utils/shapeUtils.ts` (split screen)

### **Screen Sharing Tips:**

- **Zoom to 140%** - Make code readable
- **Use VS Code minimap** - Show file size/complexity
- **Highlight key lines** - Use cursor to underline as you talk
- **Fold irrelevant code** - Use VS Code folding to focus on key sections

---

## 🎯 **Alternative Focus Areas**

If you want to emphasize different aspects, here are alternative 1-minute scripts:

### **Option A: "Performance First"**
- Show throttling in cursor updates (16ms)
- Show `batchDraw()` vs `draw()`
- Show Firebase read/write counting
- Show optimistic updates preventing blocking

### **Option B: "Handling Edge Cases"**
- Show coordinate conversion (Konva center vs store top-left)
- Show boundary enforcement in `dragBoundFunc`
- Show presence cleanup BEFORE logout
- Show lock cleanup on disconnect

### **Option C: "State Management"**
- Show Zustand store structure
- Show optimistic update pattern
- Show how `useShapeSync` keeps store in sync with Firestore
- Show separation of concerns (UI state vs data state)

---

## 💡 **Pro Tips**

### **DO:**
✅ **Use the actual running app side-by-side**
   - Split screen: Code left, running app right
   - Make changes in code, show them live

✅ **Point to specific lines**
   - "Line 27 here is where the magic happens"
   - Use cursor to highlight as you speak

✅ **Mention trade-offs**
   - "I chose Firestore transactions over CRDTs because..."
   - Shows you understand alternatives

✅ **Reference the docs**
   - "I documented this in ARCHITECTURE.md"
   - Shows professionalism

### **DON'T:**
❌ Scroll through files aimlessly
❌ Read code word-for-word (explain the concept)
❌ Get stuck on syntax details
❌ Forget to mention WHY you made decisions

---

## 🎭 **Practice Runs**

### **30-Second Version** (If Time is Tight)
```
[0:00-0:15] "Selection equals locking - here's the Firestore transaction"
            → Show lockUtils.ts lines 26-43

[0:15-0:30] "Multi-select uses virtual groups with fresh references"
            → Show ShapeLayer.tsx handleDragMove
```

### **2-Minute Version** (If You Have More Time)
Add:
- Presence monitoring and disconnect cleanup
- Coordinate system handling (circles vs rectangles)
- Performance monitoring and quota tracking

---

## 📊 **Key Metrics to Mention**

**Technical Achievements:**
- ⚡ **<100ms** sync latency between users
- 🎯 **<16ms** cursor update throttling (60fps)
- 🔒 **Atomic** lock transactions (zero race conditions)
- 📦 **Optimistic** updates (instant UI feedback)
- ♿ **Colorblind-friendly** palette (accessibility)

**Code Quality:**
- 📖 **700+ lines** of architecture documentation
- 🧪 **Multiple edge cases** handled and documented
- 🔧 **Fresh references** pattern throughout
- 🎨 **Clean separation** of concerns (utils/hooks/components)

---

## 🎬 **Opening Lines (Choose One)**

**Option 1 - Technical:**
> "CollabCanvas solves real-time collaboration without CRDTs by using a lock-based model where selection equals a Firestore transaction lock."

**Option 2 - Problem-First:**
> "The hardest problem in real-time collaboration is preventing two users from editing the same object. Here's how I solved it with Firestore transactions."

**Option 3 - Pattern-First:**
> "I want to show you three patterns that make this work: optimistic updates, atomic locking, and virtual groups. Let me walk through the code."

---

## 🎯 **Closing Lines (Choose One)**

**Option 1 - Technical:**
> "These patterns - optimistic updates, transaction-based locking, and fresh references - make the code both performant and correct."

**Option 2 - Learnings:**
> "The biggest learning was that getting Konva references right is critical. Always fetch fresh nodes, especially with dynamic shape types."

**Option 3 - Architecture:**
> "The two-database strategy, splitting persistent from transient data, keeps sync latency under 100ms while maintaining consistency."

---

**Good luck with your walkthrough! 🚀**

