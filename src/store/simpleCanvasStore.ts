import { create } from 'zustand'
import { Shape } from '../utils/types'

interface CanvasState {
  // ✅ SIMPLIFIED: No viewport state - Konva Stage is source of truth
  shapes: Shape[]
  selectedShapeId: string | null
  
  // Actions
  setShapes: (shapes: Shape[]) => void
  addShape: (shape: Shape) => void
  updateShape: (id: string, updates: Partial<Shape>) => void
  deleteShape: (id: string) => void
  selectShape: (id: string | null) => void
}

export const useSimpleCanvasStore = create<CanvasState>((set, get) => ({
  // ✅ REMOVED: viewport, setViewport (60+ lines eliminated!)
  shapes: [],
  selectedShapeId: null,

  setShapes: (shapes) => set({ shapes }),
  
  addShape: (shape) => set((state) => ({ 
    shapes: [...state.shapes, shape] 
  })),
  
  updateShape: (id, updates) => set((state) => ({
    shapes: state.shapes.map(shape => 
      shape.id === id ? { ...shape, ...updates } : shape
    )
  })),
  
  deleteShape: (id) => set((state) => ({
    shapes: state.shapes.filter(shape => shape.id !== id),
    selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId
  })),
  
  selectShape: (id) => set({ selectedShapeId: id })
}))
