// Firebase configuration
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Auth
export const auth = getAuth(app)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Realtime Database
export const rtdb = getDatabase(app)

// Connect to emulators in development
if (import.meta.env.DEV) {
  // Only connect to emulators if not already connected
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    console.log('🔥 Connected to Auth Emulator')
  } catch (error) {
    console.log('Auth emulator already connected or not available')
  }

  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
    console.log('🔥 Connected to Firestore Emulator')
  } catch (error) {
    console.log('Firestore emulator already connected or not available')
  }

  try {
    connectDatabaseEmulator(rtdb, 'localhost', 9000)
    console.log('🔥 Connected to Realtime Database Emulator')
  } catch (error) {
    console.log('Realtime Database emulator already connected or not available')
  }
}

export default app
