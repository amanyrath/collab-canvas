# 🧩 CollabCanvas MVP – Implementation Checklist

**Optimized for speed, Firebase quota efficiency, and subcollection architecture**

Each section represents a vertical slice of functionality that should be completed and tested before moving to the next.

---

## 📋 Pre-Development Setup

- [ ] Review all PRD requirements thoroughly
- [ ] Set up Firebase project in console
- [ ] Enable Authentication (Email/Password + Google)
- [ ] Create Firestore database
- [ ] Create Realtime Database
- [ ] Install Firebase Emulator Suite locally
- [ ] Configure emulator settings for Auth, Firestore, Realtime DB

---

## 🚀 Phase 1: Project Setup & Firebase Integration

### Project Initialization
- [ ] Initialize Vite React + TypeScript project
- [ ] Install core dependencies:
  - `firebase` (SDK)
  - `react-konva` and `konva` (canvas rendering)
  - `zustand` (state management)
  - `tailwindcss`, `postcss`, `autoprefixer` (styling)
  - `uuid` (ID generation)
- [ ] Configure Tailwind CSS in project
- [ ] Set up `.env` and `.env.example` files
- [ ] Add Firebase config to environment variables

### Firebase Configuration
- [ ] Create `src/utils/firebase.ts` initialization file
- [ ] Set up Firebase Auth instance
- [ ] Set up Firestore instance (with Emulator support)
- [ ] Set up Realtime Database instance (with Emulator support)
- [ ] Configure Firebase Emulator Suite connection
- [ ] Add npm scripts for emulator development (`dev:emulator`)

### Firebase Emulator Setup
- [ ] Create `firebase.json` configuration
- [ ] Configure Auth emulator (port 9099)
- [ ] Configure Firestore emulator (port 8080)
- [ ] Configure Realtime DB emulator (port 9000)
- [ ] Test emulator connection locally
- [ ] Verify emulators start without errors
- [ ] Test that app connects to emulators in dev mode

### Initial Deployment
- [ ] Create basic "CollabCanvas MVP" landing page
- [ ] Connect GitHub repository
- [ ] Deploy to Vercel
- [ ] Verify public URL is accessible
- [ ] Set up environment variables in Vercel dashboard
- [ ] Test production build deploys successfully

**Deliverable:** Live URL + Local dev environment with Firebase Emulators running

---

## 🔐 Phase 2: Authentication Flow

### Zustand Store Setup
- [ ] Create `src/store/userStore.ts` for auth state
- [ ] Define user state interface (userId, displayName, email, cursorColor)
- [ ] Add auth actions (setUser, clearUser)
- [ ] Generate deterministic cursor color from userId hash

### Authentication Components
- [ ] Create `src/components/Auth/Login.tsx` component
- [ ] Create `src/components/Auth/Register.tsx` component
- [ ] Add email/password registration form
- [ ] Add email/password login form
- [ ] Add Google OAuth button
- [ ] Add loading states for auth operations
- [ ] Add error message display

### Authentication Logic
- [ ] Implement email/password registration
- [ ] Implement email/password login
- [ ] Implement Google OAuth login
- [ ] Implement logout functionality
- [ ] Add session persistence (onAuthStateChanged listener)
- [ ] Extract display name from Google or email
- [ ] Truncate long display names (max 20 chars)

### UI Integration
- [ ] Create `src/components/Layout/Navbar.tsx`
- [ ] Display user's display name in navbar
- [ ] Add logout button
- [ ] Create protected route wrapper for `/canvas`
- [ ] Redirect unauthenticated users to login
- [ ] Add loading spinner during auth check

**Test Checklist:**
- [ ] Register with email/password works
- [ ] Login with email/password works
- [ ] Login with Google works
- [ ] Display name shows correctly (Google name or email prefix)
- [ ] Logout clears session
- [ ] Session persists across refresh
- [ ] Protected route redirects when not logged in
- [ ] Works with Firebase Emulator (no quota usage)

