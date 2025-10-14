import React from 'react'
import Auth from './components/Auth/Auth'
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          CollabCanvas MVP
        </h1>
        
        {isAuthenticated ? (
          // Show authenticated user interface
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-green-600 mb-2">
                🎉 Firebase Connected!
              </h2>
              <p className="text-gray-600">
                Welcome back, <span className="font-semibold">{user?.displayName}</span>!
              </p>
              <div className="mt-2 text-sm text-gray-500">
                User ID: {user?.uid}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Cursor Color: <span 
                  className="inline-block w-4 h-4 rounded-full ml-1 align-middle"
                  style={{ backgroundColor: user?.cursorColor }}
                ></span> {user?.cursorColor}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-4">
                Real-Time Collaborative Design Tool
              </p>
              <p className="text-sm text-gray-500">
                Ready to build the canvas component! 🚀
              </p>
            </div>
          </div>
        ) : (
          // Show authentication interface
          <div>
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
    </div>
  )
}

export default App
