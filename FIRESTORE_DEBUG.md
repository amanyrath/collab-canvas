# 🚨 **Firestore Rules Debug Guide**

## ✅ **Fixed Issues**

The main problems with the original Firestore rules were:

1. **❌ Wrong field validation** - Rules expected `id` field that doesn't exist when creating shapes
2. **❌ Wrong validation logic** - Used `resource.data` instead of `request.resource.data` in create rule  
3. **❌ Missing field validation** - Didn't validate all actual shape fields
4. **❌ Incomplete optional field handling** - No proper validation for nullable fields

## 🔧 **Local Testing Steps**

### 1. **Stop all emulators first:**
```bash
# Kill any running emulators
pkill -f firebase
firebase emulators:stop
```

### 2. **Deploy rules to emulator:**
```bash  
# Start emulators with fresh rules
firebase emulators:start --only firestore,auth,database
```

### 3. **Check emulator UI:**
- Open http://localhost:4000
- Go to Firestore tab
- Try creating a document manually to test rules

### 4. **Test with your app:**
```bash
# Make sure your .env has:
VITE_USE_EMULATOR=true

# Then start your app
npm run dev
```

## 📝 **Manual Rule Testing**

### **Valid Shape Data (Should Work):**
```json
{
  "type": "rectangle",
  "x": 100,
  "y": 200,
  "width": 150,
  "height": 100, 
  "fill": "#ff0000",
  "text": "",
  "textColor": "#000000",
  "fontSize": 14,
  "createdBy": "authenticated-user-uid",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastModifiedBy": "authenticated-user-uid", 
  "lastModifiedAt": "2024-01-01T00:00:00Z",
  "isLocked": false,
  "lockedBy": null
}
```

### **Invalid Shape Data (Should Fail):**
```json
{
  "type": "triangle",  // ❌ Invalid type
  "x": 100,
  "y": 200
  // ❌ Missing required fields
}
```

## 🐛 **Common Debug Steps**

### **Check Console Errors:**
1. Open browser dev tools
2. Look for Firestore permission errors
3. Check network tab for 403 responses

### **Verify Emulator Connection:**
```javascript
// In browser console:
console.log('Firebase config:', import.meta.env)
console.log('Using emulator:', import.meta.env.VITE_USE_EMULATOR)
```

### **Test Authentication:**
```javascript
// In browser console: 
import { auth } from './src/utils/firebase'
console.log('Current user:', auth.currentUser)
```

## 🚀 **Quick Fix Commands**

```bash
# 1. Restart emulators with fresh rules
firebase emulators:stop
firebase emulators:start --only firestore,auth,database

# 2. Clear browser storage (if cached auth issues)
# Dev tools > Application > Storage > Clear storage

# 3. Check rules syntax
firebase firestore:rules:get

# 4. Test rules specifically  
npm install --save-dev @firebase/rules-unit-testing
node firestore.test.js
```

## 📋 **Expected Emulator Output**

When starting emulators, you should see:
```
✔  firestore: Firestore Emulator logging to firestore-debug.log
✔  auth: Auth Emulator logging to firebase-debug.log  
✔  database: Database Emulator logging to database-debug.log
✔  All emulators ready! It is now safe to connect your app.
```

## ❗ **If Still Not Working**

1. **Check firebase.json config** - Make sure paths are correct
2. **Verify .env file** - Ensure `VITE_USE_EMULATOR=true`
3. **Clear all caches** - Browser, npm, Firebase
4. **Check logs** - Look at `firestore-debug.log` for detailed errors

The updated rules should now work correctly with your shape data structure!


