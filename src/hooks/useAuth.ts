// Hook to manage Firebase authentication
import { useEffect } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { useUserStore, createUserFromFirebase } from '../store/userStore'
import { initializePresence, cleanupPresence } from '../utils/presenceUtils'

export const useAuth = () => {
  const { setUser, setLoading, setError, clearUser } = useUserStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      async (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            const user = createUserFromFirebase(firebaseUser)
            setUser(user, firebaseUser)
            console.log('🔥 User authenticated:', user.displayName)
            
            // ✅ PHASE 8: Initialize presence on login (includes disconnect cleanup)
            await initializePresence(user)
          } else {
            // ✅ PHASE 8: Cleanup presence on logout
            const { user } = useUserStore.getState()
            if (user) {
              await cleanupPresence(user.uid)
            }
            clearUser()
            console.log('🔥 User signed out')
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          setError('Authentication error occurred')
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        console.error('Auth state observer error:', error)
        setError('Failed to initialize authentication')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [setUser, setLoading, setError, clearUser])

  return useUserStore()
}
