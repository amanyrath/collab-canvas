# Prompt Optimization for Speed

## Current Architecture (Inefficient)
Every request sends:
- System prompt with all rules/examples (~2000 tokens)
- Canvas context (varies)
- User message (~10-50 tokens)

**Total per request: ~2100+ tokens**

---

## Optimized Architecture

### Split into System (Cached) + User (Dynamic)

```javascript
// SYSTEM MESSAGE (sent once, cached by OpenAI for ~5 minutes)
const SYSTEM_PROMPT = `You are a creative designer AI for CollabCanvas.
[All rules, color palette, examples - STATIC CONTENT]`

// USER MESSAGE (sent per request - SMALL)
const userMessage = `CANVAS: ${minimalContext}
USER: "${message}"
JSON:`
```

**Result: ~50-200 tokens per request (10x faster!)**

---

## Implementation Strategy

### 1. Move to System/User Message Pattern

**Current (one big prompt):**
```javascript
const prompt = `You are AI...
[2000 tokens of rules/examples]
CONTEXT: ${shapes}
User: "${message}"`

llm.invoke(prompt)
```

**Optimized (system + user):**
```javascript
const systemPrompt = `You are AI...
[2000 tokens of rules/examples - CACHED]`

const userPrompt = `CANVAS: ${minimalShapes}
USER: "${message}"`

llm.invoke([
  { role: "system", content: systemPrompt },
  { role: "user", content: userPrompt }
])
```

### 2. Minimize Canvas Context

**Current (verbose):**
```json
[
  {"id":"abc-123","type":"rectangle","x":200,"y":200,"width":100,"height":100,"fill":"#3b82f6","text":"Login","textColor":"#000","fontSize":14,"createdBy":"user123","createdAt":"...","isLocked":false}
]
```

**Optimized (minimal):**
```json
[{"id":"abc-123","t":"rect","x":200,"y":200,"w":100,"h":100,"c":"#3b82f6","txt":"Login"}]
```

Or even:
```
Shapes: abc-123@200,200 rect 100×100 #3b82f6 "Login"
```

**Savings: ~80% fewer tokens for context**

### 3. Smart Context Filtering

Only send relevant shapes:
```javascript
function getRelevantContext(shapes, message) {
  // For "move it" or "change it" - send only locked/selected shapes
  if (message.includes("it") || message.includes("that")) {
    return shapes.filter(s => s.isLocked).slice(-3) // Last 3 selected
  }
  
  // For "arrange all" - send all shapes but minimal fields
  if (message.includes("all") || message.includes("arrange")) {
    return shapes.map(s => ({ id: s.id, x: s.x, y: s.y }))
  }
  
  // For create operations - send minimal or no context
  if (message.includes("create") || message.includes("make")) {
    return [] // No context needed!
  }
  
  // Default: last 10 shapes only
  return shapes.slice(-10)
}
```

### 4. Compress Examples

**Current example (3 lines):**
```
User: "Create a button that says Login"
{"reasoning":"create login button with text","actions":[{"type":"CREATE","shape":"rectangle","x":300,"y":300,"width":120,"height":50,"fill":"#22c55e","text":"Login"}],"summary":"Created login button"}
```

**Compressed (1 line):**
```
"button Login" → {"actions":[{"type":"CREATE","shape":"rectangle","x":300,"y":300,"width":120,"height":50,"fill":"#22c55e","text":"Login"}],"summary":"Login button"}
```

Remove "reasoning" and "User:" prefix.

---

## Concrete Implementation

### File: `api/agent/chat.ts`

```typescript
// STATIC SYSTEM PROMPT (cached by OpenAI)
const SYSTEM_PROMPT = `Creative designer AI for CollabCanvas. Design with shapes.

CANVAS: 5000×5000px | SHAPES: rectangle, circle

COLORS: #ef4444(red) #f97316(orange) #f59e0b(amber) #22c55e(green) #10b981(emerald) #3b82f6(blue) #8b5cf6(violet) #ec4899(pink) #6b7280(gray) #CCCCCC(light-gray)

OUTPUT: {"actions":[{type,shape,x,y,width,height,fill,text}],"summary":"text"}

