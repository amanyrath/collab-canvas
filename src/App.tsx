import Auth from './components/Auth/Auth'
import Canvas from './components/Canvas/Canvas'
import Navbar from './components/Layout/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import ConnectionBanner from './components/ConnectionBanner'
import FastPresenceSidebar from './components/Canvas/FastPresenceSidebar'
import PerformanceDisplay from './components/Debug/PerformanceDisplay'

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
        
        {/* ✅ DEV: Performance monitoring display */}
        <PerformanceDisplay />
        
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
                {/* ⚡ Presence sidebar */}
                <FastPresenceSidebar />
                
                {/* Shortcuts */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Shortcuts</h3>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div><strong>Click</strong> → Create shape</div>
                    <div><strong>Shift+Drag</strong> → Marquee select</div>
                    <div><strong>Shift+Click</strong> → Multi-select</div>
                    <div><strong>⌘/Ctrl+A</strong> → Select all</div>
                    <div><strong>Delete</strong> → Delete selected</div>
                    <div><strong>Space+Drag</strong> → Pan canvas</div>
                    <div><strong>Scroll</strong> → Zoom/Pan</div>
                  </div>
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
