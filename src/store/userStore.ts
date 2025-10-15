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
  // Colorblind-friendly palette (Paul Tol's bright scheme + IBM accessible colors)
  // Distinguishable for deuteranopia, protanopia, and tritanopia
  const colors = [
    '#4477AA', // Blue
    '#EE6677', // Rose/Pink
    '#228833', // Green
    '#CCBB44', // Yellow
    '#66CCEE', // Cyan
    '#AA3377', // Purple
    '#BBBBBB', // Gray
    '#EE99AA', // Light Pink
    '#009988', // Teal
    '#997700', // Brown
    '#6699CC', // Light Blue
    '#994455', // Wine/Burgundy
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
