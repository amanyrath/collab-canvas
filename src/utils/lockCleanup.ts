/**
 * Automatic lock cleanup system
 * Monitors user presence and unlocks shapes when users disconnect
 * 
 * How it works:
 * 1. User presence in RTDB already has onDisconnect() that removes their entry
 * 2. This monitor watches for presence removals
 * 3. When a user goes offline, it automatically unlocks all their shapes in Firestore
 */
import { ref, onValue } from 'firebase/database'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { rtdb, db } from './firebase'

/**
 * Initialize lock cleanup monitor
 * Watches for users going offline and unlocks their shapes
 */
export const initializeLockCleanup = () => {
  console.log('🔍 Initializing automatic lock cleanup monitor...')
  
  const presenceRef = ref(rtdb, '/sessions/global-canvas-v1')
  
  // Track currently online users
  const onlineUsers = new Set<string>()
  
  const unsubscribe = onValue(presenceRef, async (snapshot) => {
    const presenceData = snapshot.val() || {}
    const currentOnlineUsers = new Set(Object.keys(presenceData))
    
    // Find users who just went offline
    const offlineUsers = Array.from(onlineUsers).filter(
      userId => !currentOnlineUsers.has(userId)
    )
    
    // Unlock shapes for offline users
    for (const userId of offlineUsers) {
      console.log(`👤 User ${userId} went offline, unlocking their shapes...`)
      await unlockShapesForUser(userId)
    }
    
    // Update online users set
    onlineUsers.clear()
    currentOnlineUsers.forEach(userId => onlineUsers.add(userId))
  })
  
  console.log('✅ Lock cleanup monitor initialized')
  return unsubscribe
}

/**
 * Unlock all shapes locked by a specific user
 * Used when a user disconnects
 */
async function unlockShapesForUser(userId: string) {
  try {
    const shapesRef = collection(db, 'canvas/global-canvas-v1/shapes')
    const q = query(shapesRef, where('lockedBy', '==', userId))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      console.log(`✅ No locked shapes found for user ${userId}`)
      return
    }
    
    console.log(`🔓 Unlocking ${snapshot.docs.length} shapes for user ${userId}`)
    
    const updatePromises = snapshot.docs.map(async (shapeDoc) => {
      const shapeRef = doc(db, 'canvas/global-canvas-v1/shapes', shapeDoc.id)
      await updateDoc(shapeRef, {
        isLocked: false,
        lockedBy: null,
        lockedByName: null,
        lockedByColor: null
      })
      console.log(`🔓 Auto-unlocked shape: ${shapeDoc.id}`)
    })
    
    await Promise.all(updatePromises)
    console.log(`✅ Successfully unlocked ${snapshot.docs.length} shapes for disconnected user`)
  } catch (error) {
    console.error(`❌ Error unlocking shapes for user ${userId}:`, error)
  }
}
