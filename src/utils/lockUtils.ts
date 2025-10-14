// Firestore transaction-based locking utilities
import { doc, runTransaction, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore'
import { getDatabase, ref, onDisconnect, set } from 'firebase/database'
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
        console.log(`📍 Updating position in releaseLock: (${finalPosition.x}, ${finalPosition.y})`)
      }
      
      transaction.update(shapeRef, updates)
      
      console.log(`🔓 Lock released by ${displayName} for shape:`, shapeId, finalPosition ? `with position (${finalPosition.x}, ${finalPosition.y})` : 'without position update')
      
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

// Set up automatic lock cleanup on user disconnect
export const setupDisconnectCleanup = async (userId: string, displayName: string) => {
  try {
    const database = getDatabase()
    const userPresenceRef = ref(database, `presence/${userId}`)
    
    // Set user as online
    await set(userPresenceRef, {
      userId,
      displayName,
      online: true,
      lastSeen: Date.now()
    })
    
    // Set up disconnect cleanup - clear presence and trigger lock cleanup
    await onDisconnect(userPresenceRef).set({
      userId,
      displayName,
      online: false,
      lastSeen: Date.now()
    })
    
    console.log(`🔒 Set up disconnect cleanup for user: ${displayName}`)
  } catch (error) {
    console.error('Error setting up disconnect cleanup:', error)
  }
}

// Force release all locks held by a user (for disconnect cleanup)
export const releaseAllUserLocks = async (userId: string) => {
  try {
    console.log(`🧹 Force releasing all locks for user: ${userId}`)
    
    const shapesRef = collection(db, SHAPES_COLLECTION)
    const lockedShapesQuery = query(shapesRef, where('lockedBy', '==', userId))
    const snapshot = await getDocs(lockedShapesQuery)
    
    const unlockPromises = snapshot.docs.map(async (shapeDoc) => {
      const shapeRef = doc(db, SHAPES_COLLECTION, shapeDoc.id)
      
      return runTransaction(db, async (transaction) => {
        const currentDoc = await transaction.get(shapeRef)
        if (currentDoc.exists() && currentDoc.data().lockedBy === userId) {
          transaction.update(shapeRef, {
            isLocked: false,
            lockedBy: null,
            lastModifiedAt: serverTimestamp()
          })
          console.log(`🔓 Force unlocked shape: ${shapeDoc.id}`)
        }
      })
    })
    
    await Promise.all(unlockPromises)
    console.log(`✅ Released ${snapshot.docs.length} locks for user: ${userId}`)
  } catch (error) {
    console.error('Error force releasing user locks:', error)
  }
}
