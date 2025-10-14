import React, { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../utils/firebase'
import { useUserStore } from '../../store/userStore'
import { clearAllShapes, clearAllLocks } from '../../utils/devUtils'

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useUserStore()
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleClearAllShapes = async () => {
    if (!confirm('⚠️ This will delete ALL shapes permanently. Are you sure?')) return
    
    setIsClearing(true)
    try {
      const result = await clearAllShapes()
      if (result.success) {
        alert(`✅ Successfully deleted ${result.deletedCount} shapes!`)
      } else {
        alert(`❌ Failed to clear shapes: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error}`)
    }
    setIsClearing(false)
    setShowAdminPanel(false)
  }

  const handleClearLocks = async () => {
    setIsClearing(true)
    try {
      const result = await clearAllLocks()
      if (result.success) {
        alert(`✅ Successfully cleared ${result.clearedCount} locks!`)
      } else {
        alert(`❌ Failed to clear locks: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error}`)
    }
    setIsClearing(false)
    setShowAdminPanel(false)
  }

  if (!isAuthenticated) return null

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-gray-800">CollabCanvas</h1>
        <div className="text-sm text-gray-500">
          Real-Time Collaborative Design Tool
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: user?.cursorColor }}
          ></div>
          <span className="text-sm font-medium text-gray-700">
            {user?.displayName}
          </span>
        </div>
        
        {/* Admin Panel Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded border border-gray-200 hover:border-red-300"
            title="Admin Panel"
          >
            🛠️
          </button>
          
          {showAdminPanel && (
            <div className="absolute right-0 top-8 bg-white border border-gray-300 rounded shadow-lg p-3 z-50 min-w-[200px]">
              <div className="text-xs font-medium text-gray-600 mb-2">Admin Panel</div>
              
              <button
                onClick={handleClearLocks}
                disabled={isClearing}
                className="w-full text-left text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50"
              >
                🔓 Clear All Locks
              </button>
              
              <button
                onClick={handleClearAllShapes}
                disabled={isClearing}
                className="w-full text-left text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
              >
                🗑️ Delete All Shapes
              </button>
              
              {isClearing && (
                <div className="text-xs text-gray-500 mt-2">Working...</div>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300 hover:border-gray-400"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}

export default Navbar
