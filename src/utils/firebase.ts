// Firebase configuration
console.log('🔍 [BUILD DEBUG] Starting Firebase module import...')
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

console.log('🔍 [BUILD DEBUG] Firebase imports completed, reading config...')

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
}

console.log('🔍 [BUILD DEBUG] Firebase config created:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasDatabaseURL: !!firebaseConfig.databaseURL,
  environment: import.meta.env.MODE
})

console.log('🔍 [BUILD DEBUG] About to initialize Firebase app...')
// Initialize Firebase
const app = initializeApp(firebaseConfig)
console.log('🔍 [BUILD DEBUG] Firebase app initialized successfully')

console.log('🔍 [BUILD DEBUG] About to initialize Auth...')
// Initialize Auth
export const auth = getAuth(app)
console.log('🔍 [BUILD DEBUG] Auth initialized successfully')

console.log('🔍 [BUILD DEBUG] About to initialize Firestore...')
// Initialize Firestore
export const db = getFirestore(app)
console.log('🔍 [BUILD DEBUG] Firestore initialized successfully')

console.log('🔍 [BUILD DEBUG] About to initialize Realtime Database...')
// Initialize Realtime Database
export const rtdb = getDatabase(app)
console.log('🔍 [BUILD DEBUG] Realtime Database initialized successfully')

console.log('🔍 [BUILD DEBUG] Checking emulator configuration...')
// Connect to emulators when USE_EMULATOR is true
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'
console.log('🔍 [BUILD DEBUG] Emulator mode:', useEmulator)

if (useEmulator) {
  console.log('🔥 Using Firebase Emulators (FREE - no quota usage)')
  console.log('🔍 [BUILD DEBUG] About to connect to Auth emulator...')
  
  // Only connect to emulators if not already connected
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    console.log('✅ Auth Emulator connected')
  } catch (error) {
    console.log('Auth emulator already connected', error)
  }

  console.log('🔍 [BUILD DEBUG] About to connect to Firestore emulator...')
  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
    console.log('✅ Firestore Emulator connected (FREE)')
  } catch (error) {
    console.log('Firestore emulator already connected', error)
  }

  console.log('🔍 [BUILD DEBUG] About to connect to Database emulator...')
  try {
    connectDatabaseEmulator(rtdb, 'localhost', 9000)
    console.log('✅ Realtime Database Emulator connected (FREE)')
  } catch (error) {
    console.log('Realtime Database emulator already connected', error)
  }
} else {
  console.log('🌐 Using Production Firebase (COSTS MONEY)')
}

console.log('🔍 [BUILD DEBUG] Firebase module initialization complete!')

export default app
