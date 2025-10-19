import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import { performanceMonitor, getPerformanceStats } from './performanceMonitor'

/**
 * Development utility to clear all locks and reset canvas state
 * Use this when locks get stuck during testing
 * Only clears shapes that are actually locked
 */
export const clearAllLocks = async () => {
  try {
    console.log('🧹 Clearing all locks...')
    
    const shapesRef = collection(db, 'canvas/global-canvas-v1/shapes')
    const snapshot = await getDocs(shapesRef)
    
    // Filter to only locked shapes
    const lockedShapes = snapshot.docs.filter(doc => {
      const data = doc.data()
      return data.isLocked === true
    })
    
    console.log(`Found ${lockedShapes.length} locked shapes out of ${snapshot.docs.length} total shapes`)
    
    if (lockedShapes.length === 0) {
      console.log('✅ No locks to clear!')
      return { success: true, clearedCount: 0 }
    }
    
    const updatePromises = lockedShapes.map(async (shapeDoc) => {
      const shapeRef = doc(db, 'canvas/global-canvas-v1/shapes', shapeDoc.id)
      const data = shapeDoc.data()
      await updateDoc(shapeRef, {
        isLocked: false,
        lockedBy: null,
        lockedByName: null,
        lockedByColor: null
      })
      console.log(`🔓 Cleared lock for shape: ${shapeDoc.id} (was locked by: ${data.lockedByName || 'unknown'})`)
    })
    
    await Promise.all(updatePromises)
    
    console.log(`✅ Cleared ${lockedShapes.length} locks successfully!`)
    return { success: true, clearedCount: lockedShapes.length }
  } catch (error) {
    console.error('❌ Error clearing locks:', error)
    return { success: false, error }
  }
}

/**
 * Unlock all shapes locked by a specific user
 * Used for cleanup when a user signs out
 */
export const unlockUserShapes = async (userId: string) => {
  try {
    console.log(`🔓 Unlocking shapes for user: ${userId}`)
    
    const shapesRef = collection(db, 'canvas/global-canvas-v1/shapes')
    const snapshot = await getDocs(shapesRef)
    
    // Filter to only shapes locked by this user
    const userLockedShapes = snapshot.docs.filter(doc => {
      const data = doc.data()
      return data.isLocked === true && data.lockedBy === userId
    })
    
    if (userLockedShapes.length === 0) {
      console.log('✅ No locks to clear for this user')
      return { success: true, clearedCount: 0 }
    }
    
    console.log(`Found ${userLockedShapes.length} shapes locked by this user`)
    
    const updatePromises = userLockedShapes.map(async (shapeDoc) => {
      const shapeRef = doc(db, 'canvas/global-canvas-v1/shapes', shapeDoc.id)
      await updateDoc(shapeRef, {
        isLocked: false,
        lockedBy: null,
        lockedByName: null,
        lockedByColor: null
      })
      console.log(`🔓 Unlocked shape: ${shapeDoc.id}`)
    })
    
    await Promise.all(updatePromises)
    
    console.log(`✅ Unlocked ${userLockedShapes.length} shapes for user: ${userId}`)
    return { success: true, clearedCount: userLockedShapes.length }
  } catch (error) {
    console.error('❌ Error unlocking user shapes:', error)
    return { success: false, error }
  }
}

/**
 * Development utility to delete all shapes and reset canvas
 * Use this for a complete fresh start
 * Note: Cannot delete shapes locked by other users
 */
export const clearAllShapes = async () => {
  try {
    console.log('🗑️ Clearing all shapes...')
    
    const shapesRef = collection(db, 'canvas/global-canvas-v1/shapes')
    const snapshot = await getDocs(shapesRef)
    
    let deletedCount = 0
    let lockedCount = 0
    const lockedByOthers: Array<{ id: string; lockedBy: string; lockedByName?: string }> = []
    
    // Delete shapes one by one to handle permission errors gracefully
    for (const shapeDoc of snapshot.docs) {
      try {
        const shapeRef = doc(db, 'canvas/global-canvas-v1/shapes', shapeDoc.id)
        await deleteDoc(shapeRef)
        console.log(`🗑️ Deleted shape: ${shapeDoc.id}`)
        deletedCount++
      } catch (error: any) {
        // Permission denied - likely locked by another user
        if (error?.code === 'permission-denied') {
          const data = shapeDoc.data()
          lockedCount++
          lockedByOthers.push({
            id: shapeDoc.id,
            lockedBy: data.lockedBy || 'unknown',
            lockedByName: data.lockedByName
          })
          console.log(`🔒 Cannot delete shape ${shapeDoc.id}: locked by ${data.lockedByName || 'another user'}`)
        } else {
          throw error // Re-throw unexpected errors
        }
      }
    }
    
    if (lockedCount > 0) {
      const message = `Deleted ${deletedCount} shapes. ${lockedCount} shape(s) could not be deleted because they are locked by other users.`
      console.log(`⚠️ ${message}`)
      return { 
        success: true, 
        deletedCount, 
        lockedCount, 
        lockedByOthers,
        message 
      }
    }
    
    console.log(`✅ Deleted ${deletedCount} shapes successfully!`)
    return { success: true, deletedCount, lockedCount: 0 }
  } catch (error) {
    console.error('❌ Error clearing shapes:', error)
    return { success: false, error }
  }
}

/**
 * Performance testing utility
 */
export const startPerformanceTest = async () => {
  console.log('🚀 Starting performance test...')
  
  const stats = getPerformanceStats()
  console.log('📊 Initial stats:', stats)
  
  console.log('📦 Performance test simulation (check FPS impact)...')
  const startTime = performance.now()
  
  // Simulate intensive operations
  for (let i = 0; i < 1000; i++) {
    // Simulate DOM operations
    const div = document.createElement('div')
    div.style.transform = `translate(${Math.random() * 1000}px, ${Math.random() * 1000}px)`
    document.body.appendChild(div)
    document.body.removeChild(div)
  }
  
  const endTime = performance.now()
  console.log(`⏱️ Test completed in ${(endTime - startTime).toFixed(2)}ms`)
  
  // Log performance after test
  setTimeout(() => {
    const finalStats = getPerformanceStats()
    console.log('📊 Final stats:', finalStats)
    console.log('📈 Performance impact:', {
      'FPS Change': finalStats.currentFps - stats.currentFps,
      'Avg FPS Change': finalStats.averageFps - stats.averageFps
    })
  }, 2000)
}

/**
 * Memory usage logging utility
 */
export const logMemoryUsage = () => {
  performanceMonitor.logMemoryUsage()
}

/**
 * Get current performance statistics
 */
export const getStats = () => {
  const stats = getPerformanceStats()
  console.table(stats)
  return stats
}
// Make these available globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).clearAllLocks = clearAllLocks;
  (window as any).clearAllShapes = clearAllShapes;
  (window as any).getPerformanceStats = getStats;
  (window as any).startPerformanceTest = startPerformanceTest;
  (window as any).logMemoryUsage = logMemoryUsage;
  
  console.log('🛠️ Dev utils loaded! Available commands:')
  console.log('  clearAllLocks() - Clear all shape locks')
  console.log('  clearAllShapes() - Delete all shapes') 
  console.log('  getPerformanceStats() - Get current performance metrics')
  console.log('  startPerformanceTest() - Run performance test')
  console.log('  logMemoryUsage() - Log current memory usage')
}
