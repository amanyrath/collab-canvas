// Firestore transaction-based locking utilities
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const SHAPES_COLLECTION = 'canvas/global-canvas-v1/shapes'

export interface LockResult {
  success: boolean
  error?: string
  alreadyLocked?: boolean
  lockedBy?: string
}

// Acquire lock on a shape using Firestore transaction
export const acquireLock = async (
  shapeId: string, 
  userId: string, 
  displayName: string
): Promise<LockResult> => {
  try {
    const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
    
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
      
      // Acquire lock atomically
      transaction.update(shapeRef, {
        isLocked: true,
        lockedBy: userId,
        lastModifiedBy: userId,
        lastModifiedAt: serverTimestamp()
      })
      
      console.log(`🔒 Lock acquired by ${displayName} for shape:`, shapeId)
      
      return {
        success: true
      }
    })
    
    return result
  } catch (error) {
    console.error('Error acquiring lock:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Release lock on a shape using Firestore transaction
export const releaseLock = async (
  shapeId: string, 
  userId: string, 
  displayName: string,
  finalPosition?: { x: number; y: number }
): Promise<LockResult> => {
  try {
    const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
    
    const result = await runTransaction(db, async (transaction) => {
      const shapeDoc = await transaction.get(shapeRef)
      
      if (!shapeDoc.exists()) {
        throw new Error('Shape not found')
      }
      
      const shapeData = shapeDoc.data()
      
      // Only release if we own the lock
      if (shapeData.lockedBy !== userId) {
        console.warn('Cannot release lock not owned by user')
        return {
          success: false,
          error: 'Lock not owned by user'
        }
      }
      
      // Release lock and optionally update position
      const updates: any = {
        isLocked: false,
        lockedBy: null,
        lastModifiedBy: userId,
        lastModifiedAt: serverTimestamp()
      }
      
      if (finalPosition) {
        updates.x = finalPosition.x
        updates.y = finalPosition.y
      }
      
      transaction.update(shapeRef, updates)
      
      console.log(`🔓 Lock released by ${displayName} for shape:`, shapeId)
      
      return {
        success: true
      }
    })
    
    return result
  } catch (error) {
    console.error('Error releasing lock:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Force release all locks held by a user (for disconnect cleanup)
export const releaseAllUserLocks = async (displayName: string) => {
  try {
    // Note: This would require a collection query and batch update
    // For MVP, we'll handle this with onDisconnect in Realtime Database
    console.log(`🧹 Releasing all locks for user: ${displayName}`)
    
    // Implementation would go here for production
    // This is a placeholder for the basic lock cleanup
    
  } catch (error) {
    console.error('Error releasing user locks:', error)
  }
}