**Deliverable:** Working authentication with persistent sessions

---

## 🎨 Phase 3: Canvas Foundation

### Canvas Component Structure
- [ ] Create `src/components/Canvas/Canvas.tsx`
- [ ] Set up Konva Stage (5000x5000px virtual space)
- [ ] Configure viewport dimensions
- [ ] Add pan functionality (drag empty space to move)
- [ ] Add zoom functionality (mousewheel)
- [ ] Implement boundary constraints (0-5000px)

### Multi-Layer Architecture
- [ ] Create Grid Layer (listening: false)
- [ ] Create Shapes Layer (listening: true)
- [ ] Create Cursors Layer (listening: false)
- [ ] Create Selection Layer (listening: false)
- [ ] Verify layers render in correct order
- [ ] Test that non-listening layers don't consume events

### Zustand Canvas Store
- [ ] Create `src/store/canvasStore.ts`
- [ ] Add shapes array state
- [ ] Add viewport state (scale, position)
- [ ] Add actions: addShape, updateShape, deleteShape
- [ ] Add selection state (selectedShapeId)

### Performance Optimization
- [ ] Monitor FPS during pan/zoom operations
- [ ] Ensure smooth 60 FPS performance
- [ ] Test boundary enforcement (objects can't leave canvas)
- [ ] Verify canvas feels responsive

**Test Checklist:**
- [ ] Canvas loads with 5000x5000px workspace
- [ ] Pan by dragging empty space works smoothly
- [ ] Zoom with mousewheel works smoothly
- [ ] Canvas maintains 60 FPS during pan/zoom
- [ ] Objects cannot be created outside boundaries
- [ ] Layers are organized correctly

**Deliverable:** Smooth, multi-layered canvas workspace at 60 FPS

---

## 📦 Phase 4: Shape Creation & Firestore Persistence

### Firestore Setup (Subcollections)
- [ ] Define shape interface in `src/utils/types.ts`
- [ ] Create Firestore reference: `canvas/global-canvas-v1/shapes`
- [ ] Set up Firestore listener for shape subcollection
- [ ] Configure emulator to use subcollection structure

### Shape Creation Logic
- [ ] Handle click event on empty canvas
- [ ] Generate UUID for new shape
- [ ] Create shape object (100x100px, gray fill, position at click)
- [ ] Save shape to Firestore subcollection immediately
- [ ] Add createdBy and createdAt fields
- [ ] Update Zustand store optimistically

### Real-Time Sync
- [ ] Subscribe to Firestore subcollection snapshots
- [ ] Handle added shapes (render new shapes)
- [ ] Handle modified shapes (update existing shapes)
- [ ] Handle deleted shapes (remove from canvas)
- [ ] Sync Firestore data to Zustand store

### Shape Rendering
- [ ] Create `src/components/Canvas/ShapeLayer.tsx`
- [ ] Render rectangles from Zustand store
- [ ] Apply React.memo to shape components
- [ ] Render shapes on Shapes Layer
- [ ] Verify shapes persist across page refresh

**Test Checklist:**
- [ ] Click canvas creates rectangle at position
- [ ] Rectangle appears for all users within 100ms
- [ ] Rectangle saves to Firestore subcollection
- [ ] Refresh page restores all shapes
- [ ] Multiple users can create shapes simultaneously
- [ ] No duplicate shapes created
- [ ] Works with Firebase Emulator
- [ ] Shapes persist when all users leave and return

**Deliverable:** Rectangle creation syncing across users via Firestore subcollections

---

## 🖱️ Phase 5: Selection & Movement with Transaction Locking

### Selection Logic
- [ ] Handle click event on rectangle
- [ ] Update selectedShapeId in Zustand store
- [ ] Show visual selection indicator (border highlight)
- [ ] Clicking empty space deselects
- [ ] Selection is user-specific (not synced)

### Drag-to-Move Implementation
- [ ] Add Konva drag events to rectangles
- [ ] Implement onDragStart handler
- [ ] Implement onDragMove handler (optimistic update)
- [ ] Implement onDragEnd handler
- [ ] Constrain drag within canvas boundaries

### Transaction-Based Locking
- [ ] Create lock utility functions in `src/utils/lockUtils.ts`
- [ ] Implement acquireLock with Firestore transaction
- [ ] Check if shape is locked before acquisition
- [ ] Set isLocked: true, lockedBy: userId atomically
- [ ] Implement releaseLock with transaction
- [ ] Handle transaction failures gracefully

### Lock Integration
- [ ] Acquire lock on drag start
- [ ] Write final position to Firestore on drag end
- [ ] Release lock automatically after drag
- [ ] Prevent dragging locked shapes
- [ ] Show "Editing: [Username]" indicator on locked shapes
- [ ] Add cursor style change on hover over locked shape

### Firebase onDisconnect Cleanup
- [ ] Set up onDisconnect handler for locks
- [ ] Clear all locks held by user on disconnect
- [ ] Test lock cleanup when browser closes
- [ ] Verify no permanent locks remain

**Test Checklist:**
- [ ] Click rectangle selects it (shows border)
- [ ] Drag selected rectangle moves smoothly
- [ ] Position updates on drag end
- [ ] Lock acquired atomically (no race conditions)
- [ ] Other users see "Editing: Username" on locked shape
- [ ] Other users cannot drag locked shape
- [ ] Lock releases after drag completes
- [ ] Lock clears when user disconnects
- [ ] Boundary constraints work during drag
- [ ] Transaction ensures only one lock possible

**Deliverable:** Smooth movement with atomic transaction-based locking

---

## 🗑️ Phase 6: Shape Deletion

### Delete Functionality
- [ ] Listen for Delete/Backspace key events
- [ ] Check if a shape is currently selected
- [ ] Check if selected shape is locked
- [ ] Show error message if shape is locked
- [ ] Delete shape from Firestore subcollection if unlocked
- [ ] Remove shape from Zustand store
- [ ] Clear selection after deletion

### Real-Time Deletion Sync
- [ ] Firestore listener handles deleted snapshots
- [ ] Shape disappears for all users immediately
- [ ] No ghost shapes remain after deletion
- [ ] Deleted shapes don't reappear on refresh

**Test Checklist:**
- [ ] Select rectangle and press Delete → disappears
- [ ] Other users see deletion within 100ms
- [ ] Cannot delete locked shape (shows error)
- [ ] Deleted shapes removed from Firestore
- [ ] No ghost shapes after refresh
- [ ] Backspace key also works for deletion

**Deliverable:** Delete functionality with lock checking

---

## ✏️ Phase 7: Text Layer Implementation

### Text Edit Mode
- [ ] Handle double-click event on rectangle
- [ ] Acquire lock with transaction on double-click
- [ ] Show text input overlay on rectangle
- [ ] Position input overlay correctly on canvas
- [ ] Focus input automatically on double-click

### Text Input Logic
- [ ] Capture text input changes
- [ ] Debounce Firestore writes (200ms delay)
- [ ] Update text field in Firestore on debounce
- [ ] Handle Enter key (finish editing)
- [ ] Handle Escape key (cancel, revert text)
- [ ] Release lock when editing completes

### Text Rendering
- [ ] Render text on rectangles using Konva Text
- [ ] Apply fixed styling (14px sans-serif, black, centered)
- [ ] Truncate text if too long (max 200 chars)
- [ ] Ellipsis for overflow text
- [ ] Text syncs to all users in real-time

### Lock Integration
- [ ] Rectangle locked while text editing
- [ ] Other users see "Editing: [Username]"
- [ ] Other users cannot move or edit locked rectangle
- [ ] Lock auto-releases on Enter or click outside

**Test Checklist:**
- [ ] Double-click enters text edit mode
- [ ] Input overlay appears at correct position
- [ ] Text updates appear for other users as typing
- [ ] Debounced writes reduce Firestore operations
- [ ] Enter key finishes editing
- [ ] Escape key cancels and reverts
- [ ] Lock prevents other users from editing
- [ ] Lock releases after edit complete
- [ ] Text persists across refresh
- [ ] Max 200 characters enforced

**Deliverable:** Text editing with debounced sync and locking


---

## 👥 Phase 8: Consolidated Cursors & Presence

### Unified Data Structure
- [ ] Create consolidated presence structure in Realtime DB
- [ ] Path: `/sessions/global-canvas-v1/{userId}`
- [ ] Include: userId, displayName, email, cursorColor, cursorX, cursorY, lastSeen, isOnline, currentlyEditing

### Cursor Tracking
- [ ] Listen to mousemove events on canvas
- [ ] Throttle cursor updates to 20-30 FPS (30-50ms)
- [ ] Write cursor position to Realtime DB (consolidated structure)
- [ ] Generate deterministic cursor color from userId
- [ ] Include currentlyEditing field (shapeId or null)

### Presence Management
- [ ] Write user presence on connection
- [ ] Use Firebase onDisconnect to clear presence
- [ ] Update lastSeen timestamp periodically
- [ ] Set isOnline: true on connect, false on disconnect

### Cursor Rendering
- [ ] Subscribe to `/sessions/global-canvas-v1/` in Realtime DB
- [ ] Create `src/components/Canvas/CursorLayer.tsx`
- [ ] Render cursor SVG for each online user (on Cursors Layer)
- [ ] Show name label below cursor
- [ ] Apply user's assigned color to cursor
- [ ] Update cursor positions smoothly (no jitter)

### Presence Sidebar
- [ ] Create `src/components/Canvas/PresenceSidebar.tsx`
- [ ] Display list of online users
- [ ] Show user name and color indicator
- [ ] Show green dot for online status
- [ ] Display which shape each user is editing
- [ ] Update list on join/leave events

### Throttling Implementation
- [ ] Create throttle utility function
- [ ] Throttle cursor position writes to 30-50ms
- [ ] Use requestAnimationFrame for rendering
- [ ] Ensure no performance impact on canvas (60 FPS maintained)

**Test Checklist:**
- [ ] User A's cursor visible to User B with name
- [ ] User B's cursor visible to User A with name
- [ ] Each user has unique color (deterministic)
- [ ] Cursors move smoothly without jitter
- [ ] Cursor updates don't cause canvas lag (60 FPS)
- [ ] Latency <50ms for cursor position
- [ ] Presence sidebar shows all online users
- [ ] Shows which shape each user is editing
- [ ] Join/leave updates within 1-2 seconds
- [ ] Cursor disappears when user disconnects
- [ ] No ghost users in presence list
- [ ] Single write operation per cursor update (consolidated)

**Deliverable:** Multiplayer cursors with consolidated presence awareness

---

## 🛡️ Phase 9: Error Handling & Connection Status

### Error Boundary
- [ ] Create `src/components/ErrorBoundary.tsx`
- [ ] Implement getDerivedStateFromError
- [ ] Implement componentDidCatch
- [ ] Show error UI with reload button
- [ ] Log errors to console
- [ ] Wrap Canvas component in Error Boundary

### Connection Status Indicator
- [ ] Create `src/hooks/useConnectionStatus.ts`
- [ ] Subscribe to Firebase `.info/connected` in Realtime DB
- [ ] Track connection state (online/offline)
- [ ] Create connection banner component
- [ ] Show "Reconnecting..." when offline
- [ ] Hide banner when online

### Error Messages
- [ ] Add error handling for auth failures
- [ ] Add error messages for lock conflicts
- [ ] Add tooltips for locked shapes
- [ ] Show clear feedback on Firebase errors
- [ ] Provide user-friendly error descriptions

**Test Checklist:**
- [ ] Trigger React error → Error Boundary catches it
- [ ] Error UI shows with reload option
- [ ] Disconnect network → connection banner appears
- [ ] Reconnect network → banner disappears
- [ ] Auth errors show clear messages
- [ ] Lock conflicts show who is editing
- [ ] App doesn't crash on errors

**Deliverable:** Robust error handling and connection feedback

---

## 📊 Phase 10: Performance Monitoring

### FPS Counter
- [ ] Create performance monitoring utility
- [ ] Track frame count and calculate FPS
- [ ] Display FPS in browser title (dev mode only)
- [ ] Log warnings when FPS drops below 30
- [ ] Use requestAnimationFrame for measurement

### Firebase Monitoring
- [ ] Log Firestore read/write operations in dev mode
- [ ] Monitor Realtime DB update frequency
- [ ] Track debounced operations
- [ ] Verify throttling is working correctly
- [ ] Check Firebase Emulator usage dashboard

**Test Checklist:**
- [ ] FPS counter visible in dev mode
- [ ] Console warns when FPS <30
- [ ] Can monitor performance during testing
- [ ] Firebase operations logged in dev mode
- [ ] Throttling reduces unnecessary writes

**Deliverable:** Performance visibility during development

---

## 🧪 Phase 11: Testing & Polish

### Acceptance Testing
- [ ] Run all tests from PRD Testing Strategy
- [ ] Test authentication flow completely
- [ ] Test canvas operations (create, move, edit, delete)
- [ ] Test real-time collaboration with 2+ users
- [ ] Test transaction-based locking thoroughly
- [ ] Test multiplayer cursors and presence
- [ ] Test consolidated presence data structure
- [ ] Test state persistence (refresh, disconnect)
- [ ] Test performance with 100+ objects
- [ ] Test with 500 objects at 60 FPS
- [ ] Test with 5 concurrent users
- [ ] Test network resilience (throttling, disconnect)
- [ ] Test error handling scenarios
- [ ] Test all features with Firebase Emulator

### Bug Fixes
- [ ] Fix any sync issues discovered
- [ ] Fix any lock conflicts or race conditions
- [ ] Fix any performance bottlenecks
- [ ] Fix any UI/UX issues
- [ ] Verify no duplicate shapes created
- [ ] Verify no ghost shapes remain

### Polish
- [ ] Improve visual design (Tailwind styling)
- [ ] Add loading states where needed
- [ ] Smooth out animations and transitions
- [ ] Ensure responsive layout
- [ ] Test on different browsers
- [ ] Clean up console logs and warnings

### Firebase Security Rules
- [ ] Write enhanced Firestore rules from PRD
- [ ] Write enhanced Realtime DB rules from PRD
- [ ] Test rules with emulator
- [ ] Deploy rules to production Firebase
- [ ] Verify rules work correctly in production

**Test Checklist:**
- [ ] All acceptance tests pass
- [ ] No critical bugs remain
- [ ] Performance targets met (60 FPS, <100ms sync)
- [ ] 5+ concurrent users work smoothly
- [ ] Firebase rules deployed and working
- [ ] Emulator testing completed successfully

**Deliverable:** Production-ready MVP passing all acceptance criteria

---

## 🚀 Phase 12: Final Deployment & Warm-Up

### Production Deployment
- [ ] Verify all environment variables set in Vercel
- [ ] Test authentication in production (not emulator)
- [ ] Verify Firebase security rules deployed
- [ ] Test Firestore subcollections in production
- [ ] Test Realtime DB in production
- [ ] Test with public URL from different devices
- [ ] Test with different browsers
- [ ] Verify all real-time features work in production

### Documentation
- [ ] Update README with setup instructions
- [ ] Add architecture overview to README
- [ ] Document environment variables needed
- [ ] Add troubleshooting section
- [ ] Include deployed URL in README
- [ ] Document Firebase Emulator usage

### UptimeRobot Setup (Keep App Warm)
- [ ] Create free UptimeRobot account
- [ ] Add monitor for deployed Vercel URL
- [ ] Configure HTTP(s) monitoring
- [ ] Set check interval to 5 minutes
- [ ] Verify monitor is pinging app
- [ ] Test that app stays warm (no cold starts)
- [ ] Set up 24 hours before submission deadline
- [ ] Verify instant load times before demo

### Pre-Submission Checklist
- [ ] Run full acceptance test suite one final time
- [ ] Test with 5 concurrent users
- [ ] Verify app loads instantly (warm server)
- [ ] Check Firebase quota usage
- [ ] Verify all features work in production
- [ ] Prepare demo video
- [ ] Document known issues (if any)
- [ ] Review PRD success criteria

**Test Checklist:**
- [ ] Public URL accessible from anywhere
- [ ] Authentication works in production
- [ ] All real-time features work cross-domain
- [ ] No CORS errors
- [ ] SSL/HTTPS enabled
- [ ] 5+ simultaneous users supported
- [ ] App loads instantly (UptimeRobot keeps warm)
- [ ] No cold start delays during demo
- [ ] Firebase rules secure but functional
- [ ] All success metrics met

**Deliverable:** Publicly accessible CollabCanvas MVP with warm server ready for demo

---

## 📝 Post-Development

### AI Development Log
- [ ] Document AI tools used during development
- [ ] List 3-5 effective prompts that worked well
- [ ] Estimate % of AI-generated vs hand-written code
- [ ] Note where AI excelled and where it struggled
- [ ] Document key learnings about AI coding
- [ ] Submit 1-page AI Development Log

### Demo Video
- [ ] Record 3-5 minute demo video
- [ ] Show authentication flow
- [ ] Demonstrate real-time collaboration
- [ ] Show multiplayer cursors and presence
- [ ] Demonstrate locking mechanism
- [ ] Show state persistence
- [ ] Explain architecture briefly
- [ ] Highlight subcollection structure
- [ ] Mention Firebase Emulator usage

### Final Submission
- [ ] GitHub repository with complete code
- [ ] README with setup guide and architecture
- [ ] Deployed application URL
- [ ] Demo video link
- [ ] AI Development Log (1 page)
- [ ] Submit before Sunday 10:59 PM CT

---

## ✅ MVP Gate Checklist (All Must Pass)

- [ ] ✅ Authentication: Register, login (email + Google), sessions persist
- [ ] ✅ Canvas: 5000x5000px, 60 FPS pan/zoom, multi-layer structure
- [ ] ✅ Shapes: Click to create rectangles, Firestore subcollections
- [ ] ✅ Text: Double-click to edit, debounced sync (200ms)
- [ ] ✅ Movement: Drag rectangles smoothly
- [ ] ✅ Deletion: Delete key removes shapes
- [ ] ✅ Boundaries: Objects constrained within canvas
- [ ] ✅ Sync: All actions sync <100ms via subcollections
- [ ] ✅ Locking: Transaction-based atomic locks, no race conditions
- [ ] ✅ Lock UI: Visual "Editing: Username" indicators
- [ ] ✅ Cursors: Real-time cursors <50ms, consolidated with presence
- [ ] ✅ Presence: Online users list, shows editing status
- [ ] ✅ Persistence: Canvas survives refresh and disconnect
- [ ] ✅ Performance: 60 FPS with 100+ objects
- [ ] ✅ Scale: 5+ concurrent users, 500 objects
- [ ] ✅ Deployment: Public URL, warm server via UptimeRobot
- [ ] ✅ Errors: Error boundary, connection status
- [ ] ✅ Monitoring: FPS counter in dev mode
- [ ] ✅ Emulator: All development done with Firebase Emulator
- [ ] ✅ Security: Enhanced Firebase rules deployed

---

**Checklist Version**: 3.0 (Optimized & Aligned with PRD v3.0)  
**Last Updated**: October 14, 2025