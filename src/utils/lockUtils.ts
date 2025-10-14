// Firestore transaction-based locking utilities
import { doc, runTransaction, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore'
// Removed unused Firebase Realtime DB imports - presence is handled in presenceUtils.ts
import { db } from './firebase'
import { updateCurrentlyEditing } from './presenceUtils'

const SHAPES_COLLECTION = 'canvas/global-canvas-v1/shapes'

export interface LockResult {
  success: boolean
  error?: string
  alreadyLocked?: boolean
  lockedBy?: string
}

// Acquire lock on a shape using Firestore transaction (this IS selection)
export const acquireLock = async (
  shapeId: string, 
  userId: string, 
  displayName: string,
  cursorColor: string
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
      
      // Acquire lock atomically (this IS selection)
      transaction.update(shapeRef, {
        isLocked: true,
        lockedBy: userId,
        lockedByName: displayName,
        lockedByColor: cursorColor,
        lastModifiedBy: userId,
        lastModifiedAt: serverTimestamp()
      })
      
      console.log(`🔒 Lock acquired by ${displayName} for shape:`, shapeId)
      
      // ✅ PHASE 8: Update presence to show what user is editing
      updateCurrentlyEditing(userId, shapeId).catch(error => {
        console.warn('Failed to update currently editing status:', error)
      })
      
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
        lockedByName: null,
        lockedByColor: null,
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
      
      // ✅ PHASE 8: Update presence to show user is no longer editing
      updateCurrentlyEditing(userId, null).catch(error => {
        console.warn('Failed to clear currently editing status:', error)
      })
      
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

// ✅ REMOVED: setupDisconnectCleanup - now handled by initializePresence() in presenceUtils.ts

// ✅ REMOVED: syncShapeSelection (selection = locking now)

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
          
          // ✅ PHASE 8: Clear currently editing status when force releasing locks
          updateCurrentlyEditing(userId, null).catch(error => {
            console.warn('Failed to clear currently editing status on force unlock:', error)
          })
        }
      })
    })
    
    await Promise.all(unlockPromises)
    console.log(`✅ Released ${snapshot.docs.length} locks for user: ${userId}`)
  } catch (error) {
    console.error('Error force releasing user locks:', error)
  }
}
