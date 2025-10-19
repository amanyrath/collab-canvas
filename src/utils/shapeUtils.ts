// Firestore utilities for shape management with batching support
import { 
  collection, 
  doc, 
  onSnapshot, 
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { Shape } from './types'
import { v4 as uuidv4 } from 'uuid'
import { logFirestoreRead, logFirestoreWrite } from './performanceMonitor'
import { FirebaseErrorHandler } from './errorHandling'

// Firestore collection path for shapes
const SHAPES_COLLECTION = 'canvas/global-canvas-v1/shapes'

// Create a new shape in Firestore with error handling
export const createShape = async (
  x: number, 
  y: number, 
  type: 'rectangle' | 'circle' | 'triangle',
  color: string,
  createdBy: string,
  displayName: string,
  width: number = 100,
  height: number = 100,
  text: string = ''
): Promise<string> => {
  return FirebaseErrorHandler.withRetry(async () => {
    logFirestoreWrite('createShape')
    
    const shapeId = uuidv4()
    const shapesRef = collection(db, SHAPES_COLLECTION)
    
    const newShape: Omit<Shape, 'id'> = {
      type, // ✅ USE PROVIDED SHAPE TYPE
      x,
      y,
      width, // ✅ USE PROVIDED WIDTH
      height, // ✅ USE PROVIDED HEIGHT
      fill: color, // ✅ USE PROVIDED COLOR
      text, // ✅ USE PROVIDED TEXT
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
  }, { maxRetries: 2 })
}

// Batch create multiple shapes for better performance
export const createShapeBatch = async (
  shapes: Array<{
    x: number
    y: number
    type: 'rectangle' | 'circle' | 'triangle'
    color: string
    createdBy: string
  }>
): Promise<string[]> => {
  return FirebaseErrorHandler.withRetry(async () => {
    logFirestoreWrite('createShapeBatch', shapes.length)
    
    const batch = writeBatch(db)
    const shapeIds: string[] = []
    
    for (const shapeData of shapes) {
      const shapeId = uuidv4()
      shapeIds.push(shapeId)
      
      const newShape = {
        type: shapeData.type,
        x: shapeData.x,
        y: shapeData.y,
        width: 100,
        height: 100,
        fill: shapeData.color,
        text: '',
        textColor: '#000000',
        fontSize: 14,
        createdBy: shapeData.createdBy,
        createdAt: serverTimestamp(),
        lastModifiedBy: shapeData.createdBy,
        lastModifiedAt: serverTimestamp(),
        isLocked: false,
        lockedBy: null
      }
      
      const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
      batch.set(shapeRef, newShape)
    }
    
    // Commit all creates in one batch (native Firebase, more reliable)
    await batch.commit()
    
    console.log(`🎯 Batch created ${shapes.length} shapes`)
    return shapeIds
  }, { maxRetries: 2 })
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

// Update shape properties with error handling
export const updateShape = async (
  shapeId: string, 
  updates: Partial<Omit<Shape, 'id' | 'createdBy' | 'createdAt'>>,
  userId: string
) => {
  return FirebaseErrorHandler.withRetry(async () => {
    logFirestoreWrite('updateShape')
    
    const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
    
    const updateData = {
      ...updates,
      lastModifiedBy: userId,
      lastModifiedAt: serverTimestamp()
    }
    
    await updateDoc(shapeRef, updateData)
    
    console.log(`📝 Shape updated:`, shapeId)
  }, { maxRetries: 2 })
}

// Batch update multiple shapes for better performance
export const updateShapeBatch = async (
  updates: Array<{
    shapeId: string
    updates: Partial<Omit<Shape, 'id' | 'createdBy' | 'createdAt'>>
    userId: string
  }>
) => {
  return FirebaseErrorHandler.withRetry(async () => {
    logFirestoreWrite('updateShapeBatch', updates.length)
    
    const batch = writeBatch(db)
    
    for (const update of updates) {
      const updateData = {
        ...update.updates,
        lastModifiedBy: update.userId,
        lastModifiedAt: serverTimestamp()
      }
      
      const shapeRef = doc(db, SHAPES_COLLECTION, update.shapeId)
      batch.update(shapeRef, updateData)
    }
    
    // Commit all updates in one batch (native Firebase, more reliable)
    await batch.commit()
    
    console.log(`📝 Batch updated ${updates.length} shapes`)
  }, { maxRetries: 2 })
}

// Delete shape from Firestore with error handling
export const deleteShape = async (shapeId: string) => {
  return FirebaseErrorHandler.withRetry(async () => {
    logFirestoreWrite('deleteShape')
    
    const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
    await deleteDoc(shapeRef)
    
    console.log(`🗑️ Shape deleted:`, shapeId)
  }, { maxRetries: 2 })
}

// Batch delete multiple shapes
export const deleteShapeBatch = async (shapeIds: string[]) => {
  return FirebaseErrorHandler.withRetry(async () => {
    logFirestoreWrite('deleteShapeBatch', shapeIds.length)
    
    const batch = writeBatch(db)
    
    for (const shapeId of shapeIds) {
      const shapeRef = doc(db, SHAPES_COLLECTION, shapeId)
      batch.delete(shapeRef)
    }
    
    // Commit all deletes in one batch (native Firebase, more reliable)
    await batch.commit()
    
    console.log(`🗑️ Batch deleted ${shapeIds.length} shapes`)
  }, { maxRetries: 2 })
}
