// Hook to manage Firebase authentication
import { useEffect } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { useUserStore, createUserFromFirebase } from '../store/userStore'

export const useAuth = () => {
  const { setUser, setLoading, setError, clearUser } = useUserStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            const user = createUserFromFirebase(firebaseUser)
            setUser(user, firebaseUser)
            console.log('🔥 User authenticated:', user.displayName)
          } else {
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
