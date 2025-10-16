# AI Canvas Agent Architecture

## Overview

The AI Canvas Agent is a LangChain-powered system that interprets natural language commands and manipulates the CollabCanvas through a structured tooling layer.

## Architecture Diagram

```
User Input (Chat)
    ↓
LangChain Agent (GPT-4o-mini)
    ↓
ReAct Reasoning Loop
    ├─→ Canvas Tools (create, move, resize, delete, arrange)
    ├─→ Tavily Search (contextual knowledge)
    └─→ Canvas State Context
    ↓
Structured JSON Actions
    ↓
Action Validator
    ↓
Firebase + Zustand Mutations
    ↓
Canvas Updates (synced to all users)
```

## Core Components

### 1. LLM Module (`llm.ts`)
- Initializes GPT-4o-mini with LangChain
- Configuration: `temperature=0.3`, streaming enabled
- Handles API key management from environment

### 2. Tooling Layer (`tools/`)
- **Canvas Tools** - Direct interface to canvas operations
  - `createShape`: Add rectangles/circles
  - `moveShape`: Reposition objects
  - `resizeShape`: Change dimensions
  - `deleteShape`: Remove objects
  - `arrangeShapes`: Layout multiple objects
- **Tavily Tool** - Search for design/layout knowledge

### 3. Prompt System (`prompts/`)
- System prompt defines agent role and constraints
- Context builder includes current canvas state
- Enforces structured JSON output format

### 4. Agent Executor (`executor.ts`)
- ReAct framework for reasoning
- Tool selection and execution
- Streaming output support

### 5. Action Validator (`validator.ts`)
- Schema validation for JSON actions
- Boundary checking (canvas limits)
- Safety constraints (no excessive operations)

### 6. React Integration (`/components/Chat/`)
- Chat UI for command input
- Streaming response display
- Action execution feedback

## Command Flow Example

**User Input:**
> "Create a red circle at position 200, 300 and a blue rectangle next to it"

**Agent Processing:**
1. **Reasoning**: Identify two shape creation requests with spatial relationship
2. **Tool Selection**: Use Canvas Tools (createShape)
3. **Action Generation**:
   ```json
   {
     "actions": [
       {
         "type": "CREATE",
         "shape": "circle",
         "x": 200,
         "y": 300,
         "fill": "#ef4444",
         "width": 100,
         "height": 100
       },
       {
         "type": "CREATE",
         "shape": "rectangle",
         "x": 320,
         "y": 300,
         "fill": "#3b82f6",
         "width": 100,
         "height": 100
       }
     ],
     "summary": "Created a red circle and positioned a blue rectangle beside it."
   }
   ```

**Execution:**
4. Validate JSON structure
5. Check canvas boundaries
6. Execute Firebase/Zustand mutations
7. Stream summary back to user
8. Sync to all connected users

## Technology Stack

- **LangChain**: Agent framework and tooling abstractions
- **OpenAI GPT-4o-mini**: Fast, cost-effective reasoning
- **Tavily**: Contextual search for design knowledge
- **Firebase + Zustand**: Existing canvas state management
- **TypeScript**: Type safety throughout

## Design Principles

1. **Deterministic Outputs**: Low temperature for consistent JSON
2. **Structured Actions**: Validated schema prevents errors
3. **Real-time Collaboration**: All AI actions sync via Firebase
4. **Safety First**: Boundary checks and constraint validation
5. **Modular Tools**: Easy to extend with new capabilities
6. **Streaming UX**: Progressive feedback for better experience

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Response Time | < 3 seconds | ⏳ In Development |
| Accuracy | ≥ 80% | ⏳ In Development |
| Streaming Latency | < 500ms visible delay | ⏳ In Development |
| Multi-user Sync | Real-time propagation | ✅ Existing System |
| Command Coverage | ≥ 8 distinct types | ⏳ In Development |

## Directory Structure

```
src/agent/
├── README.md              # This file
├── llm.ts                 # LLM initialization
├── executor.ts            # Agent executor with ReAct
├── validator.ts           # Action validation
├── tools/
│   ├── canvas.ts         # Canvas manipulation tools
│   └── tavily.ts         # Tavily search integration
├── prompts/
│   ├── system.ts         # System prompt templates
│   └── context.ts        # Context builder
└── types.ts              # TypeScript definitions
```

## Testing Strategy

1. **Unit Tests**: Individual tools and validators
2. **Integration Tests**: Full command execution flow
3. **Manual Testing**: Real user commands
4. **Multi-user Tests**: Concurrent AI usage
5. **Performance Tests**: Response time and accuracy metrics

## Future Enhancements

- Memory module for conversation context
- Function calling for stricter schema enforcement
- Advanced layout algorithms (auto-layout, grid systems)
- Image generation integration
- Component library support
- Undo/redo for AI actions
- Batch operation optimization
- Natural language queries about canvas state

## Development Status

**Current Phase**: Task 1 - Setup ✅  
**Next Phase**: Task 2 - LLM Initialization

See `ai-process/agent_tasklist.md` for full roadmap.

