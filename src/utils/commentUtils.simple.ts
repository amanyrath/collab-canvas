/**
 * Simplified Comment Utilities
 * 
 * Comments are stored directly on Shape objects, not in a separate collection
 */

import { serverTimestamp } from 'firebase/firestore'
import { updateShape } from './shapeUtils'
import { Shape } from './types'
import { v4 as uuidv4 } from 'uuid'

export interface ShapeComment {
  id: string
  text: string
  authorId: string
  authorName: string
  authorColor?: string
  createdAt: any
  updatedAt?: any
  isEdited?: boolean
}

/**
 * Add a comment to a shape
 */
export async function addCommentToShape(
  shape: Shape,
  text: string,
  authorId: string,
  authorName: string,
  authorColor?: string
): Promise<void> {
  const newComment: ShapeComment = {
    id: uuidv4(),
    text,
    authorId,
    authorName,
    authorColor,
    createdAt: serverTimestamp(),
    isEdited: false,
  }

  const existingComments = shape.comments || []
  const updatedComments = [...existingComments, newComment]

  await updateShape(shape.id, { comments: updatedComments }, authorId)
  console.log(`💬 Added comment to shape ${shape.id.slice(-6)}`)
}

/**
 * Edit a comment on a shape
 */
export async function editCommentOnShape(
  shape: Shape,
  commentId: string,
  newText: string,
  userId: string
): Promise<void> {
  const existingComments = shape.comments || []
  const updatedComments = existingComments.map(comment =>
    comment.id === commentId
      ? {
          ...comment,
          text: newText,
          updatedAt: serverTimestamp(),
          isEdited: true,
        }
      : comment
  )

  await updateShape(shape.id, { comments: updatedComments }, userId)
  console.log(`💬 Edited comment ${commentId} on shape ${shape.id.slice(-6)}`)
}

/**
 * Delete a comment from a shape
 */
export async function deleteCommentFromShape(
  shape: Shape,
  commentId: string,
  userId: string
): Promise<void> {
  const existingComments = shape.comments || []
  const updatedComments = existingComments.filter(comment => comment.id !== commentId)

  await updateShape(shape.id, { comments: updatedComments }, userId)
  console.log(`💬 Deleted comment ${commentId} from shape ${shape.id.slice(-6)}`)
}

/**
 * Get comment count for a shape
 */
export function getCommentCount(shape: Shape): number {
  return shape.comments?.length || 0
}

