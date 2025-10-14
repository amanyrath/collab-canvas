/**
 * Performance monitoring utilities for development
 */

class PerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 0
  private isRunning = false
  private animationId?: number
  private fpsHistory: number[] = []
  private readonly maxHistorySize = 60 // Keep 1 second of history at 60fps
  
  // Firebase operation counters
  private firestoreReads = 0
  private firestoreWrites = 0
  private rtdbUpdates = 0
  private lastFirebaseLogTime = performance.now()

  constructor() {
    // Only run in development mode
    if (import.meta.env.DEV) {
      this.start()
    }
  }

  private start() {
    if (this.isRunning) return
    
    this.isRunning = true
    this.lastTime = performance.now()
    this.frameCount = 0
    
    console.log('🚀 Performance monitoring started')
    this.animate()
  }

  private animate = () => {
    if (!this.isRunning) return

    const currentTime = performance.now()
    this.frameCount++

    // Calculate FPS every second
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      this.frameCount = 0
      this.lastTime = currentTime

      // Add to history
      this.fpsHistory.push(this.fps)
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift()
      }

      // Update browser title with FPS
      this.updateTitle()

      // Log warning if FPS is low
      if (this.fps < 30) {
        console.warn(`⚠️ Low FPS detected: ${this.fps} fps`)
        
        // Calculate average FPS over last 5 seconds
        const recentFps = this.fpsHistory.slice(-5)
        const avgFps = recentFps.reduce((sum, fps) => sum + fps, 0) / recentFps.length
        
        if (avgFps < 25) {
          console.warn(`🔴 Consistently low FPS: ${avgFps.toFixed(1)} fps average`)
        }
      }

      // Log Firebase operations every 5 seconds
      if (currentTime - this.lastFirebaseLogTime >= 5000) {
        this.logFirebaseStats()
        this.lastFirebaseLogTime = currentTime
      }
    }

    this.animationId = requestAnimationFrame(this.animate)
  }

  private updateTitle() {
    if (!import.meta.env.DEV) return
    
    const originalTitle = 'CollabCanvas'
    const avgFps = this.fpsHistory.length > 0 
      ? (this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length).toFixed(0)
      : this.fps.toString()
    
    document.title = `${originalTitle} | ${this.fps}fps (avg: ${avgFps})`
  }

  private logFirebaseStats() {
    const timeSinceLastLog = (performance.now() - this.lastFirebaseLogTime) / 1000
    
    console.log(`📊 Firebase Operations (last ${timeSinceLastLog.toFixed(1)}s):`, {
      'Firestore Reads': this.firestoreReads,
      'Firestore Writes': this.firestoreWrites, 
      'Realtime DB Updates': this.rtdbUpdates,
      'Read Rate': `${(this.firestoreReads / timeSinceLastLog).toFixed(1)}/s`,
      'Write Rate': `${(this.firestoreWrites / timeSinceLastLog).toFixed(1)}/s`,
      'RTDB Rate': `${(this.rtdbUpdates / timeSinceLastLog).toFixed(1)}/s`
    })

    // Reset counters
    this.firestoreReads = 0
    this.firestoreWrites = 0
    this.rtdbUpdates = 0
  }

  // Public methods for tracking Firebase operations
  logFirestoreRead(operation: string, docCount: number = 1) {
    if (!import.meta.env.DEV) return
    this.firestoreReads += docCount
    console.log(`📖 Firestore Read: ${operation} (${docCount} docs)`)
  }

  logFirestoreWrite(operation: string, docCount: number = 1) {
    if (!import.meta.env.DEV) return
    this.firestoreWrites += docCount
    console.log(`✍️ Firestore Write: ${operation} (${docCount} docs)`)
  }

  logRTDBUpdate(operation: string) {
    if (!import.meta.env.DEV) return
    this.rtdbUpdates++
    console.log(`🔄 Realtime DB Update: ${operation}`)
  }

  // Get current performance stats
  getStats() {
    const avgFps = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
      : this.fps

    return {
      currentFps: this.fps,
      averageFps: Math.round(avgFps * 10) / 10,
      minFps: Math.min(...this.fpsHistory),
      maxFps: Math.max(...this.fpsHistory),
      firestoreReads: this.firestoreReads,
      firestoreWrites: this.firestoreWrites,
      rtdbUpdates: this.rtdbUpdates
    }
  }

  stop() {
    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    // Restore original title
    document.title = 'CollabCanvas'
    console.log('🛑 Performance monitoring stopped')
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export convenience methods
export const logFirestoreRead = (operation: string, docCount?: number) => 
  performanceMonitor.logFirestoreRead(operation, docCount)

export const logFirestoreWrite = (operation: string, docCount?: number) => 
  performanceMonitor.logFirestoreWrite(operation, docCount)

export const logRTDBUpdate = (operation: string) => 
  performanceMonitor.logRTDBUpdate(operation)

export const getPerformanceStats = () => 
  performanceMonitor.getStats()
