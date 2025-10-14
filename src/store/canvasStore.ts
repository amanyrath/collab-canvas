// Canvas store for managing shapes and selection (viewport handled by Konva Stage)
import { create } from 'zustand'
import { Shape } from '../utils/types'

interface CanvasStore {
  // State - ✅ SIMPLIFIED: No selection state (selection = locking)
  shapes: Shape[]
  optimisticUpdates: Map<string, { timestamp: number; updates: Partial<Shape> }>
  
  // Actions
  addShape: (shape: Shape) => void
  updateShape: (shapeId: string, updates: Partial<Shape>) => void
  updateShapeOptimistic: (shapeId: string, updates: Partial<Shape>) => void
  deleteShape: (shapeId: string) => void
  setShapes: (shapes: Shape[]) => void
}

const OPTIMISTIC_TIMEOUT = 2000 // 2 seconds to let Firestore sync catch up

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // ✅ SIMPLIFIED: Just shapes + optimistic update tracking
  shapes: [],
  optimisticUpdates: new Map(),

  // Shape management
  addShape: (shape) => set((state) => ({
    shapes: [...state.shapes, shape]
  })),

  updateShape: (shapeId, updates) => set((state) => ({
    shapes: state.shapes.map(shape => 
      shape.id === shapeId ? { ...shape, ...updates } : shape
    )
  })),

  // ✅ OPTIMISTIC: Immediate local update with protection from Firestore overrides
  updateShapeOptimistic: (shapeId, updates) => set((state) => {
    // Track this optimistic update
    const newOptimisticUpdates = new Map(state.optimisticUpdates)
    newOptimisticUpdates.set(shapeId, { timestamp: Date.now(), updates })
    
    // Clean up old optimistic updates
    const now = Date.now()
    for (const [id, data] of newOptimisticUpdates.entries()) {
      if (now - data.timestamp > OPTIMISTIC_TIMEOUT) {
        newOptimisticUpdates.delete(id)
      }
    }
    
    return {
      shapes: state.shapes.map(shape => 
        shape.id === shapeId ? { ...shape, ...updates } : shape
      ),
      optimisticUpdates: newOptimisticUpdates
    }
  }),

  deleteShape: (shapeId) => set((state) => ({
    shapes: state.shapes.filter(shape => shape.id !== shapeId)
  })),

  // ✅ SMART: Only accept Firestore updates if no recent optimistic update
  setShapes: (shapes) => set((state) => {
    const now = Date.now()
    const protectedShapes = shapes.map(shape => {
      const optimistic = state.optimisticUpdates.get(shape.id)
      
      // If we have a recent optimistic update, don't override it
      if (optimistic && now - optimistic.timestamp < OPTIMISTIC_TIMEOUT) {
        return { ...shape, ...optimistic.updates }
      }
      
      return shape
    })
    
    return { shapes: protectedShapes }
  })
}))
