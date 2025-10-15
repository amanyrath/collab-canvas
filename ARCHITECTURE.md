# CollabCanvas Architecture Guide

> A comprehensive guide to understanding the CollabCanvas codebase

---

## 🏗️ **High-Level Architecture**

CollabCanvas is a real-time collaborative canvas application built with:
- **Frontend**: React + TypeScript + Vite
- **Canvas Rendering**: Konva.js (React-Konva)
- **Backend**: Firebase (Auth, Firestore, Realtime Database)
- **State Management**: Zustand
- **Styling**: Tailwind CSS

### **Key Design Principles**

1. **Optimistic Updates**: UI updates immediately, Firebase syncs in background
2. **Lock-Based Collaboration**: Selection = Locking (prevents race conditions)
3. **Presence Awareness**: Real-time cursors and user status via RTDB
4. **Performance First**: Throttling, batching, and efficient rendering
5. **Accessibility**: Colorblind-friendly palettes, keyboard shortcuts

---

## 📁 **Codebase Structure**

```
src/
├── App.tsx                    # Main app component, routing
├── main.tsx                   # Entry point, React mounting
│
├── components/                # React components
│   ├── Auth/                  # Authentication UI
│   ├── Canvas/                # Canvas-related components
│   ├── Layout/                # App layout (Navbar)
│   └── Debug/                 # Development tools
│
├── hooks/                     # Custom React hooks
├── store/                     # Zustand state management
├── utils/                     # Utility functions & Firebase
└── index.css                  # Global styles
```

---

## 🎯 **Core Concepts**

### **1. Selection = Locking**

In CollabCanvas, there is no separate "selection" state. When you select a shape, you acquire a lock on it.

```typescript
// Lock acquired → Shape is selected
isLocked: true
lockedBy: "user-id"
lockedByName: "Alice"
lockedByColor: "#4477AA"
```

**Why?**
- Prevents race conditions (two users editing same shape)
- Simplifies state management (one source of truth)
- Atomic operations via Firestore transactions

### **2. Optimistic Updates**

UI updates happen immediately, Firebase syncs asynchronously.

```typescript
// 1. Update Zustand store (instant UI update)
updateShapeOptimistic(shapeId, { x: 100, y: 200 })

// 2. Update Firebase (background sync)
updateShape(shapeId, { x: 100, y: 200 }, userId)
```

**Benefits:**
- No lag/latency in UI
- Smooth user experience
- Firebase sync happens in background

### **3. Two-Database Strategy**

**Firestore (Persistent Data)**
- Canvas shapes (position, size, color, etc.)
- User-created content
- Query: `canvas/global-canvas-v1/shapes`

**Realtime Database (Transient Data)**
- User presence (online/offline)
- Cursor positions
- Currently editing status
- Query: `/sessions/global-canvas-v1/{userId}`

**Why both?**
- Firestore: Better for structured data, complex queries
- RTDB: Better for high-frequency updates (cursors)

---

## 🗂️ **File-by-File Breakdown**

### **📦 Entry Points**

#### `main.tsx`
- React app mounting
- Wraps app with `ErrorBoundary`
- Only runs in browser (no SSR)

#### `App.tsx`
- Main app component
- Routing (`/` → Canvas, `/auth` → Login)
- Initializes hooks:
  - `useAuth()` - Auth state
  - `useShapeSync()` - Firestore shape sync
  - `useConnectionStatus()` - Network status
  - `usePresenceMonitor()` - Lock cleanup on disconnect

---

### **🎨 Components**

#### **`components/Canvas/Canvas.tsx`** (Core Canvas)
The main canvas component handling:
- Konva Stage setup (zoom, pan, scroll)
- Tool selection (rectangle, circle, select)
- Color picker
- Keyboard shortcuts
- Event listeners (click, drag, wheel)

**Key State:**
```typescript
tool: 'select' | 'rectangle' | 'circle'
selectedColor: string
zoom: number (0.1 to 3)
position: { x, y } // Pan position
```

**Layers Rendered:**
1. `GridLayer` - Background grid
2. `ShapeLayer` - All shapes
3. `SelectionLayer` - Drag-select box
4. `SimpleCursorLayer` - Other users' cursors

---

#### **`components/Canvas/ShapeLayer.tsx`** (Most Complex!)
Renders all shapes and handles interactions:
- Individual shape rendering (Rect, Circle)
- Selection (click, shift-click for multi-select)
- Dragging (single and multi-select)
- Resizing (Konva Transformer)
- Boundary constraints (shapes stay within canvas)
- Lock visualization

