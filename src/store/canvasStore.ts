// Canvas store for managing shapes, selection, and viewport state
import { create } from 'zustand'
import { Shape, ViewportState } from '../utils/types'

interface CanvasStore {
  // State
  shapes: Shape[]
  selectedShapeId: string | null
  viewport: ViewportState
  
  // Actions
  addShape: (shape: Shape) => void
  updateShape: (shapeId: string, updates: Partial<Shape>) => void
  deleteShape: (shapeId: string) => void
  setShapes: (shapes: Shape[]) => void
  
  // Selection
  selectShape: (shapeId: string | null) => void
  getSelectedShape: () => Shape | null
  
  // Viewport
  setViewport: (viewport: Partial<ViewportState>) => void
  resetViewport: () => void
}

const initialViewport: ViewportState = {
  x: 0,
  y: 0,
  scale: 1
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  shapes: [],
  selectedShapeId: null,
  viewport: initialViewport,

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
  },

  // Viewport management
  setViewport: (updates) => set((state) => ({
    viewport: { ...state.viewport, ...updates }
  })),

  resetViewport: () => set({ viewport: initialViewport })
}))
