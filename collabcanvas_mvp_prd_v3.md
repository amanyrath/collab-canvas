# CollabCanvas MVP - Product Requirements Document

**Project**: CollabCanvas - Real-Time Collaborative Design Tool  
**Goal**: Build a solid multiplayer foundation with essential canvas functionality  
**Timeline**: 24-hour sprint to MVP checkpoint

**Guiding Principle**: *"A simple canvas with bulletproof multiplayer is worth more than a feature-rich canvas with broken sync."*

---

## Canvas Architecture (MVP)

**Single Global Canvas:**
- ONE shared global canvas for all authenticated users
- No project creation, management, or selection in MVP
- All users collaborate on the same shared canvas space
- Simple route (`/canvas`)

---

## Core Features for MVP

### 1. Authentication System

**Must Have:**
- User registration via email/password (Firebase Auth)
- Google social login (Firebase Auth)
- User login/logout functionality
- Persistent user sessions across browser refreshes
- User display names visible to all collaborators
- Automatic session management with Firebase

**Display Name Logic:**
- Use Google display name if signing in via Google
- Use email prefix (before @) if signing in via email/password
- Display truncated version if name is too long (max 20 characters)

**Success Criteria:**
- Users can create accounts and maintain sessions across page refreshes
- Each user has a unique identifier and display name
- Login/logout flow is smooth and intuitive
- Authentication state persists correctly

---

### 2. Canvas Workspace

**Must Have:**
- Large canvas area (5000x5000px virtual space)
- Smooth pan functionality (click-and-drag to move viewport)
- Zoom functionality (mousewheel or pinch gesture)
- Hard boundaries at canvas edges (objects cannot leave canvas)
- 60 FPS performance during all interactions

**Canvas Boundaries:**
- Objects cannot be created outside boundaries (0,0 to 5000,5000)
- Objects cannot be dragged outside boundaries
- Drag operations stop at boundary edges

**Success Criteria:**
- Canvas feels responsive and smooth at all times
- No lag during pan/zoom operations
- Can handle at least 500 rectangles without performance degradation
- Objects are strictly constrained within canvas boundaries
- Maintains 60 FPS with 100+ objects during pan/zoom

---

### 3. Shape Creation & Manipulation

