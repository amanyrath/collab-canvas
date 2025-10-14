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

export interface ViewportState {
  x: number
  y: number
  scale: number
}

export interface CanvasState {
  shapes: Shape[]
  selectedShapeId: string | null
  viewport: ViewportState
}

export interface UserState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
