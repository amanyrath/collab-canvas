// Multiplayer cursor rendering layer
import React, { useEffect, useState } from 'react'
import { Layer, Group, Circle, Text, Arrow } from 'react-konva'
import { subscribeToPresence, type PresenceData } from '../../utils/presenceUtils'
import { useUserStore } from '../../store/userStore'

/**
 * Layer that renders cursors for all online users except current user
 * Shows cursor position, user name, and current editing status
 */
export const CursorLayer: React.FC = () => {
  const { user } = useUserStore()
  const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({})

  // ✅ BUILT-IN: Subscribe to real-time presence updates
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

  // Don't render if no other users online
  const onlineUsers = Object.values(presenceData)
  if (onlineUsers.length === 0) return <Layer listening={false} />

  return (
    <Layer listening={false}>
      {onlineUsers.map((presence) => (
        <CursorComponent 
          key={presence.userId} 
          presence={presence} 
        />
      ))}
    </Layer>
  )
}

/**
 * Individual cursor component with pointer and label
 */
interface CursorComponentProps {
  presence: PresenceData
}

const CursorComponent: React.FC<CursorComponentProps> = ({ presence }) => {
  const { cursorX, cursorY, displayName, cursorColor, currentlyEditing } = presence
  
  // ✅ Simple cursor design with name label
  return (
    <Group x={cursorX} y={cursorY}>
      {/* Cursor pointer (arrow-like shape) */}
      <Arrow
        points={[0, 0, 0, 20, 15, 15, 8, 15, 8, 25, 0, 20]}
        fill={cursorColor}
        stroke="white"
        strokeWidth={1}
        closed={true}
      />
      
      {/* User name label */}
      <Group x={20} y={5}>
        {/* Label background */}
        <Circle
          radius={Math.max(40, displayName.length * 4)}
          fill={cursorColor}
          opacity={0.9}
          offsetX={-Math.max(40, displayName.length * 4) / 2}
        />
        
        {/* User name text */}
        <Text
          text={displayName}
          fontSize={12}
          fontFamily="Arial, sans-serif"
          fill="white"
          fontStyle="bold"
          align="center"
          verticalAlign="middle"
          offsetX={displayName.length * 3}
          offsetY={6}
        />
      </Group>
      
      {/* ✅ Editing indicator (if user is editing a shape) */}
      {currentlyEditing && (
        <Group x={20} y={25}>
          <Circle
            radius={30}
            fill="rgba(0, 0, 0, 0.7)"
            offsetX={-15}
          />
          <Text
            text="✏️ Editing"
            fontSize={10}
            fontFamily="Arial, sans-serif"
            fill="white"
            align="center"
            offsetX={15}
            offsetY={5}
          />
        </Group>
      )}
    </Group>
  )
}

export default CursorLayer