# 🎨 CollabCanvas

> **Real-Time Collaborative Design Tool** - A modern multiplayer canvas application built with React, Firebase, and Konva.js

![CollabCanvas Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.3-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.14-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Overview

CollabCanvas is a real-time collaborative design tool that allows multiple users to create, edit, and interact with shapes on a shared canvas. Built with modern web technologies, it provides smooth multiplayer experiences with instant synchronization across all connected users.

### ✨ Key Features

- **🔥 Real-time Collaboration** - Multiple users can work simultaneously with <100ms sync latency
- **🎨 Interactive Canvas** - Create rectangles and circles with customizable colors
- **👥 Multiplayer Cursors** - See where other users are working with colorblind-friendly colors
- **🔒 Smart Locking** - Prevent conflicts with automatic shape locking using Firestore transactions
- **🎯 Multi-Select** - Select and move multiple shapes together (Shift+Click or drag-select)
- **📐 Boundary Constraints** - Shapes stay within canvas bounds during drag and resize
- **🚀 Optimistic Updates** - Instant UI feedback with background Firebase synchronization
- **⌨️ Keyboard Shortcuts** - Power-user features for efficient workflow
- **🎭 Presence Awareness** - See who's online and what they're editing in real-time
- **♿ Accessibility** - Colorblind-friendly palette for user cursors
- **🛠️ Admin Tools** - Create random shapes for testing, clear locks, and manage canvas

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Canvas**: Konva.js + React-Konva for high-performance 2D graphics
- **Backend**: Firebase (Authentication, Firestore, Real-time Database)
- **State Management**: Zustand for lightweight state management
- **Styling**: Tailwind CSS for modern, responsive UI
- **Build**: Vite for fast development and optimized builds

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (or use local emulators for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/amanyrath/collab-canvas.git
   cd collabcanvas2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the project root:
   
   **Option A: Production Firebase**
   ```bash
   VITE_USE_EMULATOR=false
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   ```
   
   **Option B: Local Emulators (Recommended for Development)**
   ```bash
   VITE_USE_EMULATOR=true
   VITE_FIREBASE_API_KEY=demo-api-key
   VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=demo-project
   VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   VITE_FIREBASE_DATABASE_URL=http://localhost:9000/?ns=demo-project
   ```

4. **Start Firebase Emulators** (if using emulators)
   ```bash
   # Terminal 1
   firebase emulators:start
   ```

5. **Start development server**
   ```bash
   # Terminal 2
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Sign up/login to start collaborating!
   - Open multiple browser windows to test multi-user features

### Production Build

```bash
npm run build
npm run preview
```

## 🎮 How to Use

### Canvas Controls

- **Create Shapes**: 
  - Click `R` for rectangle tool, `C` for circle tool
  - Click on canvas to create shape at that position
- **Select Shapes**: 
  - Single select: Click on any shape
  - Multi-select: Shift+Click on multiple shapes OR drag-select box around shapes
- **Move Shapes**: 
  - Drag selected shapes to reposition them
  - Multi-select moves all shapes together as a group
- **Resize Shapes**: 
  - Drag corner or edge handles to resize
  - Hold Shift to maintain aspect ratio
- **Change Colors**: 
  - Use color picker in sidebar OR press `1-4` for quick colors
- **Change Shape Type**: 
  - With shape(s) selected, click rectangle or circle button to convert
- **Delete Shapes**: 
  - Press `Delete` or `Backspace` to remove selected shapes

### Navigation

- **Pan Canvas**: 
  - Trackpad: Two-finger scroll (Figma-style)
  - Mouse: Space + drag
- **Zoom**: 
  - Mouse wheel: Scroll to zoom
  - Trackpad: Pinch gesture
  - Keyboard: Cmd/Ctrl + Scroll

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select/Move tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `1` | Grey color |
| `2` | Red color |
| `3` | Green color |
| `4` | Blue color |
| `Shift + Click` | Add/remove shape from selection |
| `Delete/Backspace` | Delete selected shapes |
| `Space + Drag` | Pan canvas |
| `?` | Show help modal with all shortcuts |

### Admin Panel (Testing & Debug)

Access via the 🛠️ button in the navbar:

- **Create Random Shapes**: Generate 1-500 random shapes for testing
- **Clear All Locks**: Remove stuck locks from shapes
- **Delete All Shapes**: Nuclear option - clears entire canvas

## 🏗 Architecture

> **📖 For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

### High-Level Overview

CollabCanvas uses a **lock-based collaboration model** where selection equals locking. This prevents race conditions and ensures data consistency across multiple users.

**Key Architectural Decisions:**

1. **Optimistic Updates**: UI updates instantly, Firebase syncs in background
2. **Two-Database Strategy**: 
   - Firestore for persistent data (shapes)
   - Realtime Database for transient data (cursors, presence)
3. **Virtual Group Multi-Select**: Shapes move together without actual Konva Groups
4. **Presence-Based Lock Cleanup**: Auto-release locks when users disconnect

### Core Components

- **Canvas.tsx**: Main canvas, tool selection, keyboard shortcuts, zoom/pan
- **ShapeLayer.tsx**: Shape rendering, selection, dragging, resizing (most complex!)
- **SimpleCursorLayer.tsx**: Real-time multiplayer cursors
- **FastPresenceSidebar.tsx**: Online users list with status indicators
- **Navbar.tsx**: User info, admin tools, logout with presence cleanup

### State Management (Zustand)

- **canvasStore**: Shapes, selection, optimistic updates
- **userStore**: Authentication, user profile, cursor color

### Utils

- **shapeUtils.ts**: CRUD operations for shapes (Firestore)
- **lockUtils.ts**: Lock management with Firestore transactions
- **presenceUtils.ts**: Real-time presence (RTDB)
- **firebase.ts**: Firebase initialization and emulator config

## 📁 Project Structure

```
collabcanvas2/
├── src/
│   ├── components/
│   │   ├── Canvas/       # Canvas, shapes, cursors, presence
│   │   ├── Auth/         # Login, register, auth flow
│   │   ├── Layout/       # Navbar with admin tools
│   │   └── Debug/        # Performance display
│   ├── hooks/            # Custom React hooks (auth, sync, presence)
│   ├── store/            # Zustand state management
│   ├── utils/            # Firebase, shapes, locks, presence
│   └── main.tsx          # Entry point
├── ai-process/           # Development documentation
├── ARCHITECTURE.md       # 📖 Comprehensive architecture guide
├── README.md             # This file
├── firebase.json         # Firebase config & emulator setup
├── firestore.rules       # Firestore security rules
└── database.rules.json   # RTDB security rules
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `firebase emulators:start` - Start Firebase emulators (separate command)

### Testing Multi-User Locally

**Method 1: Multiple Browser Types**
```bash
# Best for testing - fully isolated sessions
1. Chrome → Sign in as User A
2. Firefox → Sign in as User B
3. Safari → Sign in as User C
```

**Method 2: Incognito Windows**
```bash
# Quick testing
1. Regular Chrome → User A
2. Chrome Incognito (Cmd+Shift+N) → User B
3. Another Chrome Incognito → User C
```

**Method 3: Browser Profiles**
```bash
# Convenient for frequent testing
1. Create Chrome profiles (User A, User B, User C)
2. Each profile maintains separate auth session
3. Open localhost:5173 in each profile
```

### Firebase Setup (Production)

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable billing (Blaze plan) for production use

2. **Enable Services**:
   - Authentication: Email/Password provider
   - Firestore Database: Start in production mode
   - Realtime Database: Start in locked mode

3. **Security Rules**:
   
   **Firestore** (`firestore.rules`):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /canvas/{canvasId}/shapes/{shapeId} {
         allow read: if true;
         allow create, update, delete: if request.auth != null;
       }
     }
   }
   ```
   
   **Realtime Database** (`database.rules.json`):
   ```json
   {
     "rules": {
       "sessions": {
         "$canvasId": {
           "$userId": {
             ".write": "$userId === auth.uid",
             ".read": true
           }
         }
       }
     }
   }
   ```

### Development Tools

**Browser Console Commands** (Dev mode only):
```javascript
clearAllLocks()          // Clear stuck locks
clearAllShapes()         // Delete all shapes
getPerformanceStats()    // View FPS and performance metrics
logMemoryUsage()         // Check memory consumption
```

**Performance Monitoring**:
```javascript
// Check Firestore quota usage
console.log('Firestore Reads:', localStorage.getItem('firestoreReads'))
console.log('Firestore Writes:', localStorage.getItem('firestoreWrites'))
```

## 🤖 AI-Assisted Development

This project was built with AI assistance (Claude by Anthropic). All documentation was maintained throughout development:

**Key Documentation:**
- `ARCHITECTURE.md` - Comprehensive technical guide (start here!)
- `README.md` - User guide and quick start (this file)
- `ai-process/` - Development process documentation
  - Product requirements
  - Task checklists  
  - Optimization plans
  - Debug logs
  - Improvement summaries

**Development Approach:**
- Iterative refinement with real-time bug fixing
- Performance optimization throughout
- Accessibility considerations (colorblind-friendly colors)
- Comprehensive testing of multi-user scenarios
- Documentation-first mindset

## 🚀 Deployment

### Option 1: Vercel (Recommended)

**Automatic Deployment:**
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables:
   ```
   VITE_USE_EMULATOR=false
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_AUTH_DOMAIN=xxx
   VITE_FIREBASE_PROJECT_ID=xxx
   VITE_FIREBASE_STORAGE_BUCKET=xxx
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
   VITE_FIREBASE_APP_ID=xxx
   VITE_FIREBASE_DATABASE_URL=xxx
   ```
4. Deploy! (Auto-deploys on every push to main)

### Option 2: Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# Custom domain
firebase hosting:channel:deploy production
```

