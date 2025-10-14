// Simplified cursor rendering using built-in Konva shapes
import React, { useEffect, useState } from 'react'
import { Layer, Group, Circle, Text, Rect } from 'react-konva'
import { subscribeToPresence, type PresenceData } from '../../utils/presenceUtils'
import { useUserStore } from '../../store/userStore'

/**
 * ✅ BUILT-IN: Simple cursor layer using basic Konva shapes
 */
export const SimpleCursorLayer: React.FC = () => {
  const { user } = useUserStore()
  const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({})

  useEffect(() => {
    const unsubscribe = subscribeToPresence((data) => {
      // Filter out current user and offline users
      const onlineUsers = Object.entries(data).reduce((acc, [userId, presence]) => {
        if (userId !== user?.uid && presence.isOnline) {
          acc[userId] = presence
        }
        return acc
      }, {} as Record<string, PresenceData>)
      
      setPresenceData(onlineUsers)
    })

    return unsubscribe
  }, [user?.uid])

  const onlineUsers = Object.values(presenceData)
  if (onlineUsers.length === 0) return <Layer listening={false} />

  return (
    <Layer listening={false}>
      {onlineUsers.map((presence) => (
        <SimpleCursorComponent 
          key={presence.userId} 
          presence={presence} 
        />
      ))}
    </Layer>
  )
}

/**
 * ✅ BUILT-IN: Super simple cursor using Circle + Text
 */
interface SimpleCursorComponentProps {
  presence: PresenceData
}

const SimpleCursorComponent: React.FC<SimpleCursorComponentProps> = ({ presence }) => {
  const { cursorX, cursorY, displayName, cursorColor, currentlyEditing } = presence
  
  return (
    <Group x={cursorX} y={cursorY}>
      {/* ✅ BUILT-IN: Simple circle cursor */}
      <Circle
        radius={8}
        fill={cursorColor}
        stroke="white"
        strokeWidth={2}
      />
      
      {/* ✅ BUILT-IN: Simple text label */}
      <Group x={15} y={-5}>
        <Rect
          width={displayName.length * 6 + 8}
          height={20}
          fill={cursorColor}
          cornerRadius={3}
        />
        <Text
          text={displayName}
          fontSize={12}
          fontFamily="Arial"
          fill="white"
          x={4}
          y={4}
        />
      </Group>
      
      {/* ✅ Simple editing indicator */}
      {currentlyEditing && (
        <Circle
          x={0}
          y={20}
          radius={4}
          fill="orange"
          stroke="white"
          strokeWidth={1}
        />
      )}
    </Group>
  )
}

export default SimpleCursorLayer
