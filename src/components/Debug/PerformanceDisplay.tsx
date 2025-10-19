import React, { useState, useEffect } from 'react'
import { getPerformanceStats } from '../../utils/performanceMonitor'

interface PerformanceStats {
  currentFps: number
  averageFps: number
  minFps: number
  maxFps: number
  firestoreReads: number
  firestoreWrites: number
  rtdbUpdates: number
  isHealthy: boolean
  performanceGrade: string
}

const PerformanceDisplay: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development mode
    if (!import.meta.env.DEV) return

    const interval = setInterval(() => {
      setStats(getPerformanceStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Toggle visibility with keyboard shortcut (Ctrl/Cmd + P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && e.shiftKey) {
        e.preventDefault()
        setIsVisible(!isVisible)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  if (!import.meta.env.DEV || !isVisible || !stats) return null

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600'
      case 'B': return 'text-blue-600'
      case 'C': return 'text-yellow-600'
      case 'D': return 'text-orange-600'
      case 'F': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-green-600'
    if (fps >= 40) return 'text-blue-600'
    if (fps >= 30) return 'text-yellow-600'
    if (fps >= 20) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-90 text-white p-3 rounded-lg shadow-lg font-mono text-xs max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      {/* FPS Stats */}
      <div className="mb-3">
        <div className="flex justify-between items-center">
          <span>FPS:</span>
          <div className="flex items-center gap-2">
            <span className={getFpsColor(stats.currentFps)}>
              {stats.currentFps}
            </span>
            <span className={`font-bold ${getGradeColor(stats.performanceGrade)}`}>
              {stats.performanceGrade}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Avg:</span>
          <span className={getFpsColor(stats.averageFps)}>
            {stats.averageFps}
          </span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Range:</span>
          <span>
            {stats.minFps}-{stats.maxFps}
          </span>
        </div>
      </div>

      {/* Firebase Stats */}
      <div className="border-t border-gray-600 pt-2">
        <div className="text-gray-300 mb-1">Firebase (5s window):</div>
        <div className="flex justify-between">
          <span>Reads:</span>
          <span className="text-blue-400">{stats.firestoreReads}</span>
        </div>
        <div className="flex justify-between">
          <span>Writes:</span>
          <span className="text-green-400">{stats.firestoreWrites}</span>
        </div>
        <div className="flex justify-between">
          <span>RTDB:</span>
          <span className="text-yellow-400">{stats.rtdbUpdates}</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="border-t border-gray-600 pt-2 mt-2">
        <div className="flex items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              stats.isHealthy ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          <span className={stats.isHealthy ? 'text-green-400' : 'text-red-400'}>
            {stats.isHealthy ? 'Healthy' : 'Performance Issues'}
          </span>
        </div>
      </div>

      {/* Toggle instructions */}
      <div className="border-t border-gray-600 pt-2 mt-2 text-gray-400 text-xs">
        Ctrl/Cmd + Shift + P to toggle
      </div>
    </div>
  )
}

export default PerformanceDisplay

