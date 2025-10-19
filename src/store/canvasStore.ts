// Canvas store for managing shapes and selection (viewport handled by Konva Stage)
import { create } from 'zustand'
import { Shape } from '../utils/types'
import { historyManager } from '../utils/historyManager'

interface CanvasStore {
  // State - ✅ SIMPLIFIED: No selection state (selection = locking)
  shapes: Shape[]
  optimisticUpdates: Map<string, { timestamp: number; updates: Partial<Shape> }>
  
  // Actions
  addShape: (shape: Shape, recordHistory?: boolean) => void
  updateShape: (shapeId: string, updates: Partial<Shape>, recordHistory?: boolean) => void
  updateShapeOptimistic: (shapeId: string, updates: Partial<Shape>, recordHistory?: boolean) => void
  batchUpdateShapesOptimistic: (updates: Array<{ shapeId: string; updates: Partial<Shape> }>) => void
  deleteShape: (shapeId: string, recordHistory?: boolean) => void
  setShapes: (shapes: Shape[]) => void
  
  // Undo/Redo
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: () => boolean
  canRedo: () => boolean
}

const OPTIMISTIC_TIMEOUT = 2000 // 2 seconds to let Firestore sync catch up

export const useCanvasStore = create<CanvasStore>((set) => ({
  // ✅ SIMPLIFIED: Just shapes + optimistic update tracking
  shapes: [],
  optimisticUpdates: new Map(),

  // Shape management
  addShape: (shape, recordHistory = true) => set((state) => {
    if (recordHistory) {
      historyManager.addAction({
        type: 'add',
        timestamp: Date.now(),
        data: { shape }
      })
    }
    return {
    shapes: [...state.shapes, shape]
    }
  }),

  updateShape: (shapeId, updates, recordHistory = true) => set((state) => {
    if (recordHistory) {
      const shape = state.shapes.find(s => s.id === shapeId)
      if (shape) {
        // Record previous state for undo
        const previousState: Partial<Shape> = {}
        Object.keys(updates).forEach(key => {
          previousState[key as keyof Shape] = shape[key as keyof Shape]
        })
        
        historyManager.addAction({
          type: 'update',
          timestamp: Date.now(),
          data: {
            shapeId,
            previousState,
            newState: updates
          }
        })
      }
    }
    
    return {
    shapes: state.shapes.map(shape => 
      shape.id === shapeId ? { ...shape, ...updates } : shape
    )
    }
  }),

  // ✅ OPTIMISTIC: Immediate local update with protection from Firestore overrides
  updateShapeOptimistic: (shapeId, updates, recordHistory = true) => set((state) => {
    if (recordHistory) {
      const shape = state.shapes.find(s => s.id === shapeId)
      if (shape) {
        // Record previous state for undo
        const previousState: Partial<Shape> = {}
        Object.keys(updates).forEach(key => {
          previousState[key as keyof Shape] = shape[key as keyof Shape]
        })
        
        historyManager.addAction({
          type: 'update',
          timestamp: Date.now(),
          data: {
            shapeId,
            previousState,
            newState: updates
          }
        })
      }
    }
    
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

  // ✅ PERFORMANCE: Batch update multiple shapes in a single state update
  batchUpdateShapesOptimistic: (updates) => set((state) => {
    const newOptimisticUpdates = new Map(state.optimisticUpdates)
    const now = Date.now()
    
    // Create a map of shape ID to updates for O(1) lookup
    const updateMap = new Map<string, Partial<Shape>>()
    updates.forEach(({ shapeId, updates: shapeUpdates }) => {
      updateMap.set(shapeId, shapeUpdates)
      newOptimisticUpdates.set(shapeId, { timestamp: now, updates: shapeUpdates })
    })
    
    // Clean up old optimistic updates
    for (const [id, data] of newOptimisticUpdates.entries()) {
      if (now - data.timestamp > OPTIMISTIC_TIMEOUT) {
        newOptimisticUpdates.delete(id)
      }
    }
    
    // Single pass through shapes array - much faster than multiple updates
    const newShapes = state.shapes.map(shape => {
      const shapeUpdate = updateMap.get(shape.id)
      return shapeUpdate ? { ...shape, ...shapeUpdate } : shape
    })
    
    return {
      shapes: newShapes,
      optimisticUpdates: newOptimisticUpdates
    }
  }),

  deleteShape: (shapeId, recordHistory = true) => set((state) => {
    if (recordHistory) {
      const shape = state.shapes.find(s => s.id === shapeId)
      if (shape) {
        historyManager.addAction({
          type: 'delete',
          timestamp: Date.now(),
          data: { shape }
        })
      }
    }
    
    return {
    shapes: state.shapes.filter(shape => shape.id !== shapeId)
    }
  }),

  // ✅ SMART: Only accept Firestore updates if no recent optimistic update from current user
  setShapes: (shapes) => set((state) => {
    // ⚡ PERFORMANCE: Early return if no optimistic updates
    if (state.optimisticUpdates.size === 0) {
      return { shapes }
    }
    
    const now = Date.now()
    const protectedShapes = shapes.map(shape => {
      // ⚡ PERFORMANCE: Early return if no optimistic update for this shape
      const optimistic = state.optimisticUpdates.get(shape.id)
      if (!optimistic || now - optimistic.timestamp >= OPTIMISTIC_TIMEOUT) {
        return shape
      }
      
      // ⚡ PERFORMANCE: Only lookup current shape if needed
      const currentShape = state.shapes.find(s => s.id === shape.id)
      
      // ✅ MULTIPLAYER FIX: Don't block updates from other users
      // Only protect our own optimistic updates while we're actively editing
      // Check if this shape is locked by the current user
      const isLockedByCurrentUser = currentShape?.isLocked && 
                                     optimistic.updates.lockedBy && 
                                     currentShape?.lockedBy === optimistic.updates.lockedBy
      
      // Only protect if shape is being actively edited by current user
      if (isLockedByCurrentUser) {
        return { ...shape, ...optimistic.updates }
      }
      
      return shape
    })
    
    return { shapes: protectedShapes }
  }),

  // Undo/Redo operations
  undo: async () => {
    const action = historyManager.getUndoAction()
    if (!action) return

    const state = useCanvasStore.getState()
    
    switch (action.type) {
      case 'add':
        // Undo add = delete the shape from both store and Firebase
        if (action.data.shape) {
          const historyShapeId = action.data.shape.id
          
          // Try to find the shape - might have temp ID or real Firebase ID
          let actualShape = state.shapes.find(s => s.id === historyShapeId)
          
          // If not found with history ID, find by matching properties (position, type, color)
          if (!actualShape && historyShapeId.startsWith('temp-')) {
            const historyShape = action.data.shape
            actualShape = state.shapes.find(s => 
              s.x === historyShape.x && 
              s.y === historyShape.y && 
              s.type === historyShape.type &&
              s.fill === historyShape.fill &&
              s.createdBy === historyShape.createdBy
            )
          }
          
          if (!actualShape) {
            console.warn('Shape not found for undo, may have been already deleted')
            return
          }
          
          const actualShapeId = actualShape.id
          
          // Remove from local store immediately (without recording history)
          state.deleteShape(actualShapeId, false)
          
          // Delete from Firebase (async, don't block)
          import('../utils/shapeUtils').then(({ deleteShape }) => {
            deleteShape(actualShapeId).catch(err => {
              console.error('Failed to delete shape from Firebase during undo:', err)
              // Restore on error
              state.addShape(actualShape!, false)
            })
          })
        }
        break
        
      case 'update':
        // Undo update = restore previous state
        if (action.data.shapeId && action.data.previousState) {
          state.updateShapeOptimistic(action.data.shapeId, action.data.previousState, false)
          
          // Sync to Firebase
          import('../utils/shapeUtils').then(({ updateShape }) => {
            // Get current user from store
            import('./userStore').then(({ useUserStore }) => {
              const user = useUserStore.getState().user
              if (user) {
                updateShape(action.data.shapeId!, action.data.previousState!, user.uid).catch(err => {
                  console.error('Failed to update shape in Firebase during undo:', err)
                })
              }
            })
          })
        }
        break
        
      case 'delete':
        // Undo delete = restore the shape
        if (action.data.shape) {
          state.addShape(action.data.shape, false)
          
          // Recreate in Firebase
          import('../utils/shapeUtils').then(({ createShape }) => {
            const shape = action.data.shape!
            createShape(
              shape.x, 
              shape.y, 
              shape.type, 
              shape.fill, 
              shape.createdBy, 
              shape.createdBy
            ).catch(err => {
              console.error('Failed to recreate shape in Firebase during undo:', err)
              // Remove from store on error
              state.deleteShape(shape.id, false)
            })
          })
        }
        break
    }
  },

  redo: async () => {
    const action = historyManager.getRedoAction()
    if (!action) return

    const state = useCanvasStore.getState()
    
    switch (action.type) {
      case 'add':
        // Redo add = recreate the shape
        if (action.data.shape) {
          state.addShape(action.data.shape, false)
          
          // Recreate in Firebase
          import('../utils/shapeUtils').then(({ createShape }) => {
            const shape = action.data.shape!
            createShape(
              shape.x, 
              shape.y, 
              shape.type, 
              shape.fill, 
              shape.createdBy, 
              shape.createdBy
            ).catch(err => {
              console.error('Failed to recreate shape in Firebase during redo:', err)
              state.deleteShape(shape.id, false)
            })
          })
        }
        break
        
      case 'update':
        // Redo update = apply new state
        if (action.data.shapeId && action.data.newState) {
          state.updateShapeOptimistic(action.data.shapeId, action.data.newState, false)
          
          // Sync to Firebase
          import('../utils/shapeUtils').then(({ updateShape }) => {
            import('./userStore').then(({ useUserStore }) => {
              const user = useUserStore.getState().user
              if (user) {
                updateShape(action.data.shapeId!, action.data.newState!, user.uid).catch(err => {
                  console.error('Failed to update shape in Firebase during redo:', err)
                })
              }
            })
          })
        }
        break
        
      case 'delete':
        // Redo delete = delete from both store and Firebase
        if (action.data.shape) {
          const shapeId = action.data.shape.id
          state.deleteShape(shapeId, false)
          
          // Delete from Firebase
          import('../utils/shapeUtils').then(({ deleteShape }) => {
            deleteShape(shapeId).catch(err => {
              console.error('Failed to delete shape from Firebase during redo:', err)
              state.addShape(action.data.shape!, false)
            })
          })
        }
        break
    }
  },

  canUndo: () => historyManager.canUndo(),
  canRedo: () => historyManager.canRedo()
}))
