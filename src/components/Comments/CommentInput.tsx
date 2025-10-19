/**
 * CommentInput Component
 * 
 * Input field for adding new comments
 */

import React, { useState, useRef, useEffect } from 'react'

interface CommentInputProps {
  onSubmit: (text: string) => void
  submitting: boolean
  placeholder?: string
  autoFocus?: boolean
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  submitting,
  placeholder = 'Add a comment...',
  autoFocus = false
}) => {
  const [text, setText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])
  
  // Debug logging
  useEffect(() => {
    console.log('💬 CommentInput state: submitting=' + submitting + ', hasText=' + (text.length > 0) + ', isFocused=' + isFocused)
  }, [submitting, text, isFocused])

  const handleSubmit = () => {
    const trimmedText = text.trim()
    console.log('💬 CommentInput handleSubmit:', { trimmedText, submitting, canSubmit: trimmedText && !submitting })
    if (trimmedText && !submitting) {
      console.log('💬 CommentInput: Calling onSubmit')
      onSubmit(trimmedText)
      setText('')
      setIsFocused(false)
    } else {
      console.log('💬 CommentInput: Submit blocked', { hasText: !!trimmedText, notSubmitting: !submitting })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setText('')
      setIsFocused(false)
      textareaRef.current?.blur()
    }
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className={`
        border rounded-lg transition-all
        ${isFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'}
      `}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            if (!text.trim()) setIsFocused(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm resize-none focus:outline-none rounded-lg"
          rows={isFocused ? 3 : 1}
          disabled={submitting}
        />
        
        {/* Action buttons (show when focused) */}
        {isFocused && (
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              ⌘+Enter to submit
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setText('')
                  setIsFocused(false)
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

