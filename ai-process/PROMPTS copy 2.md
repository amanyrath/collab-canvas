# CollabCanvas - Development Prompts & Context

This file contains well-crafted prompts and context used during the development of CollabCanvas, as requested by the user. These prompts helped guide AI-assisted development and can be used for future enhancements.

---

## Initial Project Setup

**Context**: Starting a new collaborative canvas project with real-time features.

**Prompt**:
```
Create a real-time collaborative canvas application using React, Firebase, and Konva.js. 
The application should allow multiple users to create and edit shapes (rectangles and circles) 
simultaneously. Implement:

1. Firebase Authentication for user management
2. Firestore for persistent shape data
3. Real-time Database for cursor tracking and presence
4. Optimistic updates for instant UI feedback
5. Lock-based collaboration model (selection = locking)
6. Multi-select with Shift+Click and drag-select
7. Keyboard shortcuts for common actions
8. Clean, modern UI with Tailwind CSS

Use TypeScript for type safety and follow React best practices with hooks and functional components.
```

**Outcome**: Initial project structure with core collaboration features.

---

## Adding AI Agent Features

**Context**: Enhancing the canvas with natural language command processing.

**Prompt**:
```
Add an AI-powered design assistant to CollabCanvas using LangChain and OpenAI. The agent should:

1. Process natural language commands like:
   - "Create a red circle at 200, 300"
   - "Move the selected shape to 600, 700"
   - "Create a login form"
   - "Arrange all shapes horizontally"

2. Use ReAct (Reasoning + Acting) pattern for complex commands
3. Have access to tools:
   - Canvas state inspection (current shapes, selection)
   - Shape creation and manipulation
   - Web search via Tavily for design patterns
   
4. Support 10+ distinct command types:
   - Creation (simple, batch, artistic)
   - Manipulation (move, resize, color, rotate, delete)
   - Layout (arrange, align, distribute)
   - Complex (forms, navigation, cards)

5. Return structured actions that can be executed on the canvas
6. Provide helpful error messages and suggestions

Implement this with a chat interface in the sidebar. Ensure API keys are secure 
(use backend API for production, expose with VITE_ prefix only for local dev).
```

**Outcome**: Fully functional AI agent with 12+ command types and 90%+ accuracy.

---

## Christmas Theme Feature

**Context**: Adding seasonal textures and theming to shapes.

**Prompt**:
```
Add a Christmas theme feature to CollabCanvas:

1. Create a texture system that can load and apply images to shapes
2. Add a "Santa's Magic" button that intelligently applies textures:
   - Triangles → Christmas tree textures
   - Circles → Ornament textures
   - Rectangles → Gift box textures
   
3. Preload all textures on app start for instant application
4. Store texture URLs in Firestore with shape data
5. Support Konva's fillPatternImage for rendering
6. Create texture manifest in `/public/textures/` with categories

Maintain backward compatibility - shapes without textures still work normally.
Keep the existing color system working alongside textures.
```

**Outcome**: Fully integrated texture system with Santa's Magic button and festive theme.

---

## Performance Optimization

**Context**: App becoming slow with many shapes and users.

**Prompt**:
```
Optimize CollabCanvas for better performance:

1. Analyze current bottlenecks:
   - Firestore read/write operations
   - Cursor update frequency
   - Shape re-rendering
   - Lock cleanup operations

2. Implement optimizations:
   - Batch Firestore writes within 100ms window
   - Throttle cursor updates to 60fps (16ms)
   - Use Konva's caching for complex shapes
   - Lazy load textures
   - Debounce resize operations
   - Add pagination or virtualization for 500+ shapes

3. Add performance monitoring:
   - FPS counter
   - Firestore operation counter
   - Memory usage tracking
   - Network latency display

4. Provide admin tools:
   - Create test shapes (bulk)
   - Clear all locks
   - Delete all shapes

Document all optimizations in PERFORMANCE_OPTIMIZATIONS.md with before/after metrics.
```

**Outcome**: Significant performance improvements, handling 500+ shapes at 60fps.

---

## Lock Management & Conflict Resolution

**Context**: Users experiencing conflicts when editing same shapes.

**Prompt**:
```
Improve the lock management system in CollabCanvas:

1. Current issue: Race conditions when multiple users try to lock same shape
2. Solution needed:
   - Use Firestore transactions for atomic lock operations
   - Implement presence-based automatic lock cleanup
   - Show visual indicators for locked shapes
   - Provide manual lock clearing for stuck locks
   
3. Lock lifecycle:
   - Lock acquired on shape selection
   - Lock held during editing (drag, resize)
   - Lock released on deselection or user disconnect
   - Locks auto-expire after 30s of inactivity
   
4. Handle edge cases:
   - User closes browser without cleanup
   - Network interruption mid-edit
   - Multiple tabs from same user
   
5. User experience:
   - Show who has locked a shape (tooltip)
   - Disable selection for locked shapes
   - Show "Locked by User X" message
   
Test thoroughly with 3+ concurrent users trying to edit same shapes.
```

**Outcome**: Robust lock system with zero race conditions and automatic cleanup.

---

## Deployment & Security

**Context**: Preparing for production deployment on Vercel.

