// ⚡ ULTRA-FAST cursor rendering - optimized Firebase structure
import React, { useEffect, useState } from 'react'
import { Layer, Group, Circle, Text, Rect } from 'react-konva'
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
 * ⚡ SUPER FAST: Direct Firebase /cursors subscription - no wrapper functions
 */
export const SimpleCursorLayer: React.FC = () => {
  const { user } = useUserStore()
  const [cursors, setCursors] = useState<Record<string, FastCursor>>({})

  useEffect(() => {
    if (!user) return
    
    console.log('⚡ Setting up FAST cursor subscription')
    
    // ⚡ DIRECT Firebase subscription to /cursors path
    const cursorsRef = ref(rtdb, '/cursors')
    
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      const data = snapshot.val() || {}
      
      // ⚡ FAST: Filter out current user, keep all others
      const { [user.uid]: _, ...otherCursors } = data
      setCursors(otherCursors)
      
    }, { onlyOnce: false })

    return () => unsubscribe()
  }, [user?.uid])

  const cursorList = Object.entries(cursors)
  if (cursorList.length === 0) return <Layer listening={false} />

  return (
    <Layer listening={false}>
      {cursorList.map(([userId, cursor]) => (
        <FastCursor key={userId} cursor={cursor} />
      ))}
    </Layer>
  )
}

/**
 * ⚡ SUPER FAST: Minimal cursor component - just circle + name
 */
interface FastCursorProps {
  cursor: FastCursor
}

const FastCursor: React.FC<FastCursorProps> = ({ cursor }) => {
  const { x, y, name, color } = cursor
  
  return (
    <Group x={x} y={y}>
      {/* ⚡ Simple cursor dot */}
      <Circle
        radius={6}
        fill={color}
        stroke="white"
        strokeWidth={2}
      />
      
      {/* ⚡ Name label */}
      <Group x={12} y={-8}>
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
