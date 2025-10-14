// ⚡ ULTRA-FAST cursor rendering - optimized Firebase structure
import React, { useEffect, useState } from 'react'
import { Layer, Group, Circle, Text, Rect, Line } from 'react-konva'
import { ref, onValue } from 'firebase/database'
import { rtdb } from '../../utils/firebase'
import { useUserStore } from '../../store/userStore'

// ⚡ MINIMAL cursor data structure
interface FastCursor {
  x: number
  y: number
  name: string
  color: string
}

/**
 * ✅ CURSOR LAYER: Renders cursors with proper coordinate handling
 */
export const SimpleCursorLayer: React.FC = () => {
  const { user } = useUserStore()
  const [cursors, setCursors] = useState<Record<string, FastCursor>>({})

  useEffect(() => {
    if (!user) return
    
    // Setting up cursor subscription
    const cursorsRef = ref(rtdb, '/sessions/global-canvas-v1')
    
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      const data = snapshot.val() || {}
      
      // Convert presence data to cursor format, include ALL online users (including self)
      const cursorData: Record<string, FastCursor> = {}
      Object.entries(data).forEach(([userId, presence]: [string, any]) => {
        if (presence.isOnline && presence.cursorX !== undefined && presence.cursorY !== undefined) {
          cursorData[userId] = {
            x: presence.cursorX,
            y: presence.cursorY,
            name: presence.displayName || 'Anonymous',
            color: presence.cursorColor || '#666'
          }
        }
      })
      setCursors(cursorData)
      
    }, { onlyOnce: false })

    return () => unsubscribe()
  }, [user?.uid])

  const cursorList = Object.entries(cursors)
  if (cursorList.length === 0) return <Layer listening={false} />

  // ✅ IMPORTANT: Cursor layer should not be affected by stage transforms
  // Cursors are rendered in canvas coordinates, not screen coordinates
  return (
    <Layer listening={false}>
      {cursorList.map(([userId, cursor]) => (
        <FastCursor 
          key={userId} 
          cursor={cursor} 
          isCurrentUser={userId === user?.uid}
        />
      ))}
    </Layer>
  )
}

/**
 * 👆 CURSOR COMPONENT: Different styles for current user vs others
 */
interface FastCursorProps {
  cursor: FastCursor
  isCurrentUser?: boolean
}

const FastCursor: React.FC<FastCursorProps> = ({ cursor, isCurrentUser = false }) => {
  const { x, y, name, color } = cursor
  
  // Pointer shape coordinates for current user
  const pointerPoints = [0, 0, 0, 14, 4, 10, 6, 16, 8, 15, 6, 9, 10, 9]
  
  return (
    <Group x={x} y={y}>
      {isCurrentUser ? (
        // 👆 Pointer icon for current user (like a mouse cursor)
        <Line
          points={pointerPoints}
          fill={color}
          stroke="white"
          strokeWidth={1}
          closed={true}
        />
      ) : (
        // ⚡ Simple cursor dot for other users
        <Circle
          radius={6}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
      )}
      
      {/* ⚡ Name label */}
      <Group x={isCurrentUser ? 16 : 12} y={-8}>
        <Rect
          width={name.length * 6 + 6}
          height={16}
          fill={color}
          cornerRadius={2}
        />
        <Text
          text={name}
          fontSize={11}
          fontFamily="Arial"
          fill="white"
          x={3}
          y={2}
        />
      </Group>
    </Group>
  )
}

export default SimpleCursorLayer
