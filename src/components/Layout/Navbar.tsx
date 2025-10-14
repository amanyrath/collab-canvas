import React from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../utils/firebase'
import { useUserStore } from '../../store/userStore'

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useUserStore()

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
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
