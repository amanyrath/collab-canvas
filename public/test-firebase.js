// Quick test to verify Firestore rules and connection
// Run this in your browser console to test the setup

console.log('🔥 Firebase Emulator Connection Test');

// Test 1: Check environment
console.log('Environment check:');
console.log('- Using emulator:', import.meta.env.VITE_USE_EMULATOR);
console.log('- Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Test 2: Check Firebase services
import { auth, db } from './src/utils/firebase.ts';
console.log('Firebase services:');
console.log('- Auth:', auth.app.name);
console.log('- Firestore:', db.app.name);

// Test 3: Try creating a test shape (requires authentication)
async function testShapeCreation() {
  try {
    if (!auth.currentUser) {
      console.log('❌ Please sign in first to test shape creation');
      return;
    }
    
    const { createShape } = await import('./src/utils/shapeUtils.ts');
    
    console.log('Testing shape creation...');
    const shapeId = await createShape(
      100, 200, 'rectangle', '#ff0000', 
      auth.currentUser.uid, auth.currentUser.displayName || 'Test User'
    );
    
    console.log('✅ Shape created successfully:', shapeId);
    console.log('🎉 Firestore rules are working!');
    
  } catch (error) {
    console.error('❌ Shape creation failed:', error);
    console.log('Check the Firestore rules and authentication');
  }
}

// Test 4: Connection status
async function testConnection() {
  try {
    const testDoc = db.collection('test').doc('connection');
    await testDoc.get();
    console.log('✅ Firestore connection: OK');
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
  }
}

// Run tests
console.log('Running connection test...');
testConnection();

console.log('To test shape creation, run: testShapeCreation()');
window.testShapeCreation = testShapeCreation;


