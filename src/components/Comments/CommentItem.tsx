/**
 * CommentItem Component
 * 
 * Individual comment display with edit/delete
 */

import React, { useState } from 'react'
import { Comment } from '../../utils/commentTypes'
import { formatCommentTime } from '../../utils/commentUtils'

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onEdit: (commentId: string, newText: string) => void
  onDelete: (commentId: string) => void
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onEdit,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const isAuthor = comment.authorId === currentUserId

  const handleSave = () => {
    if (editText.trim() && editText !== comment.text) {
      onEdit(comment.id, editText.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditText(comment.text)
    setIsEditing(false)
  }

  return (
    <div className="group px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* Author header */}
      <div className="flex items-center gap-2 mb-1">
        {/* Avatar */}
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: comment.authorColor || '#3b82f6' }}
        >
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        
        {/* Name and time */}
        <div className="flex-1 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {comment.authorName}
          </span>
          <span className="text-xs text-gray-500">
            {formatCommentTime(comment.createdAt)}
            {comment.isEdited && <span className="ml-1">(edited)</span>}
          </span>
        </div>

        {/* Action buttons (show on hover if author) */}
        {isAuthor && !isEditing && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              title="Edit comment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(comment.id)}
              className="p-1 text-gray-500 hover:text-red-600 rounded"
              title="Delete comment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Comment text (or edit mode) */}
      {isEditing ? (
        <div className="ml-8 mt-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="ml-8 text-sm text-gray-700 whitespace-pre-wrap break-words">
          {comment.text}
        </p>
      )}
    </div>
  )
}

