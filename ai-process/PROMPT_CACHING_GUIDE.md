# Prompt Caching Implementation Guide

## Overview

OpenAI's **Prompt Caching** feature allows you to cache portions of your prompts that don't change between requests. This can:
- **Reduce costs** by 50-90% (cached tokens cost 50% less)
- **Reduce latency** by 20-80% (cached content doesn't need reprocessing)
- **Improve performance** for repeated system prompts

## How It Works

When you send a prompt with caching enabled:
1. First request: Full cost, prompt is cached
2. Subsequent requests: Cached portion costs 50% less and processes faster
3. Cache TTL: 5-10 minutes (automatically managed by OpenAI)

## Current Implementation vs. Cached

### Current (No Caching)
Every request sends:
```
System Prompt (2000+ tokens) + Canvas State (100-500 tokens) + User Query (10-50 tokens)
= 2110-2550 tokens per request
```

### With Caching
First request: Same cost
Subsequent requests (within cache window):
```
System Prompt (CACHED - 50% cost, faster) + Canvas State + User Query
= ~1000-1300 token cost equivalent
```

## Implementation Options

### Option 1: LangChain with Caching (Recommended)

LangChain supports OpenAI's caching via model configuration:

```typescript
// src/agent/llm.ts
import { ChatOpenAI } from '@langchain/openai';

export function initializeLLM(config?: Partial<typeof DEFAULT_CONFIG>): ChatOpenAI {
  return new ChatOpenAI({
    ...DEFAULT_CONFIG,
    ...config,
    modelKwargs: {
      // Enable prompt caching for system messages
      cache_prompt: true,
    },
  });
}
```

### Option 2: Restructure Message Format

OpenAI caches based on the **prefix** of your messages. To maximize caching:

```typescript
// src/agent/executor.ts

// BEFORE (current):
const messages = [
  new SystemMessage(createSystemPrompt(canvasState, userContext)),
  new HumanMessage(command),
];

// AFTER (with caching):
const messages = [
  // Static system prompt - ALWAYS cached after first request
  new SystemMessage(SYSTEM_PROMPT), // The large, unchanging prompt
  
  // Dynamic context - separate message, not cached
  new SystemMessage(`
CURRENT CANVAS STATE:
${formatCanvasState(canvasState)}

CURRENT USER: ${userContext.userId}
  `),
  
  new HumanMessage(command),
];
```

### Option 3: Use OpenAI API Directly (More Control)

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
      // Mark this message for caching
      cache_control: { type: 'ephemeral' },
    },
    {
      role: 'system',
      content: formatCanvasState(canvasState),
      // Don't cache - changes every request
    },
    {
      role: 'user',
      content: command,
    },
  ],
  stream: true,
  max_tokens: 2000,
});
```

## Recommended Implementation Steps

### Step 1: Split System Prompt
Separate static content (rules, examples) from dynamic content (canvas state):

```typescript
// src/agent/prompts/system.ts

// Static - cacheable
export const STATIC_SYSTEM_PROMPT = `You are an AI assistant...
[All rules, examples, capabilities]
`;

// Dynamic - not cacheable
export function createDynamicContext(
  canvasState: CanvasState,
  userContext: UserContext
): string {
  return `
CURRENT CANVAS STATE:
Canvas Size: ${canvasState.canvasWidth}x${canvasState.canvasHeight}
Shapes on canvas: ${canvasState.shapes.length}
${formatShapes(canvasState.shapes)}

CURRENT USER: ${userContext.userId}
  `;
}
```

### Step 2: Update Executor

```typescript
// src/agent/executor.ts

const messages = [
  // Static prompt - cached after first use
  new SystemMessage(STATIC_SYSTEM_PROMPT),
  
  // Dynamic context - fresh every time
  new SystemMessage(createDynamicContext(canvasState, userContext)),
  
  new HumanMessage(command),
];
```

### Step 3: Enable Caching in LLM Config

```typescript
// src/agent/llm.ts

const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.1,
  streaming: true,
  maxTokens: 2000,
  modelKwargs: {
    cache_prompt: true, // Enable caching
  },
};
```

## Expected Improvements

### Cost Savings
- First request: $0.00015 per 1000 input tokens
- Cached requests: $0.000075 per 1000 cached tokens (50% off)
- With 2000-token system prompt: **~$0.00015 savings per request**
- At 1000 requests/day: **~$4.50/month savings**

### Latency Improvements
- Typical reduction: **200-500ms faster**
- Complex prompts: **Up to 1-2 seconds faster**
- Our case (2000-token system prompt): **~300-600ms improvement**

### Performance Target Achievement
Current: 8-12 seconds for complex commands
With caching: **6-10 seconds** (closer to sub-2s for simple commands)

## Caveats & Considerations

### ✅ Pros
- Automatic cost reduction (50% for cached portions)
- Faster response times
- No behavioral changes to agent
- Easy to implement

### ⚠️ Considerations
- Cache TTL is 5-10 minutes (automatic)
- First request after cache expiry pays full cost
- Only works for identical prompt prefixes
- Canvas state changes don't break caching (it's in a separate message)

### 📋 Best Practices
1. **Keep static content at the start** of your message array
2. **Put dynamic content in separate messages** after the cached content
3. **Don't modify the system prompt frequently** during development
4. **Monitor cache hit rates** in OpenAI dashboard

## Implementation Priority

Given your rubric goals:
- **Performance**: ⭐⭐⭐ High priority - 20-50% latency reduction
- **Cost**: ⭐⭐ Medium priority - 50% savings on input tokens
- **Complexity**: ⭐ Low - Simple refactor, minimal code changes

**Recommendation**: Implement after achieving 8+ command types, as it's a relatively easy optimization that doesn't affect functionality.

## Testing Cache Effectiveness

```typescript
// Add logging to measure cache hits
console.time('LLM Response');
const response = await llm.invoke(messages);
console.timeEnd('LLM Response');

// Check response headers (if using OpenAI API directly)
// response.headers['openai-cache-hit'] === 'true'
```

## Alternative: GPT-4o with Larger Context Window

If caching doesn't provide enough improvement, consider:
- **GPT-4o** (not mini): Larger context, faster processing
- **Structured outputs**: Force JSON schema compliance
- **Batch processing**: Group multiple commands

## Next Steps

1. ✅ Fix JSON truncation (maxTokens: 2000) - **DONE**
2. ⏳ Test current performance with increased token limit
3. ⏳ Implement prompt caching if sub-2s not achieved
4. ⏳ Monitor cost/latency improvements in production

---

**Status**: Ready to implement  
**Estimated effort**: 2-3 hours  
**Expected improvement**: 30-50% latency reduction, 50% cost reduction on input tokens

