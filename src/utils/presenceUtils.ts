// Firebase Realtime Database presence and cursor utilities with error handling
import { ref, set, onValue, onDisconnect, serverTimestamp, update } from 'firebase/database'
import { rtdb } from './firebase' // Use our configured database instance
import type { User } from './types'
import { logRTDBUpdate } from './performanceMonitor'
import { FirebaseErrorHandler } from './errorHandling'

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
 * ✅ PHASE 8: Initialize user presence in Realtime DB with error handling
 */
export const initializePresence = async (user: User): Promise<void> => {
  return FirebaseErrorHandler.withRetry(async () => {
    logRTDBUpdate('initializePresence')
    
    console.log(`🟢 Initializing presence for ${user.displayName}`)
    
    const presenceRef = ref(rtdb, `/sessions/global-canvas-v1/${user.uid}`)
    
    const presenceData: PresenceData = {
      userId: user.uid,
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      cursorColor: user.cursorColor, // ✅ Use existing user color
      cursorX: 300, // Start cursor at a more visible position
      cursorY: 200, // Start cursor at a more visible position  
      lastSeen: serverTimestamp(),
      isOnline: true,
      currentlyEditing: null
    }
    
    // ✅ BUILT-IN: Set presence data
    await set(presenceRef, presenceData)
    
    // ✅ CRITICAL: Remove presence data entirely on disconnect
    // This ensures cursors and sidebar entries disappear immediately
    const disconnectRef = onDisconnect(presenceRef)
    await disconnectRef.remove()
    
    console.log(`✅ Presence initialized for ${user.displayName} with auto-cleanup`)
  }, { maxRetries: 3 })
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
    logRTDBUpdate('updateCursorPosition')
    
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
  logRTDBUpdate('updateCurrentlyEditing')
  
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
      // Silent updates - too noisy to log
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
 * ✅ PHASE 8: Cleanup user presence on logout with error handling
 */
export const cleanupPresence = async (userId: string): Promise<void> => {
  return FirebaseErrorHandler.withRetry(async () => {
    const { remove } = await import('firebase/database')
    const presenceRef = ref(rtdb, `/sessions/global-canvas-v1/${userId}`)
    
    // ✅ REMOVE: Delete presence data entirely on manual logout
    // This immediately removes cursor and sidebar entry
    await remove(presenceRef)
    
    console.log(`🔴 Presence removed for user: ${userId}`)
  }, { maxRetries: 2 })
}
