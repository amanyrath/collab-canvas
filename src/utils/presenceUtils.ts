// Firebase Realtime Database presence and cursor utilities
import { ref, set, onValue, onDisconnect, serverTimestamp, update } from 'firebase/database'
import { rtdb } from './firebase' // Use our configured database instance
import type { User } from './types'

export interface PresenceData {
  userId: string
  displayName: string
  email: string
  cursorColor: string
  cursorX: number
  cursorY: number
  lastSeen: any // Firebase serverTimestamp
  isOnline: boolean
  currentlyEditing: string | null // shapeId or null
}

/**
 * ✅ REMOVED: Use userStore's simpler color generation instead
 */

/**
 * ✅ PHASE 8: Initialize user presence in Realtime DB
 */
export const initializePresence = async (user: User): Promise<void> => {
  try {
    console.log('🔄 Initializing presence for:', user.displayName, user.uid)
    
    const presenceRef = ref(rtdb, `/sessions/global-canvas-v1/${user.uid}`)
    
    const presenceData: PresenceData = {
      userId: user.uid,
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      cursorColor: user.cursorColor, // ✅ Use existing user color
      cursorX: 0,
      cursorY: 0,
      lastSeen: serverTimestamp(),
      isOnline: true,
      currentlyEditing: null
    }
    
    console.log('📝 Writing presence data:', presenceData)
    
    // ✅ BUILT-IN: Set presence data
    await set(presenceRef, presenceData)
    
    // ✅ BUILT-IN: Auto-cleanup on disconnect
    const disconnectRef = onDisconnect(presenceRef)
    await disconnectRef.update({
      isOnline: false,
      lastSeen: serverTimestamp(),
      currentlyEditing: null
    })
    
    console.log(`🟢 Presence initialized successfully for ${user.displayName}`)
  } catch (error) {
    console.error('❌ Failed to initialize presence:', error)
    throw error
  }
}

/**
 * ✅ PHASE 8: Update cursor position (optimized)
 */
export const updateCursorPosition = async (
  userId: string, 
  x: number, 
  y: number, 
  currentlyEditing: string | null = null
): Promise<void> => {
  try {
    const userRef = ref(rtdb, `/sessions/global-canvas-v1/${userId}`)
    
    // ✅ BUILT-IN: Partial update - only what changed  
    const updates: any = {
      cursorX: x,
      cursorY: y,
      lastSeen: serverTimestamp(),
      isOnline: true
    }
    
    if (currentlyEditing !== undefined) {
      updates.currentlyEditing = currentlyEditing
    }
    
    await update(userRef, updates)
  } catch (error) {
    console.error('❌ Failed to update cursor position:', error)
    // Don't throw - cursor updates should be non-blocking
  }
}

/**
 * ✅ PHASE 8: Update currently editing shape
 */
export const updateCurrentlyEditing = async (userId: string, shapeId: string | null): Promise<void> => {
  try {
    const editingRef = ref(rtdb, `/sessions/global-canvas-v1/${userId}/currentlyEditing`)
    await set(editingRef, shapeId)
    console.log(`📝 User ${userId} now editing: ${shapeId || 'nothing'}`)
  } catch (error) {
    console.error('❌ Failed to update currently editing:', error)
  }
}

/**
 * ✅ PHASE 8: Subscribe to all user presence data
 */
export const subscribeToPresence = (
  callback: (presenceData: Record<string, PresenceData>) => void
): (() => void) => {
  console.log('🔄 Subscribing to presence updates...')
  
  const presenceRef = ref(rtdb, '/sessions/global-canvas-v1')
  
  // ✅ BUILT-IN: Real-time presence updates
  const unsubscribe = onValue(presenceRef, 
    (snapshot) => {
      const data = snapshot.val() || {}
      console.log('📡 Presence update received:', Object.keys(data).length, 'users')
      callback(data)
    },
    (error) => {
      console.error('❌ Presence subscription error:', error)
    }
  )
  
  // Return cleanup function
  return () => {
    console.log('🔄 Unsubscribing from presence updates')
    unsubscribe()
  }
}

/**
 * ✅ PHASE 8: Cleanup user presence on logout
 */
export const cleanupPresence = async (userId: string): Promise<void> => {
  try {
    const presenceRef = ref(rtdb, `/sessions/global-canvas-v1/${userId}`)
    
    // ✅ Set offline status instead of removing (for graceful cleanup)
    await update(presenceRef, {
      isOnline: false,
      lastSeen: serverTimestamp(),
      currentlyEditing: null
    })
    
    console.log(`🔴 Presence cleaned up for user: ${userId}`)
  } catch (error) {
    console.error('❌ Failed to cleanup presence:', error)
  }
}