**Must Have:**
- Rectangles only for MVP (other shapes explicitly out of scope)
- Click canvas to create new rectangle (default size 100x100px)
- Click shape to select it
- Drag selected shape to move it
- Visual feedback for selected objects (border highlight)
- Fixed styling: gray fill color (#CCCCCC) for all rectangles
- Delete selected shape with Delete or Backspace key

**Selection Behavior:**
- Single-select only: clicking a shape deselects any previously selected shape
- Only one shape can be selected at a time
- Clicking empty canvas area deselects current selection
- Selected state must be clearly visible with border or highlight
- Selection is user-specific (each user has their own selection state)

**Delete Functionality:**
- Delete key or Backspace removes currently selected shape
- Deletion broadcasts to all users immediately
- Deleted shapes removed from database permanently
- Cannot delete shapes locked by other users

**Success Criteria:**
- Rectangle creation is immediate and intuitive
- Drag operations are smooth and responsive
- Selected state is clearly visible to the user
- Selection behavior is predictable and consistent
- Delete removes shape for all users within 100ms
- No "ghost shapes" after deletion

---

### 4. Text Layers

**Must Have:**
- Double-click rectangle to enter text edit mode
- Text input overlay appears on rectangle
- Type text directly (basic single-line text for MVP)
- Text syncs to all users in real-time
- Press Enter or click outside to finish editing
- Text displays on rectangle for all users

**Text Editing Behavior:**
- Double-click enters edit mode (shows text cursor)
- Rectangle locks while being edited (other users cannot move it)
- Text updates debounced (200ms) to reduce database writes
- ESC key cancels edit and reverts to previous text
- Text truncates if too long for rectangle

**Text Styling:**
- Fixed font: 14px sans-serif
- Fixed color: black text on gray background
- Center-aligned horizontally and vertically
- No rich text formatting

**Success Criteria:**
- Double-click consistently enters edit mode
- Text appears for all users as it's typed
- Edit mode locks rectangle from other users
- Text persists across page refreshes
- Maximum 200 characters per text field

---

### 5. Real-Time Synchronization

**Must Have:**
- Broadcast shape creation to all users (<100ms)
- Broadcast shape movements to all users (<100ms)
- Broadcast shape deletions to all users (<100ms)
- Broadcast text edits to all users (<100ms)
- Handle concurrent edits without breaking or data loss
- Object locking system to prevent simultaneous edits
- Visual indicator showing which user has locked an object
- Auto-release lock when user completes action or disconnects

**Conflict Resolution: Firestore Transactions**
- Lock acquisition uses atomic Firestore transactions
- First user to acquire lock gets exclusive edit access
- Lock prevents: selection, movement, text editing, deletion by others
- Lock auto-releases on:
  - Drag operation completion
  - Text edit completion
  - User disconnect (Firebase onDisconnect cleanup)
  - Transaction ensures no race conditions

**Visual Feedback:**
- Locked object shows indicator: "Editing: [Username]"
- Cursor changes when hovering over locked object
- Tooltip or status message when attempting to edit locked object

**Success Criteria:**
- Object changes visible to all users within 100ms
- No "ghost objects" or desync issues between clients
- Only one user can edit an object at any given time
- Clear visual feedback when attempting to edit locked object
- Locks automatically release after operation completes
- Locks clear when user disconnects unexpectedly
- No deadlocks or permanent locks via transaction guarantees

---

### 6. Multiplayer Cursors & Presence (Consolidated)

**Must Have:**
- Show real-time cursor position for each connected user
- Display user name label near cursor
- Update cursor positions in real-time (<50ms latency target)
- Unique color per user for visual distinction
- Cursor visible anywhere on canvas (within bounds)
- Show which object each user is currently editing

**Combined Cursor + Presence Data Structure:**
- Single unified data structure in Firebase Realtime Database
- Stores: cursor position, user info, online status, currently editing shape
- Reduces read/write operations by consolidating updates

**Cursor Colors:**
- Randomly assigned from predefined color palette on user join
- Palette of 8 distinct colors
- Deterministic assignment based on user ID hash
- Sufficient contrast against white/light canvas backgrounds

**Cursor Implementation:**
- Cursor positions stored in Firebase Realtime Database
- Update frequency: Throttle to 20-30 FPS (30-50ms intervals)
- Cursor shape: Arrow SVG with color fill matching user color
- Name label: Small text box below cursor

**Success Criteria:**
- Cursors move smoothly without jitter or lag
- Name labels are readable and don't obscure canvas content
- Cursor updates don't impact canvas rendering performance (60 FPS maintained)
- Each user has a distinct, easily visible cursor color
- Cursors disappear when users leave session
- Can see which shape each user is editing in real-time

---

### 7. Presence Awareness

**Must Have:**
- Persistent list of currently connected users
- Display user names with their assigned colors
- Real-time join notifications (user appears in list)
- Real-time leave notifications (user disappears from list)
- Visual indicator of online status (green dot)
- Show which object each user is currently editing
- Position: Fixed sidebar or floating panel

**Presence Implementation:**
- Presence data stored in Firebase Realtime Database (consolidated with cursors)
- Uses Firebase's built-in presence detection (onDisconnect)
- Automatic cleanup when user closes tab or loses connection

**Success Criteria:**
- Users can see who's in the session at all times
- Join/leave events update list within 1-2 seconds
- Presence list shows correct count of online users
- No "ghost users" lingering after disconnect
- Presence data clears correctly on logout
- Can see what each user is currently editing

---

### 8. State Persistence

**Must Have:**
- Save canvas state to Firestore database
- Load complete canvas state on page load
- Persist through disconnects and reconnects
- All users see same state when joining
- Canvas state survives all users leaving and returning

**Persistence Triggers:**
- Shape creation: Immediate write to Firestore
- Shape movement: Write on drag end
- Text edit: Debounced write (200ms after typing stops)
- Shape deletion: Immediate write to Firestore

**What Persists:**
- ✅ All canvas objects (rectangles with positions, dimensions, text)
- ✅ User session metadata (createdBy, lastModifiedBy, timestamps)
- ❌ Canvas view state (pan/zoom position) - NOT persisted
- ❌ Cursor positions - transient data only in Realtime DB
- ❌ Current selection state - user-specific, not persisted

**Recovery Behavior:**
- On page load: Fetch entire canvas state from Firestore
- Display loading indicator while fetching
- Subscribe to Firestore snapshots for real-time updates
- New users joining see complete current state immediately

**Success Criteria:**
- All users leave and return hours later → canvas exactly as left
- Page refresh doesn't lose any data or objects
- New users joining see complete current state
- Deleted shapes don't reappear after refresh
- No duplicate objects created on reconnection
- Canvas state loads within 2 seconds on page load

---

### 9. Error Handling & Connection Status

**Must Have:**
- Error boundary component to catch React errors
- Connection status indicator showing online/offline state
- Graceful degradation when Firebase connection lost
- Clear error messages for auth failures
- Reload option when critical error occurs

**Success Criteria:**
- App doesn't crash on errors, shows recovery UI
- Users know when connection is lost
- Clear feedback on what went wrong and how to fix it

---

### 10. Performance Monitoring

**Must Have:**
- FPS counter visible in development mode
- Console warnings when FPS drops below 30
- Performance tracking during pan/zoom operations
- Monitor Firebase read/write operations

**Success Criteria:**
- Can identify performance bottlenecks quickly
- Team can validate 60 FPS target during development
- Firebase quota usage is visible and monitored

---

### 11. Deployment

**Must Have:**
- Publicly accessible URL (Vercel)
- Stable hosting for 5+ concurrent users
- No setup or configuration required for end users
- SSL/HTTPS enabled for secure authentication
- Production Firebase project

**Deployment Platform:**
- Vercel for frontend + Firebase for backend
- Custom domain optional
- Environment variables configured correctly
- Firebase security rules deployed
- No CORS issues

**Success Criteria:**
- Anyone can access via URL without authentication errors
- Supports at least 5 simultaneous users without degradation
- No crashes or errors under normal load
- Authentication works in production environment
- All real-time features work cross-domain

---

## Technical Architecture

### Stack Specification

**Frontend:**
- Framework: React 18+ with Vite
- Canvas Rendering: Konva.js + react-konva
- Styling: Tailwind CSS
- State Management: Zustand (no React Context)

**Backend:**
- Authentication: Firebase Authentication
- Persistence: Firestore (canvas objects via subcollections)
- Real-Time Sync: Firebase Realtime Database (cursors + presence consolidated)
- Hosting: Vercel

**Development:**
- Firebase Emulator Suite for local development
- Unlimited local testing without quota limits
- Test auth, Firestore, and Realtime DB locally

**Database Strategy:**
- Firestore: Persistent data with subcollections (shapes as individual documents)
- Realtime Database: High-frequency transient data (consolidated cursors + presence)

**Why Subcollections?**
- Each shape is independent document (no array conflicts)
- Listeners only trigger for changed shapes
- Built-in atomic operations via transactions
- Better scaling beyond MVP
- Simpler lock implementation

---

## Optimized Data Model

### Firestore Structure: Subcollections

**Path:** `canvas/global-canvas-v1/shapes/{shapeId}`

**Shape Document Fields:**
- `id`: Unique identifier (UUID v4)
- `type`: Always "rectangle" for MVP
- `x, y`: Top-left corner position (0-5000 range)
- `width, height`: Dimensions in pixels
- `fill`: Hex color code (fixed to "#cccccc")
- `text`: Text content (max 200 chars, optional)
- `textColor`: Text color hex code (fixed to "#000000")
- `fontSize`: Text size (fixed to 14)
- `createdBy`: User ID who created the shape
- `createdAt`: Firestore server timestamp
- `lastModifiedBy`: User ID who last edited
- `lastModifiedAt`: Firestore server timestamp
- `isLocked`: Boolean indicating if currently locked
- `lockedBy`: User ID holding the lock (null if unlocked)

**Benefits:**
- Atomic writes per shape (no array conflicts)
- Firestore listeners only fire for changed shapes
- Lock acquisition via transactions (no race conditions)
- Easier queries and filtering

---

### Firebase Realtime Database: Consolidated Presence + Cursors

**Path:** `/sessions/global-canvas-v1/{userId}`

**Unified User Session Fields:**
- `userId`: Firebase Auth UID
- `displayName`: User's display name
- `email`: User's email
- `cursorColor`: Assigned color from palette
- `cursorX, cursorY`: Current cursor coordinates
- `lastSeen`: Unix timestamp (milliseconds)
- `isOnline`: Boolean presence flag
- `currentlyEditing`: Shape ID being edited (null if none)

**Benefits:**
- Single write operation for cursor movement
- Single listener for cursors and presence
- Can display "User A is editing Rectangle 5" in UI
- Reduces Firebase read/write operations significantly

---

## Konva Layer Strategy (Optimized for 500 Objects)

**Layer Organization:**
1. **Grid Layer** (listening: false)
   - Static grid lines or canvas boundary indicator
   - Never needs events, render once

2. **Shapes Layer** (listening: true)
   - All rectangle shapes with text
   - Interactive, handles click/drag events
   - Use React.memo for shape components

3. **Cursors Layer** (listening: false)
   - All multiplayer cursors with name labels
   - Overlays on top, no interaction needed

4. **Selection Layer** (listening: false)
   - Selection indicators and lock status
   - Visual feedback only, no events

**Performance Optimizations:**
- Non-interactive layers don't consume event listeners
- React.memo prevents unnecessary shape re-renders
- Only changed shapes trigger updates
- Cursor layer updates independently of shapes

---

## Performance Targets

| Metric | Target | 
|--------|--------|
| Rendering FPS | 60 FPS |
| Object Sync Latency | <100ms |
| Cursor Sync Latency | <50ms |
| Concurrent Users | 5+ users |
| Canvas Capacity | 500+ objects |
| Canvas Size | 5000x5000px |
| Page Load Time | <2 seconds |
| Lock Acquisition | <100ms |

---

## Firebase Security Rules

### Firestore Rules (Enhanced)
- Read: Authenticated users only
- Create: Authenticated + validate boundaries + set createdBy
- Update: Must own lock or shape must be unlocked
- Delete: Shape must be unlocked

### Realtime Database Rules (Enhanced)
- Read: All authenticated users
- Write: Only own user path
- Validate: Required fields present

---

## Out of Scope for MVP

### Product Features NOT Included:
- Multiple shape types (circles, lines, polygons)
- Color customization (fixed gray fill)
- Resize/rotate functionality
- Multi-select (shift-click or drag-to-select)
- Copy/paste, undo/redo
- Layer management or z-index controls
- Alignment tools, grouping
- Rich text formatting
- Canvas view state persistence
- Multiple canvas rooms/projects
- Export functionality
- AI features

### Technical Items NOT Included:
- Operational Transforms or CRDTs
- Infinite canvas (fixed 5000x5000px)
- Spatial indexing or quadtree
- Virtual rendering
- Web Workers
- Custom WebSocket server
- Server-side rendering
- Mobile app or touch optimization
- Offline mode or PWA

---

## Known Limitations

1. Single global canvas (multi-project deferred to Phase 2)
2. Rectangles only (circles, lines in future)
3. No resize/rotate (fixed size at creation)
4. Transaction-based locking (not CRDT)
5. No styling options (fixed gray fill, black text)
6. No history (no undo/redo)
7. Desktop only (not mobile optimized)
8. Fixed canvas size (5000x5000px, not infinite)
9. No permissions (all users have equal edit access)
10. Single-line text (limited to 200 characters)

---

## Risk Assessment & Mitigation

### Risk 1: Real-Time Sync Breaking Under Load
**Impact**: HIGH  
**Mitigation**:
- Test with multiple browsers continuously
- Use Realtime DB for high-frequency updates (cursors)
- Use Firestore subcollections for shapes
- Throttle cursor updates to 20-30 FPS
- Firebase Emulator Suite for unlimited local testing

### Risk 2: Performance Degradation with Many Objects
**Impact**: HIGH  
**Mitigation**:
- Use Konva multi-layer strategy
- React.memo for shape components
- Test regularly with 500+ shapes
- Profile with Chrome DevTools
- Limit testing to 500 shapes for MVP validation

### Risk 3: Edit Locking Race Conditions
**Impact**: MEDIUM  
**Mitigation**:
- Use Firestore transactions for atomic lock acquisition
- Transaction ensures no simultaneous locks possible
- Firebase onDisconnect clears locks automatically
- Clear visual feedback showing lock state

### Risk 4: Cursor Updates Causing Performance Issues
**Impact**: MEDIUM  
**Mitigation**:
- Store cursor positions in Realtime Database
- Throttle cursor updates to 20-30 FPS
- Use requestAnimationFrame for rendering
- Separate Konva layer for cursors (no event listeners)
- Monitor FPS during development

### Risk 5: Firebase Quota Exhaustion
**Impact**: LOW (Free Tier)  
**Mitigation**:
- Use Firebase Emulator Suite for all development
- Debounce text input updates (200ms)
- Monitor Firebase usage dashboard
- Consolidate cursor + presence into single write
- Subcollections reduce unnecessary reads
- Document read/write patterns

### Risk 6: Authentication Edge Cases
**Impact**: MEDIUM  
**Mitigation**:
- Test both email/password and Google OAuth thoroughly
- Handle network errors gracefully with error boundary
- Implement loading states and error messages
- Test session persistence across refreshes

### Risk 7: Network Disconnect/Reconnect Issues
**Impact**: MEDIUM  
**Mitigation**:
- Use Firestore's offline persistence (automatic)
- Subscribe to connection state changes
- Show "Reconnecting..." indicator
- Re-subscribe to databases on reconnect
- Test with network throttling

### Risk 8: Vercel Cold Starts Affecting Demo
**Impact**: MEDIUM  
**Mitigation**:
- Add UptimeRobot free tier monitoring before submission
- Pings app every 5 minutes to keep warm
- Ensures instant load for reviewers
- Set up 24 hours before submission deadline

---

## Success Metrics for MVP Checkpoint

### Hard Requirements (Must ALL Pass):

✅ Authentication: Users can register, sign in, maintain sessions  
✅ Canvas Workspace: 5000x5000px canvas, 60 FPS pan/zoom  
✅ Shape Creation: Users can create rectangles by clicking  
✅ Text Layer: Double-click rectangles to add/edit text  
✅ Shape Movement: Drag rectangles smoothly  
✅ Shape Deletion: Delete key removes shapes  
✅ Boundary Enforcement: Objects constrained within canvas  
✅ Real-Time Sync: All actions sync <100ms  
✅ Edit Locking: Only one user edits object at a time via transactions  
✅ Lock Indicators: Visual feedback showing who is editing  
✅ Multiplayer Cursors: See cursors with names and colors  
✅ Presence Awareness: Online users list with editing status  
✅ State Persistence: Canvas survives refresh and disconnect  
✅ Performance: 60 FPS with 100+ objects  
✅ Concurrent Users: 5+ simultaneous users  
✅ Deployment: Publicly accessible via URL  
✅ Error Handling: Error boundary and connection status  
✅ Performance Monitoring: FPS counter in dev mode  

### Failure Modes (Any = MVP Does Not Pass):

❌ Authentication Broken  
❌ Sync Broken (>2 second lag)  
❌ Performance Issues (<30 FPS)  
❌ Lock Failures (simultaneous edits possible)  
❌ Data Loss (objects disappear after refresh)  
❌ Crash Under Load (unusable with 5 users)  
❌ Deployment Issues (URL inaccessible)

---

## Development Roadmap (Revised Order)

### Phase 1: Project Setup & Firebase Integration
- Initialize Vite React + TypeScript project
- Install dependencies: firebase, react-konva, zustand, tailwindcss, uuid
- Configure Tailwind
- Initialize Firebase project (Auth, Firestore, Realtime DB)
- Set up Firebase Emulator Suite for local development
- Deploy "Hello World" to Vercel
- Set up environment variables

**Deliverable:** Live URL with Firebase Emulator Suite running locally

---

### Phase 2: Authentication Flow
- Create login/register UI components
- Implement email/password registration and login
- Implement Google OAuth login
- Implement logout functionality
- Add session persistence (auto-login on refresh)
- Display user's display name in UI
- Add loading states and error messages

**Deliverable:** Working authentication flow with persistent sessions

---

### Phase 3: Canvas Foundation
- Install Konva.js and react-konva
- Create Canvas component with 5000x5000 Stage
- Implement multi-layer structure (Grid, Shapes, Cursors, Selection)
- Implement pan (drag background)
- Implement zoom (mousewheel)
- Add boundary constraints
- Optimize for 60 FPS

**Deliverable:** Smooth, performant canvas workspace with layers

---

### Phase 4: Shape Creation & Persistence (MOVED UP)
- Handle click event to create rectangle
- Save shape to Firestore subcollection immediately
- Subscribe to Firestore shape subcollection
- Render rectangles from Firestore data
- Use React.memo for shape components
- Test persistence across refresh

**Deliverable:** Rectangle creation syncs across users, persists in database

---
yes
### Phase 5: Selection & Movement with Locking (MOVED UP)
- Handle click on rectangle to select
- Lock upon select
- Show visual selection indicator
- Implement drag-to-move with Konva
- Use Firestore transaction for atomic lock acquisition
- Update position on drag end
- Prevent editing locked shapes
- Show "Editing: [Username]" on locked shapes
- Click on canvas to de-select

**Deliverable:** Smooth shape movement with transaction-based conflict prevention

---

### Phase 6: Text Layer Implementation
- Handle double-click on rectangle
- Lock rectangle with transaction on text edit start
- Show text input overlay
- Capture text input with debounced updates (200ms)
- Write text to Firestore (debounced)
- Render text on rectangle for all users
- Handle Enter/ESC keys
- Release lock on edit complete

**Deliverable:** Text editing syncs across users with locking

---

### Phase 7: Shape Deletion
- Listen for Delete/Backspace key events
- Check if shape is locked before deleting
- Delete shape from Firestore immediately
- Remove shape from UI for all users
- Show error if attempting to delete locked shape

**Deliverable:** Delete functionality with lock checking

---

### Phase 8: Consolidated Cursors & Presence
- Assign random cursor color on user join (deterministic hash)
- Write consolidated data to Realtime DB (cursor + presence + editing status)
- Throttle cursor position updates (20-30 FPS)
- Subscribe to consolidated presence data
- Render cursor SVG with name label on Cursors layer
- Render presence list in sidebar showing editing status
- Use Firebase onDisconnect for cleanup

**Deliverable:** Multiplayer cursors with consolidated presence awareness

---

### Phase 9: Error Handling & Connection Status
- Create Error Boundary component
- Wrap Canvas in Error Boundary
- Add connection status indicator
- Subscribe to Firebase connection state
- Show "Reconnecting..." when offline
- Add error messages for auth failures

**Deliverable:** Robust error handling and connection feedback

---

### Phase 10: Performance Monitoring
- Add FPS counter for development mode
- Console warnings when FPS drops below 30
- Use requestAnimationFrame for measurement
- Display FPS in browser title (dev mode)
- Monitor Firebase read/write operations

**Deliverable:** Performance visibility during development

---

### Phase 11: Testing & Polish
- Run all acceptance tests
- Test with 5 concurrent users
- Test network resilience (throttling, disconnect)
- Test with 500 rectangles for performance
- Fix bugs and sync issues
- Improve visual polish
- Test with Firebase Emulator Suite
- Deploy to production and test live

**Deliverable:** Production-ready MVP

---

### Phase 12: Final Deployment & Warm-Up
- Verify environment variables set in Vercel
- Test authentication in production
- Verify Firebase security rules deployed
- Test with public URL from different devices
- Set up UptimeRobot monitoring (free tier)
- Configure 5-minute ping interval
- Verify app stays warm
- Prepare demo for submission

**Deliverable:** Publicly accessible CollabCanvas MVP with warm server

---

## Testing Strategy

### MVP Acceptance Tests

**Test 1: Authentication Flow**
- Register new account with email/password
- Sign in with existing email/password
- Sign in with Google OAuth
- Display name appears correctly
- Logout and session ends
- Log back in and resume session
- Auth state persists across page refresh

**Test 2: Canvas Operations**
- Click to create rectangles on canvas
- Rectangles appear at correct click position
- Select rectangles by clicking
- Selected rectangle shows visual border
- Drag selected rectangles
- Double-click to add text
- Edit text and see changes persist
- Delete rectangles with Delete/Backspace
- Pan canvas by dragging empty space
- Zoom canvas with mousewheel
- Objects constrained within boundaries

**Test 3: Real-Time Collaboration (2 Users)**
- Open app in two browser windows
- User A creates rectangle → User B sees it <100ms
- User A moves rectangle → User B sees movement
- User A adds text → User B sees text
- User A deletes rectangle → disappears for User B
- Rapid shape creation syncs correctly
- No duplicate shapes or ghost objects

**Test 4: Transaction-Based Locking**
- User A starts dragging rectangle → lock acquired via transaction
- User B attempts to select same rectangle → sees "Editing: User A"
- User B cannot move locked rectangle
- User A completes drag → lock releases automatically
- User B can now select and move rectangle
- User A starts editing text → rectangle locks
- User B cannot move or delete locked rectangle
- User A finishes editing → lock releases
- No race conditions possible due to transactions

**Test 5: Multiplayer Cursors**
- User A's cursor visible to User B with name label
- User B's cursor visible to User A with name label
- Each user has unique cursor color
- Cursors move smoothly without jitter
- Cursor updates don't cause canvas lag (60 FPS)
- Cursor positions accurate <50ms
- Cursor disappears when user disconnects

**Test 6: Consolidated Presence Awareness**
- Presence sidebar shows User A when alone
- User B joins → appears in User A's list <2 seconds
- Presence shows correct display names and colors
- Shows which shape each user is editing
- User B disconnects → disappears from list <2 seconds
- Join/leave notifications accurate
- No "ghost users" lingering

**Test 7: State Persistence**
- Create 5 rectangles with text
- Note exact positions and text
- Refresh browser
- All 5 rectangles restored correctly
- Both users leave
- Wait 5 minutes
- Users return → canvas exactly as left
- New user joins → sees complete canvas state

**Test 8: Performance Under Load**
- Create 100 rectangles across canvas
- Monitor FPS → maintains 60 FPS
- Pan canvas rapidly → no frame drops
- Zoom in/out rapidly → smooth at 60 FPS
- Create 500 rectangles → verify 60 FPS maintained
- 5 users editing simultaneously → no degradation
- Cursor movements smooth with 5 users

**Test 9: Network Resilience**
- Throttle to "Fast 3G" in DevTools
- Create rectangles → sync within expected latency
- Move rectangles → updates visible despite lag
- Temporarily disconnect network
- Reconnect → canvas state recovers correctly
- No duplicate objects after reconnection

**Test 10: Error Handling**
- Trigger React error → Error Boundary catches it
- Disconnect network → connection indicator shows offline
- Auth failure → clear error message shown
- Lock conflict → tooltip explains who is editing
- Firebase error → graceful degradation

**Test 11: Firebase Emulator Suite**
- Run app with emulators locally
- Create shapes → saved to local Firestore
- Move cursors → updated in local Realtime DB
- Auth works with emulator
- No Firebase quota usage during development
- Can test unlimited scenarios locally

---

## References & Resources

### Documentation
- Firebase Authentication Docs
- Firestore Get Started
- Realtime Database Docs
- Konva.js React Documentation
- Vercel Deployment Guide
- Firebase Emulator Suite Docs

### Performance
- Chrome DevTools Performance
- Optimizing Konva Performance
- Firebase Performance Best Practices

---

**Document Version**: 3.0 (Optimized & Simplified)  
**Last Updated**: October 14, 2025  
**Status**: Ready for Implementation