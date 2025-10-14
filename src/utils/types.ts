// TypeScript interfaces for CollabCanvas

export interface User {
  uid: string
  displayName: string
  email: string
  cursorColor: string
}

export interface Shape {
  id: string
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  fill: string
  text?: string
  textColor: string
  fontSize: number
  createdBy: string
  createdAt: any // Firestore timestamp
  lastModifiedBy: string
  lastModifiedAt: any // Firestore timestamp
  isLocked: boolean
  lockedBy: string | null
  lockedByName?: string | null // Display name of the user who locked it
  lockedByColor?: string | null // Cursor color of the user who locked it
  // ✅ SIMPLIFIED: No separate selection state - selection = locking
}

export interface CursorPosition {
  userId: string
  displayName: string
  email: string
  cursorColor: string
  cursorX: number
  cursorY: number
  lastSeen: number
  isOnline: boolean
  currentlyEditing: string | null // Shape ID or null
}

// ✅ REMOVED: ViewportState (handled by Konva Stage directly)

// ✅ REMOVED: CanvasState (simplified to individual pieces)

export interface UserState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
