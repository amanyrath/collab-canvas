import Auth from './components/Auth/Auth'
import Canvas from './components/Canvas/Canvas'
import Navbar from './components/Layout/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

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
    <div className="min-h-screen bg-gray-50">
      <ProtectedRoute fallback={authFallback}>
        {/* Authenticated user interface */}
        <div className="h-screen flex flex-col">
          {/* Header */}
          <Navbar />

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
                  <div>• Left-click empty space to create rectangles</div>
                  <div>• Left-drag rectangles to move them</div>
                  <div>• Left-click shapes to select them</div>
                  <div>• Middle-click drag to pan (Ctrl+drag on Mac)</div>
                  <div>• Mouse wheel to zoom</div>
                  <div>• Canvas size: 5000×5000px</div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Phase 5 Progress:</h4>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div>✅ Pan & Zoom</div>
                    <div>✅ Shape Creation</div>
                    <div>✅ Real-time Sync</div>
                    <div>✅ Drag & Drop</div>
                    <div>✅ Transaction Locking</div>
                    <div>✅ Middle-click Pan</div>
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
          </main>
        </div>
      </ProtectedRoute>
    </div>
  )
}

export default App