TYPES:
CREATE: {type:"CREATE",shape:"rectangle|circle",x,y,width?,height?,fill?,text?}
MOVE: {type:"MOVE",shapeId,x,y}
UPDATE: {type:"UPDATE",shapeId,fill?,text?}
DELETE: {type:"DELETE",shapeId}

DESIGN:
- Creative: use 5-50 shapes for rich designs
- Sizing: buttons 80-200×40-70, inputs 200-500×45-60, headers 300-1000×60-100
- Text: always add to UI elements
- Color: purposeful, varied
- Position: 0-5000, size 20-1000

EXAMPLES:
"red circle" → {"actions":[{type:"CREATE",shape:"circle",x:300,y:300,fill:"#ef4444"}]}

"login form" → {"actions":[
  {type:"CREATE",shape:"rectangle",x:300,y:200,width:400,height:60,fill:"#3b82f6",text:"Login"},
  {type:"CREATE",shape:"rectangle",x:300,y:280,width:400,height:50,fill:"#CCCCCC",text:"Username"},
  {type:"CREATE",shape:"rectangle",x:300,y:350,width:400,height:50,fill:"#CCCCCC",text:"Password"},
  {type:"CREATE",shape:"rectangle",x:300,y:420,width:400,height:50,fill:"#22c55e",text:"Submit"}
]}

"make it blue" [context: id=abc] → {"actions":[{type:"UPDATE",shapeId:"abc",fill:"#3b82f6"}]}

Be creative. Layer shapes. Use color. Design beautifully.`;

// Function to get minimal context
function getMinimalContext(shapes: any[], message: string): string {
  // For creation commands, no context needed
  if (/create|make|add|design|build/i.test(message)) {
    return "empty";
  }
  
  // For "it/that" commands, only show selected/locked shapes
  if (/\b(it|that|this)\b/i.test(message)) {
    const selected = shapes.filter(s => s.isLocked);
    if (selected.length === 0) return "empty";
    return selected.slice(0, 3).map(s => 
      `${s.id}:${s.type} ${s.x},${s.y} ${s.width}×${s.height} ${s.fill}`
    ).join("; ");
  }
  
  // For arrange/all commands, send only IDs and positions
  if (/all|arrange|organize|align/i.test(message)) {
    return shapes.map(s => `${s.id}:${s.x},${s.y}`).join("; ");
  }
  
  // Default: last 10 shapes, minimal data
  return shapes.slice(-10).map(s => 
    `${s.id.slice(-6)}:${s.type} ${s.fill}`
  ).join("; ");
}

// In handler
const minimalContext = getMinimalContext(canvasContext?.shapes || [], message);

const response = await llm.invoke([
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: `CANVAS: ${minimalContext}\nUSER: "${message}"\nJSON:` }
]);
```

---

## Performance Gains

### Before:
- Tokens per request: ~2100
- Cost per request: ~$0.0021 (gpt-4o-mini)
- Latency: ~1500ms

### After:
- System prompt: ~800 tokens (cached, reused)
- User prompt: ~50-150 tokens
- **Total fresh tokens: 50-150** (14x reduction!)
- Cost per request: ~$0.0002 (10x cheaper)
- Latency: ~400ms (4x faster)

---

## Additional Optimizations

### 1. Use Shorter Model Name
```typescript
modelName: 'gpt-4o-mini'  // Already using this ✓
```

### 2. Lower Max Tokens
```typescript
maxTokens: 300  // Down from 500 (most responses ~150 tokens)
```

### 3. Streaming for UX (not actual speed)
```typescript
streaming: true  // Show partial results as they arrive
onToken: (token) => sendToClient(token)
```

### 4. Conversation History
Keep last 3 user messages for context:
```typescript
const messages = [
  { role: "system", content: SYSTEM_PROMPT },
  ...lastThreeMessages,  // Cached context
  { role: "user", content: currentMessage }
]
```

---

## Migration Plan

1. ✅ Draft new system/user split prompt
2. Test with current examples
3. Implement minimal context function
4. Update LangChain invocation to use message array
5. Deploy and measure latency improvement
6. Add conversation history if needed

Want me to implement this?

