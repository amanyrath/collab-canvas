// ⚡ MINIMAL presence sidebar - just online users, no complex features
import React, { useEffect, useState } from 'react'
import { ref, onValue, set, onDisconnect } from 'firebase/database'
import { rtdb } from '../../utils/firebase'
import { useUserStore } from '../../store/userStore'

interface FastPresence {
  name: string
  color: string
  online: boolean
}

/**
 * ⚡ SUPER SIMPLE: Just shows who's online - minimal Firebase overhead
 */
export const FastPresenceSidebar: React.FC = () => {
  const { user } = useUserStore()
  const [users, setUsers] = useState<Record<string, FastPresence>>({})

  useEffect(() => {
    if (!user) return

    // ⚡ Set our presence + auto-cleanup on disconnect
    const userRef = ref(rtdb, `/presence/${user.uid}`)
    set(userRef, {
      name: user.displayName,
      color: user.cursorColor,
      online: true
    })
    
    // ⚡ Auto-cleanup cursors and presence on disconnect
    const cursorRef = ref(rtdb, `/cursors/${user.uid}`)
    onDisconnect(userRef).remove()
    onDisconnect(cursorRef).remove()

    // ⚡ Listen to all presence
    const presenceRef = ref(rtdb, '/presence')
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val() || {}
      // Only show online users
      const onlineUsers = Object.entries(data).reduce((acc, [uid, presence]) => {
        if ((presence as FastPresence).online) {
          acc[uid] = presence as FastPresence
        }
        return acc
      }, {} as Record<string, FastPresence>)
      setUsers(onlineUsers)
    })

    return () => unsubscribe()
  }, [user])

  const userList = Object.entries(users)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        👥 Online Users
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
          {userList.length}
        </span>
      </h3>
      
      <div className="space-y-2">
        {userList.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No users online</div>
        ) : (
          userList.map(([userId, userPresence]) => (
            <div key={userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              {/* User color dot */}
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: userPresence.color }}
              />
              
              {/* User name */}
              <span className="text-sm font-medium text-gray-900 truncate">
                {userPresence.name}
                {userId === user?.uid && (
                  <span className="text-xs text-blue-600 font-medium ml-1">(you)</span>
                )}
              </span>
              
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
