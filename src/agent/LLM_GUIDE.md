# LLM Module Guide

## Overview

The LLM (Large Language Model) module provides a configured ChatOpenAI instance for the AI Canvas Agent. It handles initialization, configuration, and testing of the OpenAI GPT-4o-mini model through LangChain.

## Files

- `llm.ts` - Main LLM initialization and configuration
- `types.ts` - TypeScript type definitions
- `LLM_GUIDE.md` - This documentation

## Quick Start

```typescript
import { getLLM, testLLM } from './agent/llm';

// Get singleton LLM instance
const llm = getLLM();

// Or initialize with custom config
import { initializeLLM } from './agent/llm';
const customLLM = initializeLLM({
  model: 'gpt-4o-mini',
  temperature: 0.5,
  streaming: true
});

// Test connection
const result = await testLLM();
console.log(result.success ? 'Working!' : result.error);
```

## Configuration

### Default Settings

```typescript
{
  model: 'gpt-4o-mini',      // Fast, cost-effective model
  temperature: 0.3,           // Low = more deterministic
  streaming: true,            // Enable token streaming
  maxTokens: 1000            // Reasonable limit
}
```

### Why These Settings?

**Model: GPT-4o-mini**
- Optimized for speed and cost
- Good reasoning capabilities
- Perfect for structured outputs (JSON)
- ~80% cheaper than GPT-4

**Temperature: 0.3**
- Lower temperature = more consistent outputs
- Important for generating valid JSON
- Reduces randomness in command interpretation
- Still allows some creativity for layout decisions

**Streaming: Enabled**
- Better user experience (progressive updates)
- User sees AI "thinking" in real-time
- Reduces perceived latency
- Can display partial results

**Max Tokens: 1000**
- Typical canvas command: 200-300 tokens
- Buffer for complex multi-step operations
- Prevents runaway costs
- Adjust if needed for batch operations

## Model Comparison

| Model | Speed | Cost/1M Tokens | Use Case |
|-------|-------|----------------|----------|
| GPT-4o-mini | Fast | $0.15 in / $0.60 out | Canvas commands (chosen) |
| GPT-4o | Medium | $2.50 in / $10.00 out | Complex reasoning |
| GPT-4 | Slower | $30 in / $60 out | Maximum accuracy |
| GPT-3.5-turbo | Fastest | $0.50 in / $1.50 out | Simple tasks |

**Recommendation**: GPT-4o-mini provides the best balance for canvas operations.

## Cost Analysis

### Typical Command Costs

**Simple command** ("Create a red circle"):
- Input: ~400 tokens (system prompt + context + user message)
- Output: ~150 tokens (JSON action + summary)
- Cost: **$0.00015** (~0.015 cents)

**Complex command** ("Create a login form with inputs"):
- Input: ~600 tokens
- Output: ~400 tokens
- Cost: **$0.00033** (~0.033 cents)

**Batch operation** ("Arrange 10 shapes in a grid"):
- Input: ~800 tokens
- Output: ~600 tokens
- Cost: **$0.00048** (~0.048 cents)

### Development Cost Estimates

- 100 test commands: ~$0.02
- 1000 test commands: ~$0.20
- Full day of development (~500 commands): ~$0.10

**Monthly estimate** (active development):
- ~10,000 commands/month: ~$2-3
- Actual usage likely lower with caching

### Production Cost Estimates

- 100 users × 10 commands/day × 30 days = 30,000 commands
- Cost: ~$6-9/month
- Per user: ~$0.006-0.009/month

## Temperature Guide

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0.0 | Deterministic | Testing, debugging |
| 0.3 | Mostly consistent | Canvas commands (chosen) |
| 0.5 | Balanced | Creative layouts |
| 0.7 | More creative | Design suggestions |
| 1.0 | Highly random | Experimental features |

**Current setting (0.3)** is ideal for:
- Consistent JSON output
- Reliable command interpretation
- Predictable behavior
- Still flexible for spatial reasoning

## API Key Management

### Getting Your Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy immediately (you won't see it again!)

### Setting Up

Add to `.env` file:
```bash
VITE_OPENAI_API_KEY=sk-proj-your-actual-key-here
```

**Security Notes:**
- Never commit `.env` file (it's in `.gitignore`)
- Never share API keys publicly
- Rotate keys if exposed
- Use different keys for dev/staging/prod

### Billing Setup

1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Add a payment method
3. Set usage limits (recommended: $10/month for development)
4. Enable email alerts for usage thresholds

## Testing

### Quick Test
```bash
node scripts/test-llm.js
```

### Skip API Call (free)
```bash
node scripts/test-llm.js --skip-api-call
```

### Programmatic Test
```typescript
import { testLLM } from './agent/llm';

const result = await testLLM();
if (result.success) {
  console.log('✅ LLM working:', result.response);
} else {
  console.error('❌ Error:', result.error);
}
```

## Troubleshooting

### Error: API key not found

**Solution:**
```bash
# Check .env file exists
ls -la .env

# Check variable name (must start with VITE_)
grep VITE_OPENAI_API_KEY .env

# Restart dev server
npm run dev
```

### Error: Invalid API key

**Causes:**
- Key copied incorrectly (extra spaces, line breaks)
- Key revoked or deleted on OpenAI platform
- Wrong format (should start with `sk-`)

**Solution:**
1. Generate new key on OpenAI platform
2. Copy entire key carefully
3. Update `.env` file
4. Restart server

### Error: Insufficient quota

**Cause:** No billing enabled or credits exhausted

**Solution:**
1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Add payment method
3. Purchase credits or enable auto-recharge
4. Wait ~5 minutes for activation

### Error: Rate limit exceeded

**Cause:** Too many requests too quickly

**Solution:**
- Wait 60 seconds
- Implement request throttling
- Upgrade to higher rate limit tier if needed

### Streaming not working

**Check:**
```typescript
const llm = initializeLLM({ streaming: true });
console.log('Streaming enabled:', llm.streaming);
```

**If false:**
- Check LangChain version (update if needed)
- Verify OpenAI SDK version
- Check browser WebSocket support

## Advanced Usage

### Custom Configuration

```typescript
import { initializeLLM } from './agent/llm';

const llm = initializeLLM({
  model: 'gpt-4o-mini',
  temperature: 0.5,        // More creative
  streaming: true,
  openaiApiKey: 'sk-...'   // Override env var
});
```

### Multiple LLM Instances

```typescript
// Deterministic for commands
const commandLLM = initializeLLM({ temperature: 0.1 });

// Creative for suggestions
const suggestLLM = initializeLLM({ temperature: 0.7 });
```

### Cost Tracking

```typescript
import { estimateCost } from './agent/llm';

const inputTokens = 500;
const outputTokens = 200;
const cost = estimateCost(inputTokens, outputTokens);

console.log(`Estimated cost: $${cost.toFixed(6)}`);
```

## Best Practices

1. **Use Singleton**: Call `getLLM()` instead of `initializeLLM()` repeatedly
2. **Cache Results**: Store common responses to reduce API calls
3. **Set Budgets**: Configure usage limits in OpenAI dashboard
4. **Monitor Costs**: Check dashboard regularly
5. **Test Locally**: Use test script before integration
6. **Handle Errors**: Always wrap LLM calls in try-catch
7. **Log Usage**: Track token counts for optimization

## Next Steps

Once LLM is initialized:
1. ✅ Task 2 complete
2. → Task 3: Create tooling layer
3. → Task 4: Define prompt schema
4. → Task 5: Build agent executor

See `ai-process/agent_tasklist.md` for full roadmap.

