// Sidebar showing online users and their editing status
import React, { useEffect, useState } from 'react'
import { subscribeToPresence, type PresenceData } from '../../utils/presenceUtils'
import { useUserStore } from '../../store/userStore'

/**
 * Sidebar component showing all online users with their editing status
 * Updates in real-time as users join/leave or start/stop editing
 */
export const PresenceSidebar: React.FC = () => {
  const { user } = useUserStore()
  const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({})

  // ✅ BUILT-IN: Subscribe to real-time presence updates
  useEffect(() => {
    const unsubscribe = subscribeToPresence((data) => {
      // Filter for online users only
      const onlineUsers = Object.entries(data).reduce((acc, [userId, presence]) => {
        if (presence.isOnline) {
          acc[userId] = presence
        }
        return acc
      }, {} as Record<string, PresenceData>)
      
      setPresenceData(onlineUsers)
    })

    return unsubscribe
  }, [])

  const onlineUsers = Object.values(presenceData)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        👥 Online Users
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
          {onlineUsers.length}
        </span>
      </h3>
      
      <div className="space-y-2">
        {onlineUsers.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No users online</div>
        ) : (
          onlineUsers.map((presence) => (
            <UserPresenceItem 
              key={presence.userId} 
              presence={presence}
              isCurrentUser={presence.userId === user?.uid}
            />
          ))
        )}
      </div>
      
      {/* ✅ Connection indicator */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Real-time connected</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Individual user presence item
 */
interface UserPresenceItemProps {
  presence: PresenceData
  isCurrentUser: boolean
}

const UserPresenceItem: React.FC<UserPresenceItemProps> = ({ presence, isCurrentUser }) => {
  const { displayName, cursorColor, currentlyEditing } = presence
  
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${
      isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
    }`}>
      {/* User color indicator */}
      <div 
        className="w-3 h-3 rounded-full border border-white shadow-sm"
        style={{ backgroundColor: cursorColor }}
      />
      
      <div className="flex-1 min-w-0">
        {/* User name */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-blue-600 font-medium">(you)</span>
          )}
        </div>
        
        {/* Editing status */}
        <div className="text-xs text-gray-500">
          {currentlyEditing ? (
            <div className="flex items-center gap-1">
              <span>✏️</span>
              <span>Editing shape</span>
            </div>
          ) : (
            <span>👀 Viewing canvas</span>
          )}
        </div>
      </div>
      
      {/* Online indicator */}
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    </div>
  )
}

export default PresenceSidebar
