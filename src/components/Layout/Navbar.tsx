import React, { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../utils/firebase'
import { useUserStore } from '../../store/userStore'
import { useCanvasStore } from '../../store/canvasStore'
import { clearAllShapes, clearAllLocks, unlockUserShapes } from '../../utils/devUtils'
import { createShape, updateShape } from '../../utils/shapeUtils'

// Export canvas functionality will be passed as a prop
interface NavbarProps {
  onExportCanvas?: () => void
  onExportVisible?: () => void
  onCopyToClipboard?: () => void
}

const Navbar: React.FC<NavbarProps> = ({ onExportCanvas, onExportVisible, onCopyToClipboard }) => {
  const { user, isAuthenticated } = useUserStore()
  const shapes = useCanvasStore((state) => state.shapes)
  const bringToFront = useCanvasStore((state) => state.bringToFront)
  const sendToBack = useCanvasStore((state) => state.sendToBack)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [numShapes, setNumShapes] = useState(10)
  const [isCreating, setIsCreating] = useState(false)
  
  // 📐 LAYERS: Get selected (locked) shapes
  const selectedShapes = user ? shapes.filter(s => s.lockedBy === user.uid) : []
  const hasSelection = selectedShapes.length > 0

  const handleLogout = async () => {
    try {
      if (user) {
        // ✅ STEP 1: Unlock all shapes locked by this user
        try {
          await unlockUserShapes(user.uid)
          console.log('🔓 User locks removed before logout')
        } catch (err) {
          console.error('Failed to unlock user shapes:', err)
        }
        
        // ✅ STEP 2: Cleanup presence BEFORE signing out
        // This ensures we have permissions to delete our presence data
        const { cleanupPresence } = await import('../../utils/presenceUtils')
        await cleanupPresence(user.uid)
        console.log('🔴 Presence cleaned up before logout')
      }
      
      // ✅ STEP 3: Sign out
      await signOut(auth)
      console.log('🚪 User signed out successfully')
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
        // All shapes deleted successfully
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

  const handleCreateShapes = async () => {
    if (!user || isCreating) return
    
    setIsCreating(true)
    console.log(`🎨 Creating ${numShapes} random shapes...`)
    
    try {
      const shapeTypes = ['rectangle', 'circle'] as const
      const colors = ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377']
      
      const promises = []
      for (let i = 0; i < numShapes; i++) {
        const x = Math.random() * 4800 + 100 // Random position within bounds
        const y = Math.random() * 4800 + 100
        const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
        const color = colors[Math.floor(Math.random() * colors.length)]
        
        promises.push(createShape(x, y, type, color, user.uid, user.displayName))
      }
      
      await Promise.all(promises)
      console.log(`✅ Created ${numShapes} shapes successfully`)
      alert(`✅ Created ${numShapes} shapes!`)
    } catch (error) {
      console.error('Failed to create shapes:', error)
      alert('❌ Failed to create shapes. Check console for details.')
    } finally {
      setIsCreating(false)
      setShowAdminPanel(false)
    }
  }
  
  // 📐 LAYERS: Move selected shapes up one layer
  const handleBringToFront = async () => {
    if (!user || !hasSelection) return
    
    selectedShapes.forEach(shape => {
      const newZIndex = (shape.zIndex ?? 0) + 1
      bringToFront(shape.id)
      updateShape(shape.id, { zIndex: newZIndex }, user.uid)
    })
    console.log(`⬆️ Moved ${selectedShapes.length} shape(s) up one layer`)
  }
  
  // 📐 LAYERS: Move selected shapes down one layer
  const handleSendToBack = async () => {
    if (!user || !hasSelection) return
    
    selectedShapes.forEach(shape => {
      const newZIndex = (shape.zIndex ?? 0) - 1
      sendToBack(shape.id)
      updateShape(shape.id, { zIndex: newZIndex }, user.uid)
    })
    console.log(`⬇️ Moved ${selectedShapes.length} shape(s) down one layer`)
  }

  if (!isAuthenticated) return null

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">🍭 NorthPole</h1>
          <p className="text-xs text-gray-600">Real-Time Collaboration Tool For Santa's Helpers</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors text-sm font-medium"
            title="Export Canvas"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 top-10 bg-white border border-gray-300 rounded shadow-lg p-2 z-50 min-w-[200px]">
              <button
                onClick={() => {
                  onExportCanvas?.()
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <span>📥</span>
                <div>
                  <div className="font-medium">Full Canvas</div>
                  <div className="text-xs text-gray-500">Export entire canvas</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onExportVisible?.()
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <span>✂️</span>
                <div>
                  <div className="font-medium">Visible Area</div>
                  <div className="text-xs text-gray-500">Export trimmed to shapes</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onCopyToClipboard?.()
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <span>📋</span>
                <div>
                  <div className="font-medium">Copy to Clipboard</div>
                  <div className="text-xs text-gray-500">Copy as image</div>
                </div>
              </button>
            </div>
          )}
        </div>
      
        {/* 📐 LAYERS: Z-index controls */}
        {hasSelection && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded">
            <span className="text-xs text-blue-700 font-medium">
              {selectedShapes.length} selected
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleBringToFront}
                className="px-2 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-300 rounded transition-colors"
                title="Move Up One Layer (⌘])"
              >
                ⬆️ Up
              </button>
              <button
                onClick={handleSendToBack}
                className="px-2 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-300 rounded transition-colors"
                title="Move Down One Layer (⌘[)"
              >
                ⬇️ Down
              </button>
            </div>
          </div>
        )}
        
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
            <div className="absolute right-0 top-8 bg-white border border-gray-300 rounded shadow-lg p-3 z-50 min-w-[250px]">
              <div className="text-xs font-medium text-gray-600 mb-3">🛠️ Admin Panel</div>
              
              {/* Create Random Shapes */}
              <div className="mb-3 pb-3 border-b border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Create Random Shapes</div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={numShapes}
                    onChange={(e) => setNumShapes(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={isCreating}
                  />
                  <button
                    onClick={handleCreateShapes}
                    disabled={isCreating}
                    className="flex-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : '🎨 Create'}
                  </button>
                </div>
                <div className="text-[10px] text-gray-500">Random rects & circles</div>
              </div>
              
              {/* Utilities */}
              <button
                onClick={handleClearLocks}
                disabled={isClearing || isCreating}
                className="w-full text-left text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50 mb-1"
              >
                🔓 Clear All Locks
              </button>
              
              <button
                onClick={handleClearAllShapes}
                disabled={isClearing || isCreating}
                className="w-full text-left text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
              >
                🗑️ Delete All Shapes
              </button>
              
              {(isClearing || isCreating) && (
                <div className="text-xs text-gray-500 mt-2 text-center">Working...</div>
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

// Default props
Navbar.defaultProps = {
  onExportCanvas: undefined,
  onExportVisible: undefined,
  onCopyToClipboard: undefined
}
