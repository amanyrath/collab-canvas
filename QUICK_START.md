# CollabCanvas - Quick Start Guide

Get CollabCanvas running in 5 minutes! This guide is for developers who want to start contributing or testing the app quickly.

---

## 🚀 Lightning Fast Setup

```bash
# 1. Clone
git clone https://github.com/amanyrath/collabcanvas-fresh.git
cd collabcanvas-fresh

# 2. Install
npm install

# 3. Configure
cp env.example .env

# 4. Run (Terminal 1)
firebase emulators:start

# 5. Run (Terminal 2)
npm run dev

# 6. Open browser
open http://localhost:5173
```

**Done!** You're now running CollabCanvas with Firebase emulators.

---

## 📝 What You Need to Know

### Default Configuration

The `.env` file is pre-configured for Firebase emulators:
- ✅ No Firebase account needed
- ✅ No costs or quotas
- ✅ Full functionality
- ✅ Multi-user testing works

### Emulator Ports

| Service | Port | URL |
|---------|------|-----|
| UI Dashboard | 4000 | http://localhost:4000 |
| Auth | 9099 | - |
| Firestore | 8080 | - |
| Realtime DB | 9000 | - |
| App | 5173 | http://localhost:5173 |

### First Steps

1. **Create an account** at http://localhost:5173
   - Use any email/password (emulator accepts anything)
   - Example: `test@test.com` / `password123`

2. **Test basic features**:
   - Click `R` → Click canvas → Create rectangle
   - Click `C` → Click canvas → Create circle
   - Click shape to select
   - Drag to move
   - Use corner handles to resize

3. **Test multi-user** (open in multiple browsers):
   - Chrome: `test1@test.com`
   - Firefox: `test2@test.com`
   - Watch cursors and shapes sync in real-time!

---

## 🎨 Common Tasks

### Creating Shapes

| Action | Method |
|--------|--------|
| Select tool | Press `V` (select), `R` (rectangle), `C` (circle) |
| Create shape | Click on canvas while tool is active |
| Quick color | Press `1` (grey), `2` (red), `3` (green), `4` (blue) |

### Selecting Shapes

| Action | Method |
|--------|--------|
| Single select | Click shape |
| Multi-select | Shift + Click shapes |
| Drag select | Shift + Drag box around shapes |
| Select all | Cmd/Ctrl + A |

### Editing Shapes

| Action | Method |
|--------|--------|
| Move | Drag selected shape(s) |
| Resize | Drag corner/edge handles |
| Delete | Select + Delete/Backspace |
| Change color | Select + Use color picker in sidebar |

### Navigation

| Action | Method |
|--------|--------|
| Pan | Space + Drag OR Two-finger scroll |
| Zoom | Mouse wheel OR Pinch gesture |
| Reset view | Refresh page |

---

## 🤖 AI Features (Optional)

To enable AI design assistant:

### 1. Get API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Tavily**: https://tavily.com/ (optional, for web search)

### 2. Update .env

```env
VITE_OPENAI_API_KEY=sk-...your-key...
VITE_TAVILY_API_KEY=tvly-...your-key...
```

### 3. Test Setup

```bash
node scripts/test-agent-setup.js
```

### 4. Try Commands

Open chat panel and try:
- "Create a red circle at 300, 400"
- "Make 10 random shapes"
- "Create a login form"
- "Arrange all shapes in a grid"

---

## 🔧 Development Tools

### Admin Panel

Access via 🛠️ button in navbar:
- **Create Random Shapes**: Generate test data (1-500 shapes)
- **Clear All Locks**: Fix stuck locks
- **Delete All Shapes**: Reset canvas

### Browser Console Commands

```javascript
// Development mode only
clearAllLocks()          // Clear all locks
clearAllShapes()         // Delete everything
getPerformanceStats()    // Check FPS
```

### Firebase Emulator UI

Visit http://localhost:4000 to:
- View all users (Authentication tab)
- Inspect shapes (Firestore tab)
- Check presence data (Realtime Database tab)
- Clear all data between tests

---

## 🐛 Common Issues

### Port Already in Use

```bash
# Kill process on port
lsof -ti:5173 | xargs kill -9  # Dev server
lsof -ti:4000 | xargs kill -9  # Emulator UI
```

### Emulators Not Starting

```bash
# Install Java (required by emulators)
brew install openjdk@11  # macOS

# Or use without emulators (requires Firebase account)
# Update .env: VITE_USE_EMULATOR=false
```

### Shapes Not Syncing

1. Check Firebase emulator is running (http://localhost:4000)
2. Check browser console for errors
3. Refresh page
4. Clear emulator data and restart

### Can't See Other Users

- Make sure you're signed in as different users
- Open in different browser types or incognito windows
- Check presence sidebar on the right

---

## 📚 Next Steps

### For Users
- Read [README.md](./README.md) - Full feature documentation
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) - How it works
- Try all keyboard shortcuts (press `?` in app)

### For Developers
- Read [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
- Check [src/agent/README.md](./src/agent/README.md) - AI features
- Explore [ai-process/](./ai-process/) - Development docs

### For Deployers
- Read [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Deploy to Vercel
- Review [SECURITY.md](./SECURITY.md) - Security best practices
- Set up Firebase project (if not using emulators)

---

## 🎯 Testing Checklist

Before submitting code:
- [ ] Tested locally with emulators
- [ ] Opened in 2+ browsers (multi-user test)
- [ ] No console errors
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Features work as expected

---

## 💡 Pro Tips

1. **Use emulators for development** - Free, fast, no quotas
2. **Test with multiple browsers** - Easiest way to test collaboration
3. **Check emulator UI** - Great for debugging (http://localhost:4000)
4. **Use keyboard shortcuts** - Much faster than clicking
5. **Enable Performance Display** - See FPS in real-time
6. **Clear data between tests** - Use admin panel or emulator UI

---

## 🆘 Need Help?

1. **Check the docs**:
   - [README.md](./README.md) - General info
   - [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical deep dive

2. **Search issues**: [GitHub Issues](https://github.com/amanyrath/collabcanvas-fresh/issues)

3. **Open an issue**: Describe your problem with details

4. **Check console**: Browser console often shows the problem

---

## ⚡ Speed Run (30 seconds)

```bash
git clone https://github.com/amanyrath/collabcanvas-fresh.git && \
cd collabcanvas-fresh && \
npm install && \
cp env.example .env && \
firebase emulators:start &
npm run dev
```

Wait for both to start, then open http://localhost:5173

**You're in! Start creating! 🎨**

---

*For detailed setup instructions, see [README.md](./README.md)*
*For contributing guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md)*

