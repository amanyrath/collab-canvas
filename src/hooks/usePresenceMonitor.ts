// Hook to monitor user presence and cleanup locks for disconnected users
import { useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { rtdb } from '../utils/firebase'
import { releaseAllUserLocks } from '../utils/lockUtils'

export const usePresenceMonitor = () => {
  useEffect(() => {
    console.log('🔄 Starting presence monitoring for lock cleanup')
    const presenceRef = ref(rtdb, '/sessions/global-canvas-v1')
    
    // Track users across snapshots to detect disconnections
    let previousUserIds = new Set<string>()
    
    const handlePresenceChange = (snapshot: any) => {
      const presenceData = snapshot.val() || {}
      const currentUserIds = new Set(Object.keys(presenceData))
      
      // Find users who disappeared (disconnected) - their data was removed
      previousUserIds.forEach(userId => {
        if (!currentUserIds.has(userId)) {
          console.log(`👻 User disconnected: ${userId}, cleaning up locks`)
          releaseAllUserLocks(userId).catch(error => {
            console.error('Failed to cleanup locks for disconnected user:', error)
          })
        }
      })
      
      // Update tracking for next snapshot
      previousUserIds = currentUserIds
    }
    
    // Listen for presence changes
    const unsubscribe = onValue(presenceRef, handlePresenceChange, (error) => {
      console.error('❌ Presence monitoring error:', error)
    })
    
    return () => {
      console.log('🔄 Stopping presence monitoring')
      unsubscribe()
    }
  }, [])
}
