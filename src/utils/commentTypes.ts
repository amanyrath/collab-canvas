/**
 * Comment System Types
 * 
 * Collaborative comments and annotations on shapes
 */

export interface Comment {
  id: string
  shapeId: string           // ID of shape this comment is attached to
  text: string              // Comment text content
  authorId: string          // User ID of comment author
  authorName: string        // Display name of author
  authorColor?: string      // Cursor color of author (for visual consistency)
  createdAt: any            // Firestore timestamp
  updatedAt?: any           // Firestore timestamp (for edits)
  isEdited?: boolean        // Whether comment has been edited
  isResolved?: boolean      // Whether comment thread is resolved
}

export interface CommentThread {
  shapeId: string
  comments: Comment[]
  unreadCount?: number
  lastActivity: any         // Firestore timestamp of most recent comment
}

