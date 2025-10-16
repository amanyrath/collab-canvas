// ⚡ MINIMAL presence sidebar - just online users, no complex features
import React, { useEffect, useState } from 'react'
import { subscribeToPresence, type PresenceData } from '../../utils/presenceUtils'
import { useUserStore } from '../../store/userStore'

/**
 * ⚡ SUPER SIMPLE: Just shows who's online - minimal Firebase overhead
 */
export const FastPresenceSidebar: React.FC = () => {
  const { user } = useUserStore()
  const [users, setUsers] = useState<Record<string, PresenceData>>({})

  useEffect(() => {
    if (!user) return

    // ⚡ UNIFIED: Use the centralized presence system
    // Since we now REMOVE presence data entirely on disconnect,
    // all entries in presenceData are online users (no need to filter)
    const unsubscribe = subscribeToPresence((presenceData) => {
      setUsers(presenceData)
    })

    return unsubscribe
  }, [user])

  // Filter out current user and entries without valid display names
  const userList = Object.entries(users).filter(([userId, userPresence]) => 
    userId !== user?.uid && userPresence.displayName && userPresence.displayName.trim() !== ''
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        👥 Other Users
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
          {userList.length}
        </span>
      </h3>
      
      <div className="space-y-2">
        {userList.length === 0 ? (
          <div className="text-xs text-gray-500 italic">
            No other users online
          </div>
        ) : (
          userList.map(([userId, userPresence]) => (
            <div key={userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              {/* User color dot */}
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: userPresence.cursorColor }}
              />
              
              {/* User name */}
              <span className="text-sm font-medium text-gray-900 truncate">
                {userPresence.displayName}
              </span>
              
              {/* Editing status indicator */}
              {userPresence.currentlyEditing && (
                <span className="text-xs text-orange-600">✏️</span>
              )}
              
              {/* Online indicator */}
              <div className="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default FastPresenceSidebar
