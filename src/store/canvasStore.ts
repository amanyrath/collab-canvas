// Canvas store for managing shapes and selection (viewport handled by Konva Stage)
import { create } from 'zustand'
import { Shape } from '../utils/types'

interface CanvasStore {
  // State
  shapes: Shape[]
  selectedShapeId: string | null
  
  // Actions
  addShape: (shape: Shape) => void
  updateShape: (shapeId: string, updates: Partial<Shape>) => void
  deleteShape: (shapeId: string) => void
  setShapes: (shapes: Shape[]) => void
  
  // Selection
  selectShape: (shapeId: string | null) => void
  getSelectedShape: () => Shape | null
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // ✅ SIMPLIFIED: Initial state (no viewport - Konva Stage is source of truth)
  shapes: [],
  selectedShapeId: null,

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
    shapes: state.shapes.filter(shape => shape.id !== shapeId),
    selectedShapeId: state.selectedShapeId === shapeId ? null : state.selectedShapeId
  })),

  setShapes: (shapes) => set({ shapes }),

  // Selection management
  selectShape: (shapeId) => set({ selectedShapeId: shapeId }),
  
  getSelectedShape: () => {
    const { shapes, selectedShapeId } = get()
    return selectedShapeId ? shapes.find(shape => shape.id === selectedShapeId) || null : null
  }
}))