**Key Patterns:**

**Virtual Group Multi-Select**
```typescript
// Track starting positions for all selected shapes
dragStartPositionsRef.current.set(shapeId, { startX, startY })

// On drag, move all shapes by same delta
handleDragMove: (e) => {
  const delta = { x: e.target.x() - startX, y: e.target.y() - startY }
  // Apply delta to all selected shapes
}
```

**Coordinate Systems**
- Konva: Circles use center point (x, y = center)
- Store: ALL shapes use top-left (x, y = top-left)
- Conversion happens in `handleDragEnd`

**Boundary Enforcement**
```typescript
dragBoundFunc: (pos) => {
  // Constrain to 0 ≤ x ≤ 5000, 0 ≤ y ≤ 5000
  return { x: clamp(pos.x), y: clamp(pos.y) }
}
```

---

#### **`components/Canvas/SimpleCursorLayer.tsx`**
Renders other users' cursors:
- Subscribes to RTDB presence data
- Shows cursor position + username
- Uses colorblind-friendly colors
- Throttled updates (60fps max)

---

#### **`components/Canvas/FastPresenceSidebar.tsx`**
Shows online users:
- Real-time user list
- Status indicators (editing, online)
- User colors

---

#### **`components/Layout/Navbar.tsx`**
Top navigation bar:
- User info + color indicator
- Admin panel (create shapes, clear locks)
- Logout button (with presence cleanup)

**Critical Logout Flow:**
```typescript
1. cleanupPresence(userId)  // BEFORE signOut!
2. signOut(auth)            // Then logout
```

---

### **🪝 Hooks**

#### **`hooks/useAuth.ts`**
Manages authentication state:
- Listens to Firebase `onAuthStateChanged`
- Initializes presence on login
- Updates Zustand store

#### **`hooks/useShapeSync.ts`**
Syncs shapes from Firestore:
- Subscribes to `canvas/global-canvas-v1/shapes` collection
- Updates Zustand store on changes
- Real-time updates (<100ms)

#### **`hooks/usePresenceMonitor.ts`** (Lock Cleanup)
Monitors user disconnections:
- Watches RTDB presence data
- Detects when users disappear
- Calls `releaseAllUserLocks(userId)` to cleanup

**How it works:**
```typescript
previousUserIds = [user1, user2, user3]
currentUserIds = [user1, user3]

// user2 disappeared → cleanup their locks
```

#### **`hooks/useFigmaNavigation.ts`**
Trackpad gestures:
- Two-finger pan
- Pinch to zoom
- Smooth animations

---

### **🏪 State Management (Zustand)**

#### **`store/canvasStore.ts`** (Canvas State)
```typescript
{
  shapes: Shape[]           // All shapes on canvas
  selectedShapeIds: string[] // Currently selected
  
  // Actions (optimistic)
  updateShapeOptimistic(id, updates)
  addShapeOptimistic(shape)
  removeShapeOptimistic(id)
}
```

**Key Method:**
```typescript
updateShapeOptimistic: (id, updates) => {
  // Instant UI update (no Firebase call)
  set(state => ({
    shapes: state.shapes.map(s => 
      s.id === id ? { ...s, ...updates } : s
    )
  }))
}
```

#### **`store/userStore.ts`** (User State)
```typescript
{
  user: User | null        // Current user
  isAuthenticated: boolean
  cursorColor: string      // Generated from userId
}
```

**Color Generation:**
```typescript
// Deterministic: same userId → same color
generateCursorColor(userId) → '#4477AA'
```

---

### **🛠️ Utils**

#### **`utils/firebase.ts`**
Firebase initialization:
- Auth, Firestore, RTDB setup
- Emulator connection (development)
- Environment variable configuration

#### **`utils/shapeUtils.ts`**
Shape CRUD operations:
```typescript
createShape(x, y, type, color, userId, displayName)
updateShape(shapeId, updates, userId)
deleteShape(shapeId)
subscribeToShapes(callback) // Real-time listener
```

**Performance Monitoring:**
```typescript
logFirestoreRead(operation, count)  // Track read quota
logFirestoreWrite(operation)        // Track write quota
```

#### **`utils/lockUtils.ts`**
Lock management (Firestore transactions):
```typescript
acquireLock(shapeId, userId, displayName, color)
releaseLock(shapeId, userId, displayName)
releaseAllUserLocks(userId) // Cleanup on disconnect
```

