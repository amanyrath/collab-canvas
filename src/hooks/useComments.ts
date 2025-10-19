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
    setLoading(true)
    setError(null)

    const unsubscribe = subscribeToComments(
      shapeId,
      (newComments) => {
        setComments(newComments)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => {
      console.log(`💬 useComments: Cleaning up subscription for shape ${shapeId.slice(-6)}`)
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
      await addComment(shapeId, text, authorId, authorName, authorColor)
    } finally {
      setSubmitting(false)
    }
  }

  const editComment = async (
    shapeId: string,
    commentId: string,
    text: string
  ) => {
    setSubmitting(true)
    try {
      await updateComment(shapeId, commentId, text)
    } finally {
      setSubmitting(false)
    }
  }

  const removeComment = async (
    shapeId: string,
    commentId: string
  ) => {
    setSubmitting(true)
    try {
      await deleteComment(shapeId, commentId)
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

