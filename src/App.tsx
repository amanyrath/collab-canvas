import React from 'react'
import Auth from './components/Auth/Auth'
import Canvas from './components/Canvas/Canvas'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, isAuthenticated, isLoading, error } = useAuth()

  // Show loading state while initializing Firebase auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing Firebase...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if Firebase initialization failed
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-700 mb-4">
            Firebase configuration issue detected:
          </p>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">
            {error}
          </p>
          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">Required environment variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>VITE_FIREBASE_API_KEY</li>
              <li>VITE_FIREBASE_AUTH_DOMAIN</li>
              <li>VITE_FIREBASE_PROJECT_ID</li>
              <li>VITE_FIREBASE_STORAGE_BUCKET</li>
              <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>VITE_FIREBASE_APP_ID</li>
              <li>VITE_FIREBASE_DATABASE_URL</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? (
        // Show canvas workspace for authenticated users
        <div className="h-screen flex flex-col">
          {/* Header */}
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
              <Auth />
            </div>
          </header>

          {/* Canvas Area */}
          <main className="flex-1 p-4">
            <div className="h-full flex">
              {/* Main Canvas */}
              <div className="flex-1 mr-4">
                <Canvas width={800} height={600} />
              </div>
              
              {/* Sidebar */}
              <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Canvas Tools</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Click empty space to pan</div>
                  <div>• Mouse wheel to zoom</div>
                  <div>• Canvas size: 5000×5000px</div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Coming Next:</h4>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div>✅ Pan & Zoom</div>
                    <div>⏳ Shape Creation</div>
                    <div>⏳ Real-time Sync</div>
                    <div>⏳ Multiplayer Cursors</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      ) : (
        // Show authentication interface
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
            CollabCanvas MVP
          </h1>
          <div className="text-center mb-8">
            <p className="text-lg text-gray-600 mb-2">
              Real-Time Collaborative Design Tool
            </p>
            <p className="text-sm text-gray-500">
              Please sign in to continue
            </p>
          </div>
          <Auth />
        </div>
      )}
    </div>
  )
}

export default App
