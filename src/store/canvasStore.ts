// Canvas store for managing shapes and selection (viewport handled by Konva Stage)
import { create } from 'zustand'
import { Shape } from '../utils/types'

interface CanvasStore {
  // State - ✅ SIMPLIFIED: No selection state (selection = locking)
  shapes: Shape[]
  
  // Actions
  addShape: (shape: Shape) => void
  updateShape: (shapeId: string, updates: Partial<Shape>) => void
  deleteShape: (shapeId: string) => void
  setShapes: (shapes: Shape[]) => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // ✅ SIMPLIFIED: Just shapes (selection handled via isLocked/lockedBy)
  shapes: [],

  // Shape management
  addShape: (shape) => set((state) => ({
    shapes: [...state.shapes, shape]
  })),

  updateShape: (shapeId, updates) => set((state) => ({
    shapes: state.shapes.map(shape => 
      shape.id === shapeId ? { ...shape, ...updates } : shape
    )
  })),

  deleteShape: (shapeId) => set((state) => ({
    shapes: state.shapes.filter(shape => shape.id !== shapeId)
  })),

  setShapes: (shapes) => set({ shapes })
}))
