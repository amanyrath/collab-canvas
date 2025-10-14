// Hook to manage Firestore shape synchronization
import { useEffect } from 'react'
import { subscribeToShapes } from '../utils/shapeUtils'
import { useCanvasStore } from '../store/canvasStore'

export const useShapeSync = () => {
  const { setShapes } = useCanvasStore()

  useEffect(() => {
    console.log('🔄 Setting up shape sync...')
    
    // Subscribe to Firestore shapes collection
    const unsubscribe = subscribeToShapes(
      (shapes) => {
        // Update Zustand store with shapes from Firestore
        setShapes(shapes)
        console.log(`📦 Loaded ${shapes.length} shapes from Firestore`)
      },
      (error) => {
        console.error('❌ Shape sync error:', error)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      console.log('🔄 Cleaning up shape sync...')
      unsubscribe?.()
    }
  }, [setShapes])
}
