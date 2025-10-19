# Automatic Lock Cleanup Implementation

## Problem
When users sign out or disconnect (browser close, network loss), their locked shapes remained locked, blocking other users from editing those shapes.

## Solution
Leverages the existing presence system with `onDisconnect` to automatically unlock shapes when users go offline.

## How It Works

### 1. **Presence System** (Already Existed)
- When user logs in: presence entry created at `/sessions/global-canvas-v1/{userId}`
- `onDisconnect()` is set up to automatically remove presence when user disconnects
- Works for: sign-out, browser close, network loss, tab close, etc.

### 2. **Lock Cleanup Monitor** (New)
Located in `src/utils/lockCleanup.ts`:

```typescript
export const initializeLockCleanup = () => {
  // Monitor the presence database
  const presenceRef = ref(rtdb, '/sessions/global-canvas-v1')
  
  // Track who's online
  const onlineUsers = new Set<string>()
  
  // Listen for presence changes
  onValue(presenceRef, async (snapshot) => {
    const currentOnlineUsers = new Set(Object.keys(snapshot.val() || {}))
    
    // Find users who just went offline
    const offlineUsers = Array.from(onlineUsers).filter(
      userId => !currentOnlineUsers.has(userId)
    )
    
    // Unlock all shapes for offline users
    for (const userId of offlineUsers) {
      await unlockShapesForUser(userId) // Queries Firestore and unlocks
    }
    
    // Update tracking
    onlineUsers.clear()
    currentOnlineUsers.forEach(userId => onlineUsers.add(userId))
  })
}
```

### 3. **Integration**
- `App.tsx`: Initializes the lock cleanup monitor when app loads
- `Navbar.tsx`: Still manually unlocks on sign-out (faster than waiting for presence removal)

## Architecture Benefits

### Simple & Reliable
- **Single source of truth**: Uses existing presence system
- **No extra RTDB nodes**: Doesn't create additional lock tracking data
- **Automatic**: Works for all disconnect scenarios (not just manual sign-out)

### Event Flow
```
User disconnects
    ↓
onDisconnect() triggers in RTDB
    ↓
Presence entry removed from /sessions/global-canvas-v1/{userId}
    ↓
Lock cleanup monitor detects change
    ↓
Queries Firestore for shapes with lockedBy == userId
    ↓
Unlocks all shapes (sets isLocked=false, lockedBy=null, etc.)
    ↓
All users see shapes become available
```

## Why This Approach?

### Rejected Alternatives
1. **onDisconnect directly to Firestore**: Not possible - onDisconnect only works with RTDB
2. **Track locks in RTDB separately**: Redundant - presence already tracks user state
3. **Cloud Functions**: Requires additional infrastructure and costs

### Chosen Approach
- Leverages existing presence system
- One monitor for the entire app
- Simple, maintainable, no extra infrastructure

## Files Modified

1. **`src/utils/lockCleanup.ts`** (new)
   - `initializeLockCleanup()`: Sets up the presence monitor
   - `unlockShapesForUser()`: Unlocks all shapes for a user

2. **`src/App.tsx`**
   - Initializes lock cleanup on app mount
   - Cleanup on unmount

3. **`src/components/Layout/Navbar.tsx`**
   - Added `unlockUserShapes()` call before sign-out
   - Ensures immediate unlock (doesn't wait for presence removal)

4. **`src/utils/devUtils.ts`**
   - Added `unlockUserShapes()` utility function
   - Updated `clearAllShapes()` to handle locked shapes gracefully
   - Shows helpful message when shapes can't be deleted due to locks

5. **`firestore.rules`**
   - **NOT modified** - maintains security (users can only delete unlocked shapes or their own locks)

## Testing

### Test Scenarios
1. ✅ **Manual sign-out**: Locks immediately removed
2. ✅ **Browser close**: Locks removed within ~5 seconds
3. ✅ **Network disconnect**: Locks removed when Firebase detects disconnect
4. ✅ **Tab close**: Same as browser close
5. ✅ **Computer sleep**: Locks removed when connection times out

### Manual Testing
```bash
# User 1: Lock some shapes
# User 2: Try to edit - should be blocked
# User 1: Close browser/tab
# User 2: Wait ~5 seconds, shapes should unlock automatically
```

## Security

- Firestore rules **NOT changed** for deletions (maintains security)
- Only users can unlock their own shapes via manual unlock
- Auto-unlock uses Firestore queries (allowed for authenticated users)
- No way for malicious users to unlock others' shapes through the UI

## Performance

- **One listener** for entire app (not per shape)
- **Batch unlock** using Firestore query + Promise.all
- **Non-blocking** presence updates
- **Minimal reads**: Only queries when users actually disconnect

