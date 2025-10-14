import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Development utility to clear all locks and reset canvas state
 * Use this when locks get stuck during testing
 */
export const clearAllLocks = async () => {
  try {
    console.log('🧹 Clearing all locks...')
    
    const shapesRef = collection(db, 'canvas/global-canvas-v1/shapes')
    const snapshot = await getDocs(shapesRef)
    
    const updatePromises = snapshot.docs.map(async (shapeDoc) => {
      const shapeRef = doc(db, 'canvas/global-canvas-v1/shapes', shapeDoc.id)
      await updateDoc(shapeRef, {
        isLocked: false,
        lockedBy: null
      })
      console.log(`🔓 Cleared lock for shape: ${shapeDoc.id}`)
    })
    
    await Promise.all(updatePromises)
    
    console.log(`✅ Cleared ${snapshot.docs.length} locks successfully!`)
    return { success: true, clearedCount: snapshot.docs.length }
  } catch (error) {
    console.error('❌ Error clearing locks:', error)
    return { success: false, error }
  }
}

/**
 * Development utility to delete all shapes and reset canvas
 * Use this for a complete fresh start
 */
export const clearAllShapes = async () => {
  try {
    console.log('🗑️ Clearing all shapes...')
    
    const shapesRef = collection(db, 'canvas/global-canvas-v1/shapes')
    const snapshot = await getDocs(shapesRef)
    
    const deletePromises = snapshot.docs.map(async (shapeDoc) => {
      const shapeRef = doc(db, 'canvas/global-canvas-v1/shapes', shapeDoc.id)
      await deleteDoc(shapeRef)
      console.log(`🗑️ Deleted shape: ${shapeDoc.id}`)
    })
    
    await Promise.all(deletePromises)
    
    console.log(`✅ Deleted ${snapshot.docs.length} shapes successfully!`)
    return { success: true, deletedCount: snapshot.docs.length }
  } catch (error) {
    console.error('❌ Error clearing shapes:', error)
    return { success: false, error }
  }
}

// Make these available globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).clearAllLocks = clearAllLocks;
  (window as any).clearAllShapes = clearAllShapes;
  console.log('🛠️ Dev utils loaded! Use clearAllLocks() or clearAllShapes() in console')
}
