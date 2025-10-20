// TypeScript interfaces for CollabCanvas

export interface User {
  uid: string
  displayName: string
  email: string
  cursorColor: string
}

export interface Shape {
  id: string
  type: 'rectangle' | 'circle' | 'triangle'
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
  
  // 🎄 CHRISTMAS: Texture overlay (like a visual skin, synced to Firebase)
  texture?: string              // Path to texture file (e.g., '/textures/trees/pine1.png')
  treeLayer?: number            // For stacking tree triangles (0 = bottom)
  
  // 📐 LAYERS: z-index for layer ordering (higher = on top)
  zIndex?: number
  
  // 📐 LAYERS: visibility toggle (hidden shapes are not rendered)
  hidden?: boolean
  
  // 💬 COMMENTS: Stored directly on the shape
  comments?: Array<{
    id: string
    text: string
    authorId: string
    authorName: string
    authorColor?: string
    createdAt: any              // Firestore timestamp
    updatedAt?: any             // Firestore timestamp
    isEdited?: boolean
  }>
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

export type ShapeType = 'rectangle' | 'circle' | 'triangle'
