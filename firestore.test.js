// Firebase Firestore Rules Test
// Run: firebase emulators:exec --only firestore "npm test"

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');

describe('Firestore Rules', () => {
  let testEnv;
  let authenticatedDb;
  let unauthenticatedDb;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8')
      }
    });

    authenticatedDb = testEnv.authenticatedContext('user123').firestore();
    unauthenticatedDb = testEnv.unauthenticatedContext().firestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('authenticated users can create valid shapes', async () => {
    const shapeRef = authenticatedDb
      .collection('canvas')
      .doc('global-canvas-v1')
      .collection('shapes')
      .doc('shape123');

    const validShape = {
      type: 'rectangle',
      x: 100,
      y: 200, 
      width: 150,
      height: 100,
      fill: '#ff0000',
      text: '',
      textColor: '#000000',
      fontSize: 14,
      createdBy: 'user123',
      createdAt: new Date(),
      lastModifiedBy: 'user123', 
      lastModifiedAt: new Date(),
      isLocked: false,
      lockedBy: null
    };

    await expect(shapeRef.set(validShape)).toAllow();
  });

  test('unauthenticated users cannot create shapes', async () => {
    const shapeRef = unauthenticatedDb
      .collection('canvas')
      .doc('global-canvas-v1')  
      .collection('shapes')
      .doc('shape456');

    const validShape = {
      type: 'circle',
      x: 100,
      y: 200,
      width: 150, 
      height: 100,
      fill: '#00ff00',
      createdBy: 'user456',
      createdAt: new Date(),
      lastModifiedBy: 'user456',
      lastModifiedAt: new Date(), 
      isLocked: false,
      lockedBy: null
    };

    await expect(shapeRef.set(validShape)).toDeny();
  });

  test('rejects invalid shape types', async () => {
    const shapeRef = authenticatedDb
      .collection('canvas')
      .doc('global-canvas-v1')
      .collection('shapes') 
      .doc('shape789');

    const invalidShape = {
      type: 'triangle', // Invalid type
      x: 100,
      y: 200,
      width: 150,
      height: 100,
      fill: '#0000ff', 
      createdBy: 'user123',
      createdAt: new Date(),
      lastModifiedBy: 'user123',
      lastModifiedAt: new Date(),
      isLocked: false,
      lockedBy: null
    };

    await expect(shapeRef.set(invalidShape)).toDeny();
  });

  test('rejects shapes with missing required fields', async () => {
    const shapeRef = authenticatedDb
      .collection('canvas')
      .doc('global-canvas-v1') 
      .collection('shapes')
      .doc('shape999');

    const incompleteShape = {
      type: 'rectangle',
      x: 100,
      // Missing y, width, height, fill, etc.
      createdBy: 'user123'
    };

    await expect(shapeRef.set(incompleteShape)).toDeny();
  });
});



