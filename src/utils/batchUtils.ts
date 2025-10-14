// Utility for batching Firebase operations
import { writeBatch, doc } from 'firebase/firestore'
import { db } from './firebase'
import { logFirestoreWrite } from './performanceMonitor'

interface BatchOperation {
  type: 'update' | 'create' | 'delete'
  collection: string
  docId: string
  data?: any
}

class FirebaseBatcher {
  private operations: BatchOperation[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 500 // Firestore limit
  private readonly BATCH_DELAY = 100 // ms

  addOperation(operation: BatchOperation) {
    this.operations.push(operation)
    
    if (this.operations.length >= this.BATCH_SIZE) {
      this.flush()
    } else {
      this.scheduleBatch()
    }
  }

  private scheduleBatch() {
    if (this.batchTimeout) return
    
    this.batchTimeout = setTimeout(() => {
      this.flush()
    }, this.BATCH_DELAY)
  }

  private async flush() {
    if (this.operations.length === 0) return
    
    const batch = writeBatch(db)
    const currentOps = this.operations.splice(0, this.BATCH_SIZE)
    
    currentOps.forEach(op => {
      const docRef = doc(db, op.collection, op.docId)
      
      switch (op.type) {
        case 'update':
          batch.update(docRef, op.data)
          break
        case 'create':
          batch.set(docRef, op.data)
          break
        case 'delete':
          batch.delete(docRef)
          break
      }
    })
    
    try {
      await batch.commit()
      logFirestoreWrite('batchCommit', currentOps.length)
      console.log(`📦 Batched ${currentOps.length} operations`)
    } catch (error) {
      console.error('Batch operation failed:', error)
      throw error
    }
    
    this.batchTimeout = null
    
    // Process remaining operations if any
    if (this.operations.length > 0) {
      this.scheduleBatch()
    }
  }

  async flushImmediate() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
    await this.flush()
  }
}

export const firebaseBatcher = new FirebaseBatcher()

