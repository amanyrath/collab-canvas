# Contributing to CollabCanvas

Thank you for your interest in contributing to CollabCanvas! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Questions](#questions)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18.x or higher
- npm or yarn
- Git
- A code editor (VS Code recommended)
- Firebase CLI (optional, for local testing)

### Quick Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/collabcanvas-fresh.git
cd collabcanvas-fresh

# 3. Add upstream remote
git remote add upstream https://github.com/amanyrath/collabcanvas-fresh.git

# 4. Install dependencies
npm install

# 5. Copy environment template
cp env.example .env

# 6. Start development
npm run dev
```

---

## Development Setup

### Local Development with Firebase Emulators

For local development without Firebase costs:

1. **Configure .env for emulators:**
   ```env
   VITE_USE_EMULATOR=true
   VITE_FIREBASE_PROJECT_ID=demo-project
   # ... other demo values
   ```

2. **Start emulators:**
   ```bash
   firebase emulators:start
   ```

3. **In another terminal, start dev server:**
   ```bash
   npm run dev
   ```

### Testing AI Features

If working on AI agent features:

1. **Get API keys:**
   - OpenAI: https://platform.openai.com/api-keys
   - Tavily: https://tavily.com/

2. **Add to .env:**
   ```env
   VITE_OPENAI_API_KEY=sk-...
   VITE_TAVILY_API_KEY=tvly-...
   ```

3. **Test setup:**
   ```bash
   node scripts/test-agent-setup.js
   ```

---

## Project Structure

```
src/
├── agent/              # AI agent implementation (LangChain, tools, prompts)
├── api/                # API integration (Vercel functions client)
├── components/         # React components
│   ├── Auth/           # Authentication components
│   ├── Canvas/         # Canvas-related components
│   ├── Chat/           # AI chat interface
│   ├── Comments/       # Commenting system
│   ├── Debug/          # Development tools
│   └── Layout/         # Layout components
├── constants/          # Constants and configurations
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── utils/              # Utility functions
│   ├── firebase.ts     # Firebase initialization
│   ├── shapeUtils.ts   # Shape operations
│   ├── lockUtils.ts    # Lock management
│   └── presenceUtils.ts# Presence tracking
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

### Key Files to Know

| File | Purpose | Complexity |
|------|---------|------------|
| `components/Canvas/Canvas.tsx` | Main canvas component, tools, keyboard | Medium |
| `components/Canvas/ShapeLayer.tsx` | Shape rendering, selection, drag/resize | **High** |
| `store/canvasStore.ts` | Canvas state management | Medium |
| `utils/shapeUtils.ts` | Shape CRUD operations | Low |
| `utils/lockUtils.ts` | Lock management with transactions | Medium |
| `agent/executor.ts` | AI command execution | High |

---

## Development Workflow

### 1. Choose What to Work On

- Check [open issues](https://github.com/amanyrath/collabcanvas-fresh/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it

### 2. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 3. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Keep commits focused and atomic

### 4. Test Your Changes

```bash
# Lint your code
npm run lint

# Build to check for errors
npm run build

# Test manually in the browser
npm run dev
```

**Testing Checklist:**
- [ ] Code builds without errors
- [ ] No ESLint warnings
- [ ] Feature works as expected
- [ ] Doesn't break existing features
- [ ] Works in multiple browsers (Chrome, Firefox, Safari)
- [ ] Works with multiple users (open in multiple browser windows)

### 5. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add shape rotation feature"
```

**Commit Message Format:**
```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```bash
git commit -m "feat: add undo/redo functionality"
git commit -m "fix: resolve cursor sync issue when user disconnects"
git commit -m "docs: update README with new keyboard shortcuts"
git commit -m "refactor: simplify lock cleanup logic"
```

### 6. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Go to GitHub and create a Pull Request
```

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define interfaces for data structures
- Avoid `any` types when possible
- Use type inference where appropriate

```typescript
// Good
interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle';
  x: number;
  y: number;
  fill: string;
}

// Bad
const shape: any = { ... };
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract complex logic into custom hooks
- Use meaningful prop names

```typescript
// Good
interface ShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ShapeComponent({ shape, isSelected, onSelect }: ShapeProps) {
  // Component logic
}

// Bad - unclear prop names
export function Shape({ s, sel, fn }) {
  // Component logic
}
```

### State Management

- Use Zustand stores for global state
- Use local state (useState) for component-specific state
- Keep state updates immutable
- Document complex state transitions

```typescript
// Good - immutable update
const addShape = (shape: Shape) => {
  set((state) => ({
    shapes: [...state.shapes, shape]
  }));
};

// Bad - mutating state
const addShape = (shape: Shape) => {
  state.shapes.push(shape); // Don't do this!
};
```

### File Organization

- One component per file
- Co-locate related files
- Use index files to simplify imports
- Keep files under 500 lines when possible

### Comments

- Write self-documenting code
- Add comments for complex logic
- Explain "why" not "what"
- Document edge cases

```typescript
// Good - explains why
// Use Firestore transaction to prevent race conditions when multiple
// users try to lock the same shape simultaneously
await runTransaction(db, async (transaction) => {
  // ...
});

// Bad - states the obvious
// This function adds two numbers
function add(a: number, b: number) {
  return a + b; // Returns the sum
}
```

### Naming Conventions

- **Components**: PascalCase (`ShapeLayer.tsx`)
- **Functions**: camelCase (`createShape()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_SHAPES`)
- **Types/Interfaces**: PascalCase (`Shape`, `UserPresence`)
- **Files**: kebab-case for utils (`shape-utils.ts`)

---

## Testing Guidelines

### Manual Testing

Since we don't have automated tests yet, thorough manual testing is crucial:

1. **Single User Testing**
   - Test all basic features
   - Try edge cases
   - Check error handling

2. **Multi-User Testing**
   - Open app in 2-3 browser windows
   - Test collaboration features
   - Verify real-time sync
   - Test lock conflicts

3. **Performance Testing**
   - Create many shapes (100+)
   - Check FPS with Performance Display
   - Monitor memory usage
   - Test with slow network (Chrome DevTools → Network)

4. **Browser Testing**
   - Chrome (primary)
   - Firefox
   - Safari
   - Edge

### AI Agent Testing

For AI-related changes, test with:

```bash
# Run test commands
node scripts/test-command-types.js
```

Test various command types:
- Creation commands
- Manipulation commands
- Layout commands
- Complex commands

### Checklist Before Submitting

- [ ] Tested on Chrome
- [ ] Tested with multiple users
- [ ] No console errors
- [ ] Linter passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Works with Firebase emulators
- [ ] Documentation updated if needed

---

## Submitting Changes

### Pull Request Process

1. **Update Documentation**
   - Update README if adding features
   - Add comments to complex code
   - Update ARCHITECTURE.md for architectural changes

2. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference related issues (#123)
   - Provide detailed description
   - Include screenshots/videos for UI changes
   - List breaking changes (if any)

3. **Pull Request Template**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## How Has This Been Tested?
- [ ] Tested locally with emulators
- [ ] Tested with multiple users
- [ ] Tested in Chrome, Firefox, Safari
- [ ] No console errors

## Screenshots
(if applicable)

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have commented complex code
- [ ] I have updated documentation
- [ ] My changes generate no new warnings
- [ ] I have tested with multiple users
```

4. **Respond to Feedback**
   - Address review comments promptly
   - Be open to suggestions
   - Discuss alternatives if you disagree
   - Update PR based on feedback

5. **After Merge**
   - Delete your feature branch
   - Update your fork:
     ```bash
     git checkout main
     git pull upstream main
     git push origin main
     ```

---

## Reporting Bugs

### Before Reporting

1. **Search existing issues** - your bug might already be reported
2. **Test on latest version** - pull the latest changes
3. **Test with emulators** - verify it's not a Firebase configuration issue
4. **Check browser console** - look for error messages

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. macOS, Windows]
 - Browser: [e.g. chrome 120, safari 17]
 - Node version: [e.g. 18.17.0]
 - Using emulators: [yes/no]

**Additional context**
- Console errors
- Network errors
- Relevant logs
```

---

## Feature Requests

We welcome feature suggestions! Use this template:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
- Why this feature would be useful
- How it fits with existing features
- Rough implementation ideas (optional)
```

---

## Questions?

If you have questions:

1. **Check Documentation**
   - [README.md](./README.md) - General documentation
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
   - [src/agent/README.md](./src/agent/README.md) - AI features
   - [ai-process/](./ai-process/) - Development process

2. **Search Issues**
   - Look for similar questions

3. **Open a Discussion**
   - GitHub Discussions (if enabled)
   - Or open an issue with "question" label

4. **Contact Maintainers**
   - Open an issue
   - Tag with `question` label

---

## Recognition

Contributors will be:
- Listed in release notes
- Mentioned in README acknowledgments
- Credited in commit history

Thank you for contributing to CollabCanvas! 🎨✨

---

**Happy Coding!**

*For technical details, see [ARCHITECTURE.md](./ARCHITECTURE.md)*
*For setup help, see [README.md](./README.md)*