**Transaction Example:**
```typescript
await runTransaction(db, async (transaction) => {
  const shape = await transaction.get(shapeRef)
  
  if (shape.data().isLocked) {
    return { success: false, alreadyLocked: true }
  }
  
  transaction.update(shapeRef, {
    isLocked: true,
    lockedBy: userId,
    lockedByName: displayName
  })
  
  return { success: true }
})
```

#### **`utils/presenceUtils.ts`**
Real-time presence management:
```typescript
initializePresence(user)              // Set user online
updateCursorPosition(userId, x, y)    // Update cursor
updateCurrentlyEditing(userId, shapeId) // Show editing
cleanupPresence(userId)               // Remove presence data
```

**Disconnect Cleanup:**
```typescript
const disconnectRef = onDisconnect(presenceRef)
await disconnectRef.remove()  // Auto-remove on disconnect
```

#### **`utils/devUtils.ts`**
Development utilities:
```typescript
clearAllLocks()      // Clear stuck locks
clearAllShapes()     // Delete all shapes
getPerformanceStats() // FPS, memory usage
```

#### **`utils/types.ts`**
TypeScript type definitions:
```typescript
interface Shape {
  id: string
  type: 'rectangle' | 'circle'
  x: number          // Top-left (store coordinates)
  y: number
  width: number
  height: number
  fill: string       // Color
  
  // Lock state
  isLocked: boolean
  lockedBy: string | null
  lockedByName: string | null
  lockedByColor: string | null
  
  // Metadata
  createdBy: string
  createdAt: any     // Firebase serverTimestamp
  lastModifiedBy: string
  lastModifiedAt: any
}
```

---

## 🔄 **Data Flow Examples**

### **Creating a Shape**

```
User clicks canvas
    ↓
Canvas.tsx handleStageClick()
    ↓
1. Generate temp ID
2. Create shape data
    ↓
canvasStore.addShapeOptimistic(shape)
    ↓
ShapeLayer renders new shape (instant!)
    ↓
createShape() → Firebase
    ↓
Firestore saves shape
    ↓
useShapeSync() receives update
    ↓
canvasStore updates with real ID
    ↓
UI updates with final shape
```

### **Selecting a Shape**

```
User clicks shape
    ↓
ShapeLayer SimpleShape handleClick()
    ↓
1. Check if locked by others
2. If not, acquire lock
    ↓
acquireLock() → Firestore transaction
    ↓
If successful:
  - canvasStore.updateShapeOptimistic({ isLocked: true })
  - UI shows selection border (instant!)
    ↓
useShapeSync() receives lock update
    ↓
Other users see shape is locked
```

### **User Disconnects**

```
User closes browser
    ↓
onDisconnect() trigger in RTDB
    ↓
Presence data removed: /sessions/{userId}
    ↓
usePresenceMonitor detects removal
    ↓
releaseAllUserLocks(userId)
    ↓
Firestore transaction: unlock all shapes
    ↓
useShapeSync() broadcasts updates
    ↓
All users see shapes unlocked
```

---

## 🎯 **Performance Optimizations**

### **1. Throttling**
```typescript
// Cursor updates: max 60fps
const throttledUpdate = throttle(updateCursor, 16)

// Presence updates: max 10fps
const throttledPresence = throttle(updatePresence, 100)
```

### **2. Batching**
```typescript
// Batch multiple shape updates into single Firebase call
firebaseBatcher.addOperation({ type: 'update', docId, data })
firebaseBatcher.flush() // Execute batch
```

### **3. React Optimization**
```typescript
// Memoize expensive components
const SimpleShape = React.memo(({ shape, ... }) => { ... })

// useMemo for computed values
const selectedShapeIds = useMemo(() => 
  shapes.filter(s => s.isLocked).map(s => s.id),
  [shapes]
)
```

### **4. Konva Optimization**
```typescript
// Batch canvas redraws
layer.batchDraw()  // Instead of layer.draw() for each shape

// Disable unnecessary features
strokeScaleEnabled: false  // Constant stroke width
```

---

## 🐛 **Common Issues & Solutions**

