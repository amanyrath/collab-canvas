// User store using Zustand for authentication state
import { create } from 'zustand'
import { User as FirebaseUser } from 'firebase/auth'
import { User } from '../utils/types'

interface UserStore {
  user: User | null
  firebaseUser: FirebaseUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null, firebaseUser: FirebaseUser | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearUser: () => void
}

// Generate deterministic cursor color from user ID
const generateCursorColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ]
  
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user, firebaseUser) => set({ 
    user, 
    firebaseUser, 
    isAuthenticated: !!user,
    error: null 
  }),

  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  clearUser: () => set({ 
    user: null, 
    firebaseUser: null, 
    isAuthenticated: false, 
    isLoading: false 
  })
}))

// Helper to create User from FirebaseUser
export const createUserFromFirebase = (firebaseUser: FirebaseUser): User => {
  const displayName = firebaseUser.displayName || 
    firebaseUser.email?.split('@')[0] || 
    'Anonymous User'
  
  return {
    uid: firebaseUser.uid,
    displayName: displayName.length > 20 ? displayName.substring(0, 20) : displayName,
    email: firebaseUser.email || '',
    cursorColor: generateCursorColor(firebaseUser.uid)
  }
}
