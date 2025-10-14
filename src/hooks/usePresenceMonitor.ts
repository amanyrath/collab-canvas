// Hook to monitor user presence and cleanup locks for disconnected users
import { useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { rtdb } from '../utils/firebase'
import { releaseAllUserLocks } from '../utils/lockUtils'
import type { PresenceData } from '../utils/presenceUtils'

export const usePresenceMonitor = () => {
  useEffect(() => {
    console.log('🔄 Starting presence monitoring for lock cleanup')
    const presenceRef = ref(rtdb, '/sessions/global-canvas-v1')
    
    const handlePresenceChange = (snapshot: any) => {
      if (!snapshot.exists()) return
      
      const presenceData = snapshot.val()
      
      // Check for users who went offline and clean up their locks
      Object.entries(presenceData).forEach(([userId, data]: [string, any]) => {
        const user = data as PresenceData
        
        // ✅ Use correct isOnline field and lastSeen timestamp
        if (!user.isOnline && user.lastSeen && typeof user.lastSeen === 'number') {
          const timeSinceLastSeen = Date.now() - user.lastSeen
          if (timeSinceLastSeen > 5000) { // 5 second grace period
            console.log(`👻 Detected offline user: ${user.displayName}, cleaning up locks`)
            releaseAllUserLocks(userId).catch(error => {
              console.error('Failed to cleanup locks for offline user:', error)
            })
          }
        }
      })
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
