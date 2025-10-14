// Firebase Realtime Database presence and cursor utilities
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, off } from 'firebase/database'
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
 * ✅ SIMPLIFIED: Initialize user presence in Realtime DB
 */
export const initializePresence = async (user: User): Promise<void> => {
  const database = getDatabase()
  const presenceRef = ref(database, `/sessions/global-canvas-v1/${user.uid}`)
  
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
  
  // ✅ BUILT-IN: Set presence data
  await set(presenceRef, presenceData)
  
  // ✅ BUILT-IN: Auto-cleanup on disconnect
  const disconnectRef = onDisconnect(presenceRef)
  await disconnectRef.set({
    ...presenceData,
    isOnline: false,
    lastSeen: serverTimestamp(),
    currentlyEditing: null
  })
  
  console.log(`🟢 Presence initialized for ${user.displayName}`)
}

/**
 * ✅ SIMPLIFIED: Update cursor position (no redundant fields)
 */
export const updateCursorPosition = async (
  userId: string, 
  x: number, 
  y: number, 
  currentlyEditing: string | null = null
): Promise<void> => {
  const database = getDatabase()
  
  // ✅ BUILT-IN: Partial update - only what changed
  const updates: any = {
    [`/sessions/global-canvas-v1/${userId}/cursorX`]: x,
    [`/sessions/global-canvas-v1/${userId}/cursorY`]: y,
    [`/sessions/global-canvas-v1/${userId}/lastSeen`]: serverTimestamp(),
    [`/sessions/global-canvas-v1/${userId}/isOnline`]: true
  }
  
  if (currentlyEditing !== undefined) {
    updates[`/sessions/global-canvas-v1/${userId}/currentlyEditing`] = currentlyEditing
  }
  
  await set(ref(database), updates)
}

/**
 * Update currently editing shape
 */
export const updateCurrentlyEditing = async (userId: string, shapeId: string | null): Promise<void> => {
  const database = getDatabase()
  const editingRef = ref(database, `/sessions/global-canvas-v1/${userId}/currentlyEditing`)
  
  await set(editingRef, shapeId)
  console.log(`📝 User ${userId} now editing: ${shapeId || 'nothing'}`)
}

/**
 * Subscribe to all user presence data
 */
export const subscribeToPresence = (
  callback: (presenceData: Record<string, PresenceData>) => void
): (() => void) => {
  const database = getDatabase()
  const presenceRef = ref(database, '/sessions/global-canvas-v1')
  
  // ✅ BUILT-IN: Real-time presence updates
  onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() || {}
    callback(data)
  })
  
  // Return cleanup function
  return () => off(presenceRef)
}

/**
 * Cleanup user presence on logout
 */
export const cleanupPresence = async (userId: string): Promise<void> => {
  const database = getDatabase()
  const presenceRef = ref(database, `/sessions/global-canvas-v1/${userId}`)
  
  // ✅ Set offline status instead of removing (for graceful cleanup)
  await set(presenceRef, {
    isOnline: false,
    lastSeen: serverTimestamp(),
    currentlyEditing: null
  })
  
  console.log(`🔴 Presence cleaned up for user: ${userId}`)
}