### Option 3: Netlify

```bash
# Build command: npm run build
# Publish directory: dist
# Add same environment variables as Vercel
```

### Environment Variables (All Platforms)

```bash
VITE_USE_EMULATOR=false  # Set to true only for local dev
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

## 🐛 Troubleshooting

### Common Issues

**Canvas not loading**
```bash
# Check browser console for errors
# Verify .env file exists and has correct values
# For emulators: ensure firebase emulators are running
firebase emulators:start
```

**Shapes not syncing between users**
```bash
# Symptom: User A creates shape, User B doesn't see it
# Check: Firestore emulator connection
# Fix: Look for ERR_CONNECTION_RESET in console
#      Ensure emulators use 127.0.0.1 not localhost
```

**Cursors not appearing**
```bash
# Symptom: Can't see other users' cursors
# Check: Realtime Database connection
# Fix: Verify RTDB rules allow reads
#      Check presence data in Firebase console
```

**Users not disappearing from sidebar on logout**
```bash
# Symptom: Logged out users still show as "online"
# Check: Presence cleanup happens BEFORE signOut
# Fix: This is already fixed in latest version
#      Presence data is completely removed on disconnect
```

**Orphaned locks (shapes stuck as locked)**
```bash
# Symptom: Shape locked but user is offline
# Check: usePresenceMonitor is cleaning up locks
# Fix: Use admin panel → Clear All Locks
#      Or wait for automatic cleanup on disconnect
```

**Multi-select acting weird**
```bash
# Symptom: Shapes jump or don't move together
# Check: Browser console for "stale reference" errors
# Fix: This should be fixed in latest version
#      Uses fresh node references via findOne()
```

### Debug Tools

**Admin Panel** (🛠️ button in navbar):
- Create random shapes for stress testing
- Clear all locks if shapes are stuck
- Delete all shapes to reset canvas

**Browser Console Commands** (Dev mode):
```javascript
clearAllLocks()          // Emergency lock cleanup
clearAllShapes()         // Reset entire canvas
getPerformanceStats()    // Check FPS and performance
```

**Firebase Emulator UI**:
```bash
# Access at http://localhost:4000
# View Firestore data, RTDB data, Auth users
# Useful for debugging sync issues
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

