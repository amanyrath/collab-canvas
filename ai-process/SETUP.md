# AI Agent Setup Guide

This guide walks you through setting up the LangChain-based AI agent for CollabCanvas.

## Prerequisites

- Node.js 18+ installed
- npm package manager
- OpenAI API key
- Tavily API key

## 1. Get Your API Keys

### OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again!)
5. **Note**: OpenAI charges per token. GPT-4o-mini is cost-effective (~$0.15 per 1M input tokens)

### Tavily API Key

1. Go to [https://tavily.com/](https://tavily.com/)
2. Sign up for a free account
3. Navigate to your API settings
4. Copy your API key
5. **Note**: Tavily offers a free tier with limited searches per month

## 2. Configure Environment Variables

1. **Copy the example file:**
   ```bash
   cp env.example .env
   ```

2. **Open `.env` in your editor** (NOT in Cursor if you want to keep keys private)

3. **Add your API keys:**
   Find these lines:
   ```bash
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_TAVILY_API_KEY=your_tavily_api_key_here
   ```

4. **Replace with your actual keys:**
   ```bash
   VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   VITE_TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
   ```

5. **Save the file** (`.env` is in `.gitignore` and won't be committed)

## 3. Install Dependencies

```bash
npm install
```

This will install:
- `langchain` - Core LangChain framework
- `@langchain/openai` - OpenAI integration
- `@langchain/core` - Core abstractions
- `@langchain/community` - Community tools
- `tavily` - Tavily search SDK

## 4. Verify Setup

Run the verification script:

```bash
node scripts/test-agent-setup.js
```

**Expected output:**
```
✅ Environment check passed
✅ VITE_OPENAI_API_KEY is set
✅ VITE_TAVILY_API_KEY is set
✅ All dependencies installed
✅ Agent setup complete!
```

**If you see errors:**
- `❌ VITE_OPENAI_API_KEY not found` - Check your `.env` file
- `❌ VITE_TAVILY_API_KEY not found` - Check your `.env` file
- Module not found errors - Run `npm install` again

## 5. Start Development

```bash
npm run dev
```

The AI agent will be available through the chat interface in the app.

## Troubleshooting

### Environment variables not loading

**Problem:** Keys not found even though they're in `.env`

**Solution:**
1. Restart your development server (`npm run dev`)
2. Verify `.env` is in the project root (same level as `package.json`)
3. Check that variable names start with `VITE_` prefix
4. No spaces around `=` sign in `.env` file

### API Key Invalid

**Problem:** "Invalid API key" errors

**Solution:**
1. Verify you copied the full key (no spaces or line breaks)
2. Check the key hasn't been revoked on the provider's dashboard
3. For OpenAI: Ensure you have billing enabled and credits available

### Module Not Found Errors

**Problem:** Import errors for langchain packages

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Cost Concerns

**Estimated costs for development:**
- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Typical command: 500 input tokens + 200 output tokens = $0.00019 (~$0.0002)
- 100 test commands ≈ $0.02
- Tavily: Free tier typically includes 1000 searches/month

**To minimize costs:**
- Use shorter prompts during development
- Cache results when possible
- Set up usage alerts in OpenAI dashboard
- Use Tavily sparingly (only when needed for context)

## Security Notes

- **Never commit `.env` file** - It's in `.gitignore` by default
- **Never share API keys** - Rotate keys if accidentally exposed
- **Use environment-specific keys** - Different keys for dev/staging/prod
- **Monitor usage** - Check OpenAI and Tavily dashboards regularly

## Next Steps

Once setup is complete, see:
- `src/agent/README.md` - Agent architecture overview
- `ai-process/agent_prd.md` - Full requirements
- `ai-process/agent_tasklist.md` - Implementation roadmap