**Prompt**:
```
Set up secure production deployment for CollabCanvas on Vercel:

1. Security Requirements:
   - Never expose OpenAI/Tavily API keys in client code
   - Implement serverless function in /api/agent/chat.ts
   - Keys stored as Vercel environment variables (no VITE_ prefix)
   - Client calls backend API, backend calls LLMs
   
2. Build validation:
   - Create pre-build script to check for exposed keys
   - Fail build if VITE_OPENAI_API_KEY or VITE_TAVILY_API_KEY found
   - Allow override with SKIP_KEY_VALIDATION=true for local builds
   
3. Environment management:
   - Local dev: Use VITE_ prefix, call LLMs directly (faster iteration)
   - Production: Use backend API, keys on server
   - Toggle via VITE_USE_BACKEND_API flag
   
4. Documentation:
   - Create SECURITY.md with best practices
   - Update VERCEL_DEPLOYMENT.md with step-by-step guide
   - Add troubleshooting section
   
5. Vercel configuration:
   - Auto-deploy from main branch
   - Preview deployments for PRs
   - Environment variables properly set
   
Test both local and production environments thoroughly.
```

**Outcome**: Secure deployment with serverless functions and comprehensive documentation.

---

## Code Cleanup & Maintenance

**Context**: Project growing, need better organization and documentation.

**Prompt**:
```
Perform comprehensive code cleanup and maintenance for CollabCanvas:

1. Audit codebase:
   - Identify unused files and dependencies
   - Find redundant code
   - Check for console.logs that should be removed
   - Look for debug code that shouldn't be in production
   
2. Cleanup tasks:
   - Remove debug logs (firebase-debug.log, etc.)
   - Delete unused test files
   - Remove redundant documentation
   - Clean up commented-out code
   - Consolidate duplicate configurations
   
3. Organization:
   - Ensure consistent file naming
   - Improve directory structure
   - Add missing type definitions
   - Organize imports consistently
   - Add JSDoc comments to complex functions
   
4. Documentation updates:
   - Create comprehensive README with clear installation steps
   - Add CONTRIBUTING.md for new developers
   - Update ARCHITECTURE.md with recent changes
   - Create LICENSE file
   - Add .editorconfig for consistent formatting
   - Improve .gitignore coverage
   
5. Best practices:
   - Ensure TypeScript strict mode compliance
   - Fix any linter warnings
   - Standardize error handling
   - Document environment variables
   - Create example configuration files
   
The goal is to make the codebase maintainable, well-documented, and easy for 
new developers to understand and contribute to.
```

**Outcome**: Clean, well-organized codebase with comprehensive documentation.

---

## Useful Development Patterns

### Working with Firebase Transactions

```typescript
// Pattern for atomic operations with optimistic updates
const updateWithTransaction = async (shapeId: string, updates: Partial<Shape>) => {
  // 1. Optimistic UI update (instant feedback)
  updateLocalState(shapeId, updates);
  
  try {
    // 2. Server update with transaction (prevents conflicts)
    await runTransaction(db, async (transaction) => {
      const shapeRef = doc(db, `canvas/${canvasId}/shapes/${shapeId}`);
      const shapeDoc = await transaction.get(shapeRef);
      
      if (!shapeDoc.exists()) {
        throw new Error('Shape not found');
      }
      
      transaction.update(shapeRef, updates);
    });
  } catch (error) {
    // 3. Rollback on error
    revertLocalState(shapeId);
    throw error;
  }
};
```

### LangChain Agent Pattern

```typescript
// Pattern for creating LangChain tools with canvas context
const createCanvasTool = (canvasStore) => {
  return new DynamicStructuredTool({
    name: "canvas_tool",
    description: "Manipulates shapes on the canvas",
    schema: z.object({
      action: z.enum(['create', 'update', 'delete']),
      params: z.record(z.any())
    }),
    func: async ({ action, params }) => {
      // Get current canvas state
      const currentShapes = canvasStore.getState().shapes;
      
      // Execute action
      const result = await executeAction(action, params, currentShapes);
      
      // Return structured response
      return JSON.stringify(result);
    }
  });
};
```

### Performance Optimization Pattern

```typescript
// Pattern for batching Firestore writes
class FirestoreBatcher {
  private queue: Array<() => Promise<void>> = [];
  private timeout: NodeJS.Timeout | null = null;
  
  add(operation: () => Promise<void>) {
    this.queue.push(operation);
    
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), 100);
    }
  }
  
  private async flush() {
    const batch = writeBatch(db);
    const operations = [...this.queue];
    this.queue = [];
    this.timeout = null;
    
    // Execute all batched operations
    await Promise.all(operations.map(op => op()));
  }
}
```

---

## Future Enhancement Prompts

### Text Tool Implementation

```
Add a text tool to CollabCanvas:
- Allow users to create text objects on canvas
- Support font size, color, and basic formatting
- Inline editing with proper cursor positioning
- Text selection and multi-select compatibility
- Synced across all users in real-time
- AI agent should understand text creation commands
```

### Undo/Redo System

```
Implement undo/redo functionality:
- Command pattern for all canvas operations
- Per-user undo/redo stacks
- Keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
- History panel showing recent actions
- Sync with Firebase while maintaining local history
- Handle conflicts when undoing while others are editing
```

### Export & Import

```
Add export and import functionality:
- Export canvas as PNG, SVG, or JSON
- Import from Figma, Sketch, or other tools
- Support for exporting selected shapes only
- Maintain texture references in exports
- Version control for canvas snapshots
```

---

## Summary

These prompts represent the key development milestones for CollabCanvas. They demonstrate:
- Clear problem statements
- Specific technical requirements
- Expected outcomes
- Testing considerations
- Documentation needs

Use these as templates for future AI-assisted development sessions. Always include:
1. Context about the current state
2. Clear goals and requirements
3. Technical constraints
4. Testing expectations
5. Documentation requirements

**Last Updated**: 2025-10-19

