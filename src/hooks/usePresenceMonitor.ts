// Hook to monitor user presence and cleanup locks for disconnected users
import { useEffect } from 'react'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { releaseAllUserLocks } from '../utils/lockUtils'

interface PresenceData {
  userId: string
  displayName: string
  online: boolean
  lastSeen: number
}

export const usePresenceMonitor = () => {
  useEffect(() => {
    const database = getDatabase()
    const presenceRef = ref(database, 'presence')
    
    const handlePresenceChange = (snapshot: any) => {
      if (!snapshot.exists()) return
      
      const presenceData = snapshot.val()
      
      // Check for users who went offline and clean up their locks
      Object.entries(presenceData).forEach(([userId, data]: [string, any]) => {
        const user = data as PresenceData
        
        if (!user.online && Date.now() - user.lastSeen > 5000) { // 5 second grace period
          console.log(`👻 Detected offline user: ${user.displayName}, cleaning up locks`)
          releaseAllUserLocks(userId).catch(error => {
            console.error('Failed to cleanup locks for offline user:', error)
          })
        }
      })
    }
    
    // Listen for presence changes
    onValue(presenceRef, handlePresenceChange)
    
    return () => {
      off(presenceRef, 'value', handlePresenceChange)
    }
  }, [])
}
