// History Manager for Undo/Redo functionality
import { Shape } from './types'

export interface HistoryAction {
  type: 'add' | 'update' | 'delete' | 'batch'
  timestamp: number
  data: {
    shapeId?: string
    shape?: Shape
    previousState?: Partial<Shape>
    newState?: Partial<Shape>
    shapes?: Shape[] // For batch operations
    deletedShapes?: Shape[] // For batch delete undo
  }
}

class HistoryManager {
  private undoStack: HistoryAction[] = []
  private redoStack: HistoryAction[] = []
  private maxHistorySize = 100

  // Add an action to history
  addAction(action: HistoryAction) {
    this.undoStack.push(action)
    
    // Clear redo stack when new action is performed
    this.redoStack = []
    
    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
  }

  // Get the last action to undo
  getUndoAction(): HistoryAction | null {
    if (this.undoStack.length === 0) return null
    const action = this.undoStack.pop()!
    this.redoStack.push(action)
    return action
  }

  // Get the last action to redo
  getRedoAction(): HistoryAction | null {
    if (this.redoStack.length === 0) return null
    const action = this.redoStack.pop()!
    this.undoStack.push(action)
    return action
  }

  // Check if undo is available
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  // Check if redo is available
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  // Clear all history
  clear() {
    this.undoStack = []
    this.redoStack = []
  }

  // Get history stats (for debugging)
  getStats() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    }
  }

  // Update a shape ID in history (for optimistic -> real ID transitions)
  updateShapeId(oldId: string, newId: string) {
    // Update in undo stack
    this.undoStack.forEach(action => {
      if (action.data.shapeId === oldId) {
        action.data.shapeId = newId
      }
      if (action.data.shape?.id === oldId && action.data.shape) {
        action.data.shape.id = newId
      }
    })
    
    // Update in redo stack
    this.redoStack.forEach(action => {
      if (action.data.shapeId === oldId) {
        action.data.shapeId = newId
      }
      if (action.data.shape?.id === oldId && action.data.shape) {
        action.data.shape.id = newId
      }
    })
  }
}

// Singleton instance
export const historyManager = new HistoryManager()

