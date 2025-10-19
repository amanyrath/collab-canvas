/**
 * CommentsSidebar Component
 * 
 * Sliding sidebar panel for shape comments (Google Docs style)
 */

import React from 'react'
import { useComments, useCommentActions } from '../../hooks/useComments'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'
import { useUserStore } from '../../store/userStore'

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
  const { comments, loading, commentCount } = useComments(shapeId)
  const { addNewComment, editComment, removeComment, submitting } = useCommentActions()

  // Debug logging
  React.useEffect(() => {
    console.log('💬 CommentsSidebar state:', { shapeId, isOpen, loading, commentCount, commentsLength: comments.length })
  }, [shapeId, isOpen, loading, commentCount, comments.length])

  const handleAddComment = async (text: string) => {
    if (!shapeId || !user) return
    
    await addNewComment(
      shapeId,
      text,
      user.uid,
      user.displayName,
      user.cursorColor
    )
  }

  const handleEditComment = async (commentId: string, newText: string) => {
    if (!shapeId) return
    await editComment(shapeId, commentId, newText)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!shapeId) return
    if (window.confirm('Delete this comment?')) {
      await removeComment(shapeId, commentId)
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
          {loading && shapeId && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}

          {!loading && !shapeId && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p className="text-gray-500">
                Select a shape to view or add comments
              </p>
            </div>
          )}

          {!loading && shapeId && commentCount === 0 && (
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

          {!loading && comments.length > 0 && (
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