**Built With:**
- [React](https://react.dev/) - UI framework
- [Konva.js](https://konvajs.org/) - High-performance 2D canvas library
- [Firebase](https://firebase.google.com/) - Backend and real-time infrastructure
- [Zustand](https://github.com/pmndrs/zustand) - Lightweight state management
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [Vite](https://vitejs.dev/) - Lightning-fast build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety

**Inspiration:**
- [Figma](https://www.figma.com/) - Multiplayer interactions and UX patterns
- [Excalidraw](https://excalidraw.com/) - Collaborative whiteboard simplicity
- [tldraw](https://tldraw.com/) - Canvas performance optimizations

**AI Development:**
- Built with assistance from [Claude](https://anthropic.com/claude) (Anthropic)
- Documentation-first approach throughout development
- Iterative refinement based on real-world testing

**Special Thanks:**
- Paul Tol for colorblind-friendly color schemes
- Firebase team for excellent real-time infrastructure
- Konva.js community for canvas rendering solutions

---

## 📞 Support & Links

**Documentation:**
- 📖 [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical deep dive
- 📋 [ai-process/](./ai-process/) - Development documentation

**Repository:**
- 🔗 [GitHub](https://github.com/amanyrath/collab-canvas)
- 🐛 [Report Issues](https://github.com/amanyrath/collab-canvas/issues)
- 💡 [Feature Requests](https://github.com/amanyrath/collab-canvas/issues/new)

**Connect:**
- 💼 [LinkedIn](https://linkedin.com/in/alexismanyrath)
- 🐦 [Twitter/X](https://twitter.com/alexismanyrath)

---

<div align="center">

**Made with ❤️ using AI-assisted development**

*CollabCanvas © 2025 | MIT License*

</div>