/**
 * useCommentCount Hook
 * 
 * Lightweight hook to get just the comment count for a shape
 */

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'

const COMMENTS_COLLECTION = 'comments'

export function useCommentCount(shapeId: string | null): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!shapeId) {
      setCount(0)
      return
    }

    const commentsRef = collection(db, COMMENTS_COLLECTION)
    const q = query(commentsRef, where('shapeId', '==', shapeId))

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

