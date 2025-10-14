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

// Connect to emulators when USE_EMULATOR is true
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'

if (useEmulator) {
  console.log('🔥 Using Firebase Emulators (FREE - no quota usage)')
  
  // Only connect to emulators if not already connected
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    console.log('✅ Auth Emulator connected')
  } catch (error) {
    console.log('Auth emulator already connected')
  }

  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
    console.log('✅ Firestore Emulator connected (FREE)')
  } catch (error) {
    console.log('Firestore emulator already connected')
  }

  try {
    connectDatabaseEmulator(rtdb, 'localhost', 9000)
    console.log('✅ Realtime Database Emulator connected (FREE)')
  } catch (error) {
    console.log('Realtime Database emulator already connected')
  }
} else {
  console.log('🌐 Using Production Firebase (COSTS MONEY)')
}

export default app
