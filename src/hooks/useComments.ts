/**
 * useComments Hook
 * 
 * Real-time comment synchronization for shapes
 */

import { useState, useEffect } from 'react'
import { Comment } from '../utils/commentTypes'
import { subscribeToComments, addComment, updateComment, deleteComment } from '../utils/commentUtils'

export function useComments(shapeId: string | null) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Subscribe to real-time updates
  useEffect(() => {
    if (!shapeId) {
      setComments([])
      setLoading(false)
      return
    }

    console.log(`💬 useComments: Setting up subscription for shape ${shapeId.slice(-6)}`)
    
    // Reset state immediately when shape changes
    setComments([])
    setLoading(true)
    setError(null)
    
    let isMounted = true

    const unsubscribe = subscribeToComments(
      shapeId,
      (newComments) => {
        if (isMounted) {
          setComments(newComments)
          setLoading(false)
        }
      },
      (err) => {
        if (isMounted) {
          setError(err)
          setLoading(false)
        }
      }
    )

    return () => {
      console.log(`💬 useComments: Cleaning up subscription for shape ${shapeId.slice(-6)}`)
      isMounted = false
      unsubscribe()
    }
  }, [shapeId])

  return {
    comments,
    loading,
    error,
    commentCount: comments.length,
  }
}

/**
 * Hook for managing comment actions
 */
export function useCommentActions() {
  const [submitting, setSubmitting] = useState(false)

  const addNewComment = async (
    shapeId: string,
    text: string,
    authorId: string,
    authorName: string,
    authorColor?: string
  ) => {
    setSubmitting(true)
    try {
      console.log('💬 useCommentActions: Adding comment, submitting=true')
      await addComment(shapeId, text, authorId, authorName, authorColor)
      console.log('💬 useCommentActions: Comment added successfully, setting submitting=false')
    } catch (error) {
      console.error('💬 useCommentActions: Error adding comment:', error)
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  const editComment = async (
    commentId: string,
    text: string
  ) => {
    setSubmitting(true)
    try {
      await updateComment(commentId, text)
    } finally {
      setSubmitting(false)
    }
  }

  const removeComment = async (
    commentId: string
  ) => {
    setSubmitting(true)
    try {
      await deleteComment(commentId)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    addNewComment,
    editComment,
    removeComment,
    submitting,
  }
}

