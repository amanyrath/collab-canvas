// Firestore utilities for shape management
import { 
  collection, 
  doc, 
  onSnapshot, 
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc
} from 'firebase/firestore'
import { db } from './firebase'
import { Shape } from './types'
import { v4 as uuidv4 } from 'uuid'
import { logFirestoreRead, logFirestoreWrite } from './performanceMonitor'

// Firestore collection path for shapes
const SHAPES_COLLECTION = 'canvas/global-canvas-v1/shapes'

// Create a new shape in Firestore
export const createShape = async (
  x: number, 
  y: number, 
  createdBy: string,
  displayName: string
): Promise<string> => {
  logFirestoreWrite('createShape')
  
  try {
    const shapeId = uuidv4()
    const shapesRef = collection(db, SHAPES_COLLECTION)
    
    const newShape: Omit<Shape, 'id'> = {
      type: 'rectangle',
      x,
      y,
      width: 100, // Default size from PRD
      height: 100,
      fill: '#CCCCCC', // Fixed gray fill from PRD
      text: '',
      textColor: '#000000',
      fontSize: 14,
      createdBy,
      createdAt: serverTimestamp(),
      lastModifiedBy: createdBy,
      lastModifiedAt: serverTimestamp(),
      isLocked: false,
      lockedBy: null
    }
    
    // Use custom document ID
    await setDoc(doc(shapesRef, shapeId), newShape)
    
    console.log(`🎯 Shape created by ${displayName}:`, shapeId)
    return shapeId
  } catch (error) {
    console.error('Error creating shape:', error)
    throw error
  }
}

// Subscribe to shapes collection changes
export const subscribeToShapes = (
  onShapesChange: (shapes: Shape[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const shapesRef = collection(db, SHAPES_COLLECTION)
    const shapesQuery = query(shapesRef, orderBy('createdAt', 'asc'))
    
    const unsubscribe = onSnapshot(
      shapesQuery,
      (snapshot) => {
        logFirestoreRead('subscribeToShapes', snapshot.size)
        
        const shapes: Shape[] = []
        
        snapshot.forEach((doc) => {
          if (doc.exists()) {
            shapes.push({
              id: doc.id,
              ...doc.data()
            } as Shape)
          }
        })
        
        console.log(`🔄 Shapes synced: ${shapes.length} total`)
        onShapesChange(shapes)
      },
      (error) => {
        console.error('Error subscribing to shapes:', error)
        onError?.(error)
      }
    )
    
    return unsubscribe
  } catch (error) {
    console.error('Error setting up shapes subscription:', error)
    throw error
  }
}

// Update shape properties
export const updateShape = async (
  shapeId: string, 
  updates: Partial<Omit<Shape, 'id' | 'createdBy' | 'createdAt'>>,
  userId: string
) => {
  logFirestoreWrite('updateShape')
  
  try {
    const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
    
    await updateDoc(shapeRef, {
      ...updates,
      lastModifiedBy: userId,
      lastModifiedAt: serverTimestamp()
    })
    
    console.log(`📝 Shape updated:`, shapeId)
  } catch (error) {
    console.error('Error updating shape:', error)
    throw error
  }
}

// Delete shape from Firestore
export const deleteShape = async (shapeId: string) => {
  logFirestoreWrite('deleteShape')
  
  try {
    const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
    await deleteDoc(shapeRef)
    
    console.log(`🗑️ Shape deleted:`, shapeId)
  } catch (error) {
    console.error('Error deleting shape:', error)
    throw error
  }
}
