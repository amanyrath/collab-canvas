import Auth from './components/Auth/Auth'
import Canvas from './components/Canvas/Canvas'
import Navbar from './components/Layout/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import ConnectionBanner from './components/ConnectionBanner'
import PresenceSidebar from './components/Canvas/PresenceSidebar'

// Load dev utils in development mode
if (import.meta.env.DEV) {
  import('./utils/devUtils')
}

function App() {
  // Authentication fallback component
  const authFallback = (
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
  )

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* ✅ PHASE 9: Connection status banner */}
        <ConnectionBanner />
        
        <ProtectedRoute fallback={authFallback}>
          {/* Authenticated user interface */}
          <div className="h-screen flex flex-col">
            {/* Header */}
            <Navbar />

            {/* Canvas Area */}
            <main className="flex-1 p-4">
              <div className="h-full flex">
                {/* Main Canvas - Wrapped in additional Error Boundary for canvas-specific errors */}
                <ErrorBoundary fallback={
                  <div className="flex-1 mr-4 bg-white rounded-lg border border-red-200 p-8 text-center">
                    <div className="text-4xl mb-4">🎨</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Canvas Error</h3>
                    <p className="text-gray-600 mb-4">The canvas encountered an error. Try refreshing the page.</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Reload Canvas
                    </button>
                  </div>
                }>
                  <div className="flex-1 mr-4">
                    <Canvas width={1200} height={800} />
                  </div>
                </ErrorBoundary>
              
              {/* Sidebar */}
              <div className="w-64 space-y-4">
                {/* ✅ PHASE 8: Presence sidebar */}
                <PresenceSidebar />
                
                {/* Canvas tools */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Canvas Tools</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• <strong>Click empty space</strong> → Create rectangles</div>
                  <div>• <strong>Click & drag shapes</strong> → Move them</div>
                  <div>• <strong>Click shapes</strong> → Select/lock them</div>
                  <div>• <strong>Trackpad scroll</strong> → Pan canvas (Figma-style)</div>
                  <div>• <strong>⌘/Ctrl + scroll</strong> → Zoom (or pinch)</div>
                  <div>• <strong>Mouse wheel</strong> → Zoom</div>
                  <div>• <strong>Space + drag</strong> → Pan (power users)</div>
                  <div>• <strong>Delete key</strong> → Delete selected shape</div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Progress:</h4>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div>✅ Canvas & Figma-style Navigation</div>
                    <div>✅ Shape Creation & Real-time Sync</div>
                    <div>✅ Selection & Multiplayer Locking</div>
                    <div>✅ Drag & Drop with Constraints</div>
                    <div>✅ Shape Deletion (optimistic)</div>
                    <div>✅ Error Handling & Connection Status</div>
                    <div>✅ Multiplayer Cursors & Presence</div>
                  </div>
                </div>
                
                {import.meta.env.DEV && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-2">🛠️ Dev Tools:</h4>
                    <div className="space-y-1 text-xs text-yellow-700">
                      <div>Open console and run:</div>
                      <code className="block bg-yellow-100 p-1 rounded mt-1">clearAllLocks()</code>
                      <div className="text-xs">Clear stuck locks</div>
                    </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    </div>
    </ErrorBoundary>
  )
}

export default App
