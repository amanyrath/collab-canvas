# 🎨 CollabCanvas

> **Real-Time Collaborative Design Tool** - A modern multiplayer canvas application with AI-powered design assistance built with React, Firebase, and Konva.js

![CollabCanvas Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.3-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.14-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Development](#-development)
- [Architecture](#-architecture)
- [AI Agent Features](#-ai-agent-features)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

CollabCanvas is a real-time collaborative design tool that allows multiple users to create, edit, and interact with shapes on a shared canvas. Built with modern web technologies, it provides smooth multiplayer experiences with instant synchronization across all connected users, enhanced with AI-powered design assistance.

### ✨ Features

#### Real-time Collaboration
- **🔥 Real-time Sync** - Multiple users work simultaneously with <100ms sync latency
- **👥 Multiplayer Cursors** - See where other users are working with colorblind-friendly colors
- **🔒 Smart Locking** - Prevent conflicts with automatic shape locking using Firestore transactions
- **🎭 Presence Awareness** - See who's online and what they're editing in real-time

#### Canvas Features
- **🎨 Interactive Shapes** - Create rectangles, circles, and triangles with customizable colors
- **🎄 Christmas Textures** - Apply festive textures with Santa's Magic button
- **🎯 Multi-Select** - Select and move multiple shapes together (Shift+Click or drag-select)
- **📐 Boundary Constraints** - Shapes stay within canvas bounds during drag and resize
- **🚀 Optimistic Updates** - Instant UI feedback with background Firebase synchronization
- **⌨️ Keyboard Shortcuts** - Power-user features for efficient workflow

#### AI-Powered Features
- **🤖 AI Design Assistant** - Natural language commands to create and manipulate shapes
- **💬 Intelligent Chat** - LangChain-powered agent with ReAct reasoning
- **🔍 Web Search** - Agent can research design patterns and best practices via Tavily
- **🎨 Complex Layouts** - Create login forms, navigation bars, and UI components with simple commands

#### Developer Experience
- **♿ Accessibility** - Colorblind-friendly palette for user cursors
- **🛠️ Admin Tools** - Create random shapes for testing, clear locks, and manage canvas
- **📊 Performance Monitor** - Real-time FPS and performance metrics
- **🔧 Debug Tools** - Browser console commands for testing and debugging

---

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast development and optimized builds
- **Konva.js + React-Konva** - High-performance 2D canvas graphics
- **Tailwind CSS** - Utility-first styling for responsive UI

### Backend & Services
- **Firebase Authentication** - Secure user authentication
- **Firestore** - Real-time NoSQL database for shapes and persistent data
- **Realtime Database** - Ultra-fast presence and cursor tracking
- **Vercel Functions** - Serverless API for secure AI integration

### AI & Intelligence
- **LangChain** - AI agent framework with ReAct pattern
- **OpenAI GPT-4** - Natural language understanding and generation
- **Tavily API** - Web search integration for contextual design assistance

### State Management
- **Zustand** - Lightweight, performant state management

---

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/amanyrath/collabcanvas-fresh.git
cd collabcanvas-fresh

# 2. Install dependencies
npm install

# 3. Copy environment template
cp env.example .env

# 4. Start Firebase emulators (in one terminal)
firebase emulators:start

# 5. Start dev server (in another terminal)
npm run dev

# 6. Open http://localhost:5173 in your browser
```

That's it! You're now running CollabCanvas locally with Firebase emulators.

---

## 📦 Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Firebase CLI** (optional, for emulators)
  ```bash
  npm install -g firebase-tools
  ```

### Step 1: Clone the Repository

```bash
git clone https://github.com/amanyrath/collabcanvas-fresh.git
cd collabcanvas-fresh
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React and related libraries
- Firebase SDK
- Konva.js for canvas rendering
- LangChain and AI dependencies
- Development tools

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp env.example .env
```

#### Option A: Local Development with Emulators (Recommended)

For local development without Firebase costs:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_DATABASE_URL=http://localhost:9000/?ns=demo-project

# Use emulators
VITE_USE_EMULATOR=true

# AI Features (optional for basic canvas features)
VITE_USE_BACKEND_API=false
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_TAVILY_API_KEY=your_tavily_api_key_here
```

#### Option B: Production Firebase

For production deployment or testing with real Firebase:

```env
# Firebase Configuration (get these from Firebase Console)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Disable emulators
VITE_USE_EMULATOR=false

# For production, use backend API
VITE_USE_BACKEND_API=true
```

> **🔒 Security Note**: Never commit your `.env` file. API keys prefixed with `VITE_` are exposed to the browser. For production, use serverless functions to keep AI API keys secure.

### Step 4: Start Firebase Emulators (Local Development)

If using emulators, start them in a separate terminal:

```bash
firebase emulators:start
```

The Firebase Emulator UI will be available at http://localhost:4000

Services running:
- **Authentication**: localhost:9099
- **Firestore**: localhost:8080
- **Realtime Database**: localhost:9000

### Step 5: Start Development Server

In a new terminal window:

```bash
npm run dev
```

The application will start at **http://localhost:5173**

### Step 6: Create Your First Account

1. Open http://localhost:5173 in your browser
2. Click "Register" or "Sign Up"
3. Create a test account with any email/password
4. Start collaborating!

### Testing Multi-User Features

To test real-time collaboration, open the app in multiple browsers:

**Method 1: Different Browsers**
```
Chrome → http://localhost:5173 (User A)
Firefox → http://localhost:5173 (User B)
Safari → http://localhost:5173 (User C)
```

**Method 2: Incognito Windows**
```
Regular Chrome → User A
Chrome Incognito (⌘+Shift+N / Ctrl+Shift+N) → User B
Another Chrome Incognito → User C
```

**Method 3: Browser Profiles**
```
Create separate Chrome profiles for each test user
```

---

## 🔧 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server at http://localhost:5173 |
| `npm run build` | Build optimized production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |
| `firebase emulators:start` | Start Firebase emulators (separate terminal) |

### Project Structure

```
collabcanvas-fresh/
├── src/
│   ├── agent/              # AI agent implementation
│   │   ├── executor.ts     # Command executor
│   │   ├── llm.ts          # LangChain LLM setup
│   │   ├── prompts/        # System prompts
│   │   └── tools/          # LangChain tools
│   ├── api/                # API integration
│   │   └── agentApi.ts     # Vercel function API client
│   ├── components/
│   │   ├── Auth/           # Authentication components
│   │   ├── Canvas/         # Canvas, shapes, cursors, presence
│   │   ├── Chat/           # AI chat interface
│   │   ├── Comments/       # Commenting system
│   │   ├── Debug/          # Performance monitoring
│   │   └── Layout/         # Navbar and layout
│   ├── constants/          # Texture manifests and constants
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Authentication hook
│   │   ├── useShapeSync.ts # Shape synchronization
│   │   ├── useAgent.ts     # AI agent hook
│   │   └── ...             # Other hooks
│   ├── store/              # Zustand state management
│   │   ├── canvasStore.ts  # Canvas state
│   │   └── userStore.ts    # User state
│   ├── utils/              # Utility functions
│   │   ├── firebase.ts     # Firebase initialization
│   │   ├── shapeUtils.ts   # Shape CRUD operations
│   │   ├── lockUtils.ts    # Lock management
│   │   ├── presenceUtils.ts# Presence tracking
│   │   └── ...             # Other utilities
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
├── api/                    # Vercel serverless functions
│   └── agent/
│       └── chat.ts         # AI agent API endpoint
├── public/
│   └── textures/           # Christmas texture assets
├── scripts/                # Development scripts
│   ├── test-agent-setup.js # Verify AI agent setup
│   ├── test-llm.js         # Test LLM connection
│   └── validate-build.js   # Build security validation
├── ai-process/             # Development documentation
├── ARCHITECTURE.md         # Detailed architecture guide
├── CONTRIBUTING.md         # Contribution guidelines
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
├── database.rules.json     # Realtime Database rules
└── vercel.json             # Vercel deployment config
```

### Development Workflow

1. **Feature Development**
   ```bash
   # Create a feature branch
   git checkout -b feature/your-feature-name
   
   # Make changes
   # Test locally with emulators
   npm run dev
   
   # Lint your code
   npm run lint
   
   # Build to check for issues
   npm run build
   ```

2. **Testing**
   - Test with Firebase emulators first
   - Open multiple browsers to test collaboration
   - Use the Debug panel to monitor performance
   - Check browser console for errors

3. **Code Quality**
   - Follow TypeScript best practices
   - Use ESLint to catch issues
   - Keep components small and focused
   - Add comments for complex logic

### Debug Tools

**Admin Panel** (🛠️ button in navbar):
- Create random shapes for stress testing
- Clear all locks if shapes are stuck
- Delete all shapes to reset canvas

**Browser Console Commands** (Dev mode):
```javascript
clearAllLocks()          // Clear stuck locks
clearAllShapes()         // Delete all shapes
getPerformanceStats()    // View FPS and metrics
```

---

## 🏗 Architecture

CollabCanvas uses a **lock-based collaboration model** where selection equals locking. This prevents race conditions and ensures data consistency across multiple users.

### Key Architectural Decisions

1. **Optimistic Updates**: UI updates instantly, Firebase syncs in background
2. **Two-Database Strategy**: 
   - Firestore for persistent data (shapes, comments)
   - Realtime Database for transient data (cursors, presence)
3. **Virtual Group Multi-Select**: Shapes move together without actual Konva Groups
4. **Presence-Based Lock Cleanup**: Auto-release locks when users disconnect
5. **ReAct Agent Pattern**: AI agent uses reasoning and action cycles

### Core Components

| Component | Purpose |
|-----------|---------|
| `Canvas.tsx` | Main canvas, tool selection, keyboard shortcuts, zoom/pan |
| `ShapeLayer.tsx` | Shape rendering, selection, dragging, resizing (most complex!) |
| `SimpleCursorLayer.tsx` | Real-time multiplayer cursors |
| `FastPresenceSidebar.tsx` | Online users list with status indicators |
| `AgentChat.tsx` | AI chat interface with LangChain integration |
| `Navbar.tsx` | User info, admin tools, logout with presence cleanup |

### State Management

**Zustand Stores:**
- `canvasStore`: Shapes, selection, optimistic updates
- `userStore`: Authentication, user profile, cursor color

**Key Utils:**
- `shapeUtils.ts`: CRUD operations for shapes (Firestore)
- `lockUtils.ts`: Lock management with Firestore transactions
- `presenceUtils.ts`: Real-time presence (RTDB)
- `firebase.ts`: Firebase initialization and emulator config

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🤖 AI Agent Features

CollabCanvas includes an AI-powered design assistant built with LangChain.

### Capabilities

The AI agent can understand natural language commands like:

**Creation Commands:**
- "Create a red circle at 200, 300"
- "Make a blue rectangle 150x200 at 500, 400"
- "Create 10 random colored shapes"
- "Build a login form"
- "Design a navigation bar with 4 menu items"

**Manipulation Commands:**
- "Move the selected shape to 600, 700"
- "Make it twice as big"
- "Change the color to green"
- "Delete that shape"
- "Arrange all shapes horizontally"

**Complex Commands:**
- "Create a card layout with title and button"
- "Design a Christmas tree"
- "Build a color palette with 5 colors"

### Setup AI Features

1. **Get API Keys**
   - OpenAI API Key: https://platform.openai.com/api-keys
   - Tavily API Key: https://tavily.com/ (for web search)

2. **Configure Environment**
   ```env
   VITE_OPENAI_API_KEY=sk-...
   VITE_TAVILY_API_KEY=tvly-...
   VITE_USE_BACKEND_API=false
   ```

3. **Test Setup**
   ```bash
   node scripts/test-agent-setup.js
   ```

4. **Use AI Chat**
   - Open the chat panel in the app
   - Type natural language commands
   - Watch the AI create and manipulate shapes!

> **🔒 Production**: For production deployments, set `VITE_USE_BACKEND_API=true` and configure serverless functions to keep API keys secure.

For detailed AI documentation, see [src/agent/README.md](./src/agent/README.md)

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

Vercel provides the best experience with zero-config deployment and serverless functions for AI features.

**Quick Deploy:**

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Vite configuration

3. **Configure Environment Variables**
   
   Add these in Vercel Dashboard → Settings → Environment Variables:
   ```
   VITE_USE_EMULATOR=false
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   
   # For AI features
   VITE_USE_BACKEND_API=true
   OPENAI_API_KEY=sk-...
   TAVILY_API_KEY=tvly-...
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys automatically
   - Get your production URL!

**Automatic Deployments:**
- Every push to `main` → Production deployment
- Every PR → Preview deployment

For detailed deployment guide, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Deploy to Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Deploy to Netlify

```bash
# Build command: npm run build
# Publish directory: dist
# Add same environment variables as Vercel
```

---

## 🐛 Troubleshooting

### Canvas Not Loading

**Symptom**: Blank screen or loading indefinitely

**Solution**:
1. Check browser console for errors
2. Verify `.env` file exists and has correct values
3. If using emulators, ensure they're running:
   ```bash
   firebase emulators:start
   ```
4. Clear browser cache and hard reload (Ctrl+Shift+R)

### Shapes Not Syncing

**Symptom**: User A creates shape, User B doesn't see it

**Solution**:
1. Check Firestore emulator connection at http://localhost:4000
2. Look for `ERR_CONNECTION_RESET` in console
3. Ensure emulators use `127.0.0.1` not `localhost` in connection strings
4. Verify Firestore rules allow reads/writes

### Cursors Not Appearing

**Symptom**: Can't see other users' cursors

**Solution**:
1. Check Realtime Database connection
2. Verify RTDB rules allow reads
3. Check presence data in Firebase console
4. Ensure `VITE_FIREBASE_DATABASE_URL` is correct

### Orphaned Locks

**Symptom**: Shape locked but user is offline

**Solution**:
1. Use Admin Panel → Clear All Locks
2. Wait for automatic cleanup on disconnect
3. Check `usePresenceMonitor` is running

### AI Agent Not Responding

**Symptom**: AI chat doesn't respond to commands

**Solution**:
1. Verify API keys are set in `.env`
2. Run: `node scripts/test-agent-setup.js`
3. Check OpenAI billing and quota
4. Look for error messages in browser console
5. Ensure network connectivity

### Build Errors

**Symptom**: `npm run build` fails

**Solution**:
1. Check for TypeScript errors: `npx tsc --noEmit`
2. Run linter: `npm run lint`
3. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Performance Issues

**Symptom**: Slow rendering or laggy interactions

**Solution**:
1. Check Performance Display (top-right corner)
2. Limit shapes on canvas (admin tools)
3. Reduce number of concurrent users
4. Check browser console for warnings
5. Close other tabs and applications

For more troubleshooting, see [ARCHITECTURE.md](./ARCHITECTURE.md) or open an issue on GitHub.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Quick Contributing Guide

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly
4. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Built With
- [React](https://react.dev/) - UI framework
- [Konva.js](https://konvajs.org/) - High-performance 2D canvas library
- [Firebase](https://firebase.google.com/) - Backend and real-time infrastructure
- [LangChain](https://www.langchain.com/) - AI agent framework
- [OpenAI](https://openai.com/) - GPT-4 language model
- [Zustand](https://github.com/pmndrs/zustand) - Lightweight state management
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [Vite](https://vitejs.dev/) - Lightning-fast build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety

### Inspiration
- [Figma](https://www.figma.com/) - Multiplayer interactions and UX patterns
- [Excalidraw](https://excalidraw.com/) - Collaborative whiteboard simplicity
- [tldraw](https://tldraw.com/) - Canvas performance optimizations

### AI Development
- Built with assistance from [Claude](https://anthropic.com/claude) (Anthropic)
- Documentation-first approach throughout development
- Iterative refinement based on real-world testing

### Special Thanks
- Paul Tol for colorblind-friendly color schemes
- Firebase team for excellent real-time infrastructure
- Konva.js community for canvas rendering solutions
- LangChain team for AI agent framework

---

## 📞 Support & Links

**Documentation:**
- 📖 [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical deep dive
- 📋 [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute
- 🤖 [AI Agent Guide](./src/agent/README.md) - AI features documentation
- 📁 [Development Docs](./ai-process/) - Process documentation

**Repository:**
- 🔗 [GitHub](https://github.com/amanyrath/collabcanvas-fresh)
- 🐛 [Report Issues](https://github.com/amanyrath/collabcanvas-fresh/issues)
- 💡 [Feature Requests](https://github.com/amanyrath/collabcanvas-fresh/issues/new)

**Connect:**
- 💼 [LinkedIn](https://linkedin.com/in/alexismanyrath)

---

<div align="center">

**Made with ❤️ using AI-assisted development**

*CollabCanvas © 2025 | MIT License*

[⬆ Back to Top](#-collabcanvas)

</div>
