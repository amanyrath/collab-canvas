# CollabCanvas

> **Real-Time Collaborative Design Tool** - A modern multiplayer canvas application built with React, Firebase, and Konva.js

![CollabCanvas Demo](https://img.shields.io/badge/Status-MVP%20Complete-brightgreen)
![React](https://img.shields.io/badge/React-18.3-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.14-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

## 🎯 Overview

CollabCanvas is a real-time collaborative design tool that allows multiple users to create, edit, and interact with shapes on a shared canvas. Built with modern web technologies, it provides smooth multiplayer experiences with instant synchronization across all connected users.

### ✨ Key Features

- **🔥 Real-time Collaboration** - Multiple users can work simultaneously with instant updates
- **🎨 Interactive Canvas** - Create rectangles and circles with color customization
- **👥 Multiplayer Cursors** - See where other users are working in real-time
- **🔒 Smart Locking** - Prevent conflicts with automatic shape locking
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices
- **🚀 Optimistic Updates** - Instant UI feedback with Firebase synchronization
- **⌨️ Keyboard Shortcuts** - Power-user features for efficient workflow

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Canvas**: Konva.js + React-Konva for high-performance 2D graphics
- **Backend**: Firebase (Authentication, Firestore, Real-time Database)
- **State Management**: Zustand for lightweight state management
- **Styling**: Tailwind CSS for modern, responsive UI
- **Build**: Vite for fast development and optimized builds

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase project with Authentication and Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/collab-canvas.git
   cd collab-canvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password and Google Sign-in)
   - Enable Firestore Database
   - Copy your Firebase config to `src/utils/firebase.ts`

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Sign up/login to start collaborating!

### Production Build

```bash
npm run build
npm run preview
```

## 🎮 How to Use

### Canvas Controls

- **Create Shapes**: Click empty space on canvas to create rectangles
- **Select Shapes**: Click on any shape to select and edit it
- **Move Shapes**: Drag selected shapes to reposition them
- **Resize Shapes**: Drag corner or edge handles to resize (hold Shift for aspect ratio lock)
- **Change Colors**: Use the color picker to modify shape appearance
- **Delete Shapes**: Press `Delete` or `Backspace` to remove selected shapes

### Navigation

- **Pan Canvas**: 
  - Trackpad scroll (Figma-style)
  - Space + drag (power users)
- **Zoom**: 
  - Mouse wheel
  - Cmd/Ctrl + trackpad scroll
  - Pinch gestures on mobile

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Select Rectangle tool |
| `C` | Select Circle tool |
| `1` | Red color |
| `2` | Green color |
| `3` | Blue color |
| `4` | Grey color |
| `Delete/Backspace` | Delete selected shape |
| `Space + Drag` | Pan canvas |
| `Shift + Resize` | Maintain aspect ratio while resizing |

## 🏗 Architecture

### Core Components

- **Canvas**: Main drawing surface with shape rendering and interactions
- **ShapeSelector**: Tool picker for shapes and colors with preference tracking
- **PresenceSidebar**: Shows connected users and their cursor positions
- **Auth System**: Handles user authentication and session management

### State Management

- **canvasStore**: Manages shapes, selection, and optimistic updates
- **userStore**: Handles user authentication and profile data
- **Real-time Sync**: Firebase integration for multiplayer functionality

### Key Features Implementation

- **Multiplayer Locking**: Prevents editing conflicts between users
- **Optimistic Updates**: Instant UI feedback with eventual consistency
- **Cursor Tracking**: Real-time cursor positions for spatial awareness
- **Preference Persistence**: Remembers user's creation preferences

## 📁 Project Structure

```
src/
├── components/
│   ├── Canvas/           # Canvas components and layers
│   ├── Auth/            # Authentication components
│   └── Layout/          # UI layout components
├── hooks/               # Custom React hooks
├── store/               # Zustand state stores
├── utils/               # Utilities and Firebase config
└── ai-process/          # AI development documentation
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run dev:emulator` - Start Firebase emulators
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Firebase Setup

1. **Authentication**:
   - Enable Email/Password provider
   - Enable Google Sign-in provider
   - Configure authorized domains

2. **Firestore Security Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /shapes/{shapeId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## 🤖 AI Development Process

This project was developed with AI assistance. The `ai-process/` folder contains:

- **Product Requirements**: Detailed MVP specifications
- **Architecture Documentation**: System design and component structure  
- **Task Checklists**: Development milestone tracking
- **Optimization Plans**: Performance and UX improvements
- **Debug Logs**: Issue resolution and troubleshooting
- **Improvement Summaries**: Feature enhancements and lessons learned

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables for Firebase config
3. Deploy automatically on every push to main

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## 🐛 Troubleshooting

### Common Issues

- **Canvas not loading**: Check Firebase configuration and network connectivity
- **Shapes not syncing**: Verify Firestore rules and authentication
- **Performance issues**: Check for console errors and network throttling

### Debug Tools

Open browser console and run:
```javascript
clearAllLocks() // Clear stuck shape locks (dev mode only)
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

- Built with assistance from Claude AI (Anthropic)
- Inspired by modern collaborative design tools like Figma
- Uses the excellent Konva.js library for 2D canvas rendering
- Firebase for real-time backend infrastructure

---

**Live Demo**: [Coming Soon]  
**Documentation**: See `ai-process/` folder for detailed development docs  
**Issues**: Please report bugs and feature requests in GitHub Issues