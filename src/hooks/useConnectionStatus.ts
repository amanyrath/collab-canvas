// Firebase connection status monitoring hook
import { useEffect, useState } from 'react'
import { getDatabase, ref, onValue } from 'firebase/database'

export interface ConnectionStatus {
  isOnline: boolean
  isConnecting: boolean
  lastConnected: Date | null
}

/**
 * Hook to monitor Firebase Realtime Database connection status
 * Uses Firebase's built-in .info/connected endpoint
 */
export const useConnectionStatus = (): ConnectionStatus => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: true, // Optimistic default
    isConnecting: false,
    lastConnected: null
  })

  useEffect(() => {
    const database = getDatabase()
    const connectedRef = ref(database, '.info/connected')
    
    // ✅ BUILT-IN: Firebase connection monitoring
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val() === true
      const now = new Date()
      
      setStatus(prev => ({
        isOnline: isConnected,
        isConnecting: !isConnected && prev.isOnline, // Was online, now disconnected
        lastConnected: isConnected ? now : prev.lastConnected
      }))

      if (isConnected) {
        console.log('🟢 Firebase connected')
      } else {
        console.log('🔴 Firebase disconnected - showing reconnection banner')
      }
    })

    return () => unsubscribe()
  }, [])

  return status
}
