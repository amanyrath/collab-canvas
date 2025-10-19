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
  where,
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Comment } from './commentTypes'

// Simple top-level comments collection
const COMMENTS_COLLECTION = 'comments'

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
    const commentsRef = collection(db, COMMENTS_COLLECTION)
    
    const newComment: any = {
      shapeId,
      text,
      authorId,
      authorName,
      createdAt: serverTimestamp(),
      isEdited: false,
      isResolved: false,
    }
    
    // Only add authorColor if it exists
    if (authorColor) {
      newComment.authorColor = authorColor
    }
    
    console.log(`💬 Creating comment for shape ${shapeId.slice(-6)}`)
    
    const docRef = await addDoc(commentsRef, newComment)
    console.log(`✅ Comment added: ${docRef.id}`)
    
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
  commentId: string,
  text: string
): Promise<void> {
  try {
    const commentRef = doc(db, COMMENTS_COLLECTION, commentId)
    
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
  commentId: string
): Promise<void> {
  try {
    const commentRef = doc(db, COMMENTS_COLLECTION, commentId)
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
  commentId: string,
  resolved: boolean
): Promise<void> {
  try {
    const commentRef = doc(db, COMMENTS_COLLECTION, commentId)
    
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
  console.log(`💬 Full shapeId:`, shapeId)
  
  try {
    const commentsRef = collection(db, COMMENTS_COLLECTION)
    console.log(`💬 Collection ref:`, commentsRef.path)
    
    // Simple query: get all comments where shapeId matches
    // NOTE: Removed orderBy to avoid requiring a composite index - we'll sort client-side
    const q = query(
      commentsRef, 
      where('shapeId', '==', shapeId)
    )
    
    console.log(`💬 Query created, setting up onSnapshot...`)
    
    const unsubscribe = onSnapshot(
      q,
      {
        next: (snapshot) => {
          console.log(`✅ onSnapshot SUCCESS: ${snapshot.docs.length} comments`)
          console.log(`   Metadata:`, { fromCache: snapshot.metadata.fromCache, hasPendingWrites: snapshot.metadata.hasPendingWrites })
          
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
          
          // Sort comments by createdAt (client-side since orderBy would require a composite index)
          comments.sort((a, b) => {
            if (!a.createdAt) return 1
            if (!b.createdAt) return -1
            const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : 0
            const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : 0
            return timeA - timeB
          })
          
          console.log(`✅ Returning ${comments.length} sorted comments`)
          onUpdate(comments)
        },
        error: (error) => {
          console.error(`❌ onSnapshot ERROR for shape ${shapeId.slice(-6)}:`, error)
          console.error(`   Error code:`, error.code)
          console.error(`   Error message:`, error.message)
          if (onError) onError(error)
        }
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

