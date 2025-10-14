// Connection status banner component
import React from 'react'
import { useConnectionStatus } from '../hooks/useConnectionStatus'

/**
 * Banner that appears when Firebase connection is lost
 * Automatically hides when reconnected
 */
export const ConnectionBanner: React.FC = () => {
  const { isOnline, isConnecting } = useConnectionStatus()

  // ✅ Only show when offline or reconnecting
  if (isOnline && !isConnecting) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
      <div className="flex items-center justify-center gap-2">
        {/* ✅ BUILT-IN: CSS animations for loading spinner */}
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        
        <span>
          {isConnecting ? 'Reconnecting...' : 'Connection lost - trying to reconnect'}
        </span>
      </div>
      
      <div className="text-xs mt-1 opacity-90">
        Changes will sync when connection is restored
      </div>
    </div>
  )
}

export default ConnectionBanner
