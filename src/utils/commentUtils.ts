/**
 * Comment Utilities
 * 
 * Firebase operations for collaborative comments
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Comment } from './commentTypes'

const CANVAS_ID = 'global-canvas-v1'

/**
 * Get the comments collection path for a shape
 */
function getCommentsCollectionPath(shapeId: string): string {
  return `canvas/${CANVAS_ID}/shapes/${shapeId}/comments`
}

/**
 * Add a new comment to a shape
 */
export async function addComment(
  shapeId: string,
  text: string,
  authorId: string,
  authorName: string,
  authorColor?: string
): Promise<string> {
  try {
    const commentsRef = collection(db, getCommentsCollectionPath(shapeId))
    
    const newComment = {
      shapeId,
      text,
      authorId,
      authorName,
      authorColor,
      createdAt: serverTimestamp(),
      isEdited: false,
      isResolved: false,
    }
    
    const docRef = await addDoc(commentsRef, newComment)
    console.log(`💬 Comment added to shape ${shapeId.slice(-6)}: ${docRef.id}`)
    
    return docRef.id
  } catch (error) {
    console.error('❌ Failed to add comment:', error)
    throw error
  }
}

/**
 * Update an existing comment
 */
export async function updateComment(
  shapeId: string,
  commentId: string,
  text: string
): Promise<void> {
  try {
    const commentRef = doc(db, getCommentsCollectionPath(shapeId), commentId)
    
    await updateDoc(commentRef, {
      text,
      updatedAt: serverTimestamp(),
      isEdited: true,
    })
    
    console.log(`💬 Comment ${commentId} updated`)
  } catch (error) {
    console.error('❌ Failed to update comment:', error)
    throw error
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(
  shapeId: string,
  commentId: string
): Promise<void> {
  try {
    const commentRef = doc(db, getCommentsCollectionPath(shapeId), commentId)
    await deleteDoc(commentRef)
    
    console.log(`💬 Comment ${commentId} deleted`)
  } catch (error) {
    console.error('❌ Failed to delete comment:', error)
    throw error
  }
}

/**
 * Mark a comment thread as resolved
 */
export async function resolveComment(
  shapeId: string,
  commentId: string,
  resolved: boolean
): Promise<void> {
  try {
    const commentRef = doc(db, getCommentsCollectionPath(shapeId), commentId)
    
    await updateDoc(commentRef, {
      isResolved: resolved,
      updatedAt: serverTimestamp(),
    })
    
    console.log(`💬 Comment ${commentId} ${resolved ? 'resolved' : 'unresolved'}`)
  } catch (error) {
    console.error('❌ Failed to resolve comment:', error)
    throw error
  }
}

/**
 * Subscribe to comments for a shape (real-time)
 */
export function subscribeToComments(
  shapeId: string,
  onUpdate: (comments: Comment[]) => void,
  onError?: (error: Error) => void
): () => void {
  console.log(`💬 subscribeToComments called for shape ${shapeId.slice(-6)}`)
  
  try {
    const commentsPath = getCommentsCollectionPath(shapeId)
    console.log(`💬 Subscribing to path: ${commentsPath}`)
    
    const commentsRef = collection(db, commentsPath)
    // Note: Removed orderBy to avoid index requirement - comments will be sorted client-side if needed
    // const q = query(commentsRef, orderBy('createdAt', 'asc'))
    
    const unsubscribe = onSnapshot(
      commentsRef,
      (snapshot) => {
        console.log(`💬 onSnapshot callback fired for shape ${shapeId.slice(-6)}, docs: ${snapshot.docs.length}, metadata:`, snapshot.metadata)
        const comments: Comment[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            shapeId: data.shapeId,
            text: data.text,
            authorId: data.authorId,
            authorName: data.authorName,
            authorColor: data.authorColor,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            isEdited: data.isEdited || false,
            isResolved: data.isResolved || false,
          } as Comment
        })
        
        // Sort comments by createdAt (client-side since we removed orderBy query)
        comments.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
          return timeA - timeB
        })
        
        console.log(`💬 Received ${comments.length} comments for shape ${shapeId.slice(-6)}`)
        onUpdate(comments)
      },
      (error) => {
        console.error(`❌ Error subscribing to comments for shape ${shapeId}:`, error)
        if (onError) onError(error)
      }
    )
    
    return unsubscribe
  } catch (error) {
    console.error('❌ Failed to subscribe to comments:', error)
    if (onError) onError(error as Error)
    return () => {} // Return no-op unsubscribe
  }
}

/**
 * Format timestamp for display
 */
export function formatCommentTime(timestamp: any): string {
  if (!timestamp) return 'Just now'
  
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