### **Issue: Stale Konva Node References**
**Problem:** Multi-select drag breaks after shape type changes
**Solution:** Always get fresh node references:
```typescript
const freshNode = layer?.findOne(`#${shapeId}`)
```

### **Issue: Coordinate System Mismatch**
**Problem:** Circles jump when dragged
**Solution:** Convert between Konva (center) and store (top-left):
```typescript
if (shape.type === 'circle') {
  finalX = konvaX - shape.width / 2
  finalY = konvaY - shape.height / 2
}
```

### **Issue: Orphaned Locks**
**Problem:** Locks remain after user disconnects
**Solution:** `usePresenceMonitor` + `onDisconnect().remove()`

### **Issue: Presence Not Cleaning Up**
**Problem:** Users don't disappear from sidebar on logout
**Solution:** Call `cleanupPresence(userId)` BEFORE `signOut()`

---

## 🔐 **Security Rules**

### **Firestore Rules**
```javascript
match /canvas/{canvasId}/shapes/{shapeId} {
  // Anyone can read
  allow read: if true;
  
  // Only authenticated users can write
  allow create: if request.auth != null;
  allow update: if request.auth != null;
  allow delete: if request.auth != null;
}
```

### **Realtime Database Rules**
```json
{
  "sessions": {
    "$canvasId": {
      "$userId": {
        ".write": "$userId === auth.uid",
        ".read": true
      }
    }
  }
}
```

---

## 📊 **Firebase Data Models**

### **Firestore: Shapes**
```
canvas/
  global-canvas-v1/
    shapes/
      {shapeId}/
        - id: string
        - type: 'rectangle' | 'circle'
        - x: number
        - y: number
        - width: number
        - height: number
        - fill: string
        - isLocked: boolean
        - lockedBy: string | null
        - createdBy: string
        - createdAt: timestamp
```

### **Realtime Database: Presence**
```
sessions/
  global-canvas-v1/
    {userId}/
      - displayName: string
      - cursorColor: string
      - cursorX: number
      - cursorY: number
      - lastSeen: timestamp
      - isOnline: boolean
      - currentlyEditing: string | null
```

---

## 🚀 **Development Workflow**

### **Local Development**
```bash
# Terminal 1: Firebase Emulators
firebase emulators:start

# Terminal 2: Dev Server
npm run dev
```

### **Testing Multi-User**
1. Open Chrome → Sign in as User A
2. Open Firefox → Sign in as User B
3. Open Chrome Incognito → Sign in as User C

### **Debugging**
```javascript
// In browser console:
window.clearAllLocks()
window.clearAllShapes()
window.getPerformanceStats()
```

---

## 🎓 **Key Learnings & Best Practices**

### **1. Always Use Fresh References**
```typescript
// ❌ BAD: Stale reference
const shape = shapes.find(s => s.id === shapeId)

// ✅ GOOD: Get fresh data
const { shapes: freshShapes } = useCanvasStore.getState()
const shape = freshShapes.find(s => s.id === shapeId)
```

### **2. Cleanup BEFORE Logout**
```typescript
// ❌ BAD: Cleanup after (no permissions!)
signOut(auth)
cleanupPresence(userId)

// ✅ GOOD: Cleanup before
cleanupPresence(userId)
signOut(auth)
```

### **3. Optimistic Updates Pattern**
```typescript
// 1. Update UI immediately
updateShapeOptimistic(id, updates)

// 2. Sync to Firebase (async)
updateShape(id, updates, userId)
```

### **4. Use Firestore Transactions for Race Conditions**
```typescript
// Prevents two users from locking same shape
await runTransaction(db, async (transaction) => {
  const doc = await transaction.get(shapeRef)
  if (doc.data().isLocked) {
    throw new Error('Already locked')
  }
  transaction.update(shapeRef, { isLocked: true })
})
```

---

## 📚 **Further Reading**

- **Konva.js Docs**: https://konvajs.org/docs/
- **React-Konva**: https://github.com/konvajs/react-konva
- **Firebase Firestore**: https://firebase.google.com/docs/firestore
- **Firebase RTDB**: https://firebase.google.com/docs/database
- **Zustand**: https://github.com/pmndrs/zustand

---

## 🎯 **Next Steps for Maintenance**

### **Short Term**
- [ ] Add unit tests for critical utils
- [ ] Add E2E tests for multi-user scenarios
- [ ] Document keyboard shortcuts in UI
- [ ] Add error boundaries for Firebase failures

### **Medium Term**
- [ ] Implement shape history (undo/redo)
- [ ] Add text annotations
- [ ] Implement canvas export (PNG/SVG)
- [ ] Add canvas templates

### **Long Term**
- [ ] Multi-canvas support (rooms)
- [ ] Shape libraries
- [ ] Comments & threads
- [ ] Version history

---

**Questions?** Check the inline comments in the code or reach out to the team!

