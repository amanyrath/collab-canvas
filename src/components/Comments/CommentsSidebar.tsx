/**
 * CommentsSidebar Component
 * 
 * Sliding sidebar panel for shape comments (Google Docs style)
 */

import React, { useState, useEffect } from 'react'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'
import { useUserStore } from '../../store/userStore'
import { useCanvasStore } from '../../store/canvasStore'
import { addCommentToShape, editCommentOnShape, deleteCommentFromShape } from '../../utils/commentUtils.simple'

interface CommentsSidebarProps {
  shapeId: string | null
  onClose: () => void
  isOpen: boolean
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  shapeId,
  onClose,
  isOpen
}) => {
  const { user } = useUserStore()
  const { shapes } = useCanvasStore()
  const [submitting, setSubmitting] = useState(false)
  
  // Get the selected shape from the store
  const selectedShape = shapes.find(s => s.id === shapeId)
  const comments = selectedShape?.comments || []
  const commentCount = comments.length

  // Reset submitting state when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setSubmitting(false)
    }
  }, [isOpen])

  console.log('💬 CommentsSidebar:', {
    shapeId: shapeId?.slice(-6) || 'null',
    isOpen,
    commentCount,
    hasShape: !!selectedShape,
    submitting
  })

  const handleAddComment = async (text: string) => {
    if (!selectedShape || !user) return
    
    setSubmitting(true)
    try {
      await addCommentToShape(
        selectedShape,
        text,
        user.uid,
        user.displayName || 'Anonymous',
        user.cursorColor
      )
    } catch (error) {
      console.error('❌ Failed to add comment:', error)
      alert('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string, newText: string) => {
    if (!selectedShape || !user) return
    
    setSubmitting(true)
    try {
      await editCommentOnShape(selectedShape, commentId, newText, user.uid)
    } catch (error) {
      console.error('❌ Failed to edit comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedShape || !user) return
    if (!window.confirm('Delete this comment?')) return
    
    setSubmitting(true)
    try {
      await deleteCommentFromShape(selectedShape, commentId, user.uid)
    } catch (error) {
      console.error('❌ Failed to delete comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay (click to close) */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <div 
        className={`
          fixed top-0 right-0 bottom-0 w-96 bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">
              Comments
            </h2>
            <span className="text-sm text-gray-500">
              ({commentCount})
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            title="Close comments"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto">
          {!shapeId && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p className="text-gray-500">
                Select a shape to view or add comments
              </p>
            </div>
          )}

          {shapeId && commentCount === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 mb-2">
                No comments yet
              </p>
              <p className="text-sm text-gray-400">
                Be the first to comment on this shape
              </p>
            </div>
          )}

          {comments.length > 0 && (
            <div className="divide-y divide-gray-100">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.uid || ''}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comment input (sticky at bottom) */}
        {shapeId && user && (
          <CommentInput
            onSubmit={handleAddComment}
            submitting={submitting}
            placeholder="Add a comment..."
            autoFocus={false}
          />
        )}
      </div>
    </>
  )
}

