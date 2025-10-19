/**
 * useCommentCount Hook
 * 
 * Lightweight hook to get just the comment count for a shape
 */

import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'

const CANVAS_ID = 'global-canvas-v1'

export function useCommentCount(shapeId: string | null): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!shapeId) {
      setCount(0)
      return
    }

    const commentsPath = `canvas/${CANVAS_ID}/shapes/${shapeId}/comments`
    const commentsRef = collection(db, commentsPath)
    const q = query(commentsRef)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCount(snapshot.size)
      },
      (error) => {
        console.error(`❌ Error counting comments for shape ${shapeId}:`, error)
        setCount(0)
      }
    )

    return unsubscribe
  }, [shapeId])

  return count
}

