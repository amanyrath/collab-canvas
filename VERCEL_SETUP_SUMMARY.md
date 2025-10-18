# Vercel Serverless Backend - Setup Summary

## ✅ What Was Implemented

You now have a **production-ready Vercel deployment** with secure API key management!

### 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Local Development (npm run dev)       │
├─────────────────────────────────────────┤
│  Frontend → Direct LLM                  │
│  VITE_OPENAI_API_KEY ⚠️ Exposed        │
│  ✅ Safe for testing only               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Production (Vercel)                    │
├─────────────────────────────────────────┤
│  Frontend → /api/agent/chat             │
│             ↓                           │
│  Serverless Function (secure)           │
│  ├─ OPENAI_API_KEY ✅ Server-side      │
│  ├─ TAVILY_API_KEY ✅ Server-side      │
│  └─ Calls OpenAI API                    │
└─────────────────────────────────────────┘
```

### 📁 New Files Created

#### Backend (Serverless Functions)
- `api/health.ts` - Health check endpoint
- `api/agent/chat.ts` - Main agent endpoint (handles LLM calls)

#### Frontend (API Client)
- `src/api/agentApi.ts` - Client for calling backend API
- `src/agent/backendExecutor.ts` - Backend execution logic
- `src/utils/keyManager.ts` - Enhanced with backend detection

#### Configuration
- `vercel.json` - Vercel deployment config
- `.vercelignore` - Files to exclude from deployment
- `.env.production.example` - Production environment template

#### Documentation
- `VERCEL_DEPLOYMENT.md` - Complete deployment guide
- `API_KEY_SECURITY_IMPLEMENTATION.md` - Security architecture
- `SECURITY.md` - General security guidelines

### 🔧 Modified Files

- `src/hooks/useAgent.ts` - Auto-detects backend vs local mode
- `package.json` - Added `@vercel/node` dependency
- `env.example` - Added `VITE_USE_BACKEND_API` flag

## 🎯 How It Works

### Development Mode (Local Testing)

```bash
# .env file
VITE_USE_BACKEND_API=false
VITE_OPENAI_API_KEY=sk-proj-your-key   # Exposed (dev only!)

# Run dev server
npm run dev
```

The app uses the local LLM directly. Keys are exposed to the browser, but **this is OK for local testing only**.

### Production Mode (Vercel)

```bash
# Vercel Environment Variables
VITE_USE_BACKEND_API=true              # Frontend
OPENAI_API_KEY=sk-proj-your-key        # Server-side only!
TAVILY_API_KEY=tvly-your-key           # Server-side only!

# Deploy
vercel --prod
```

The frontend calls `/api/agent/chat`, which runs on the server with secure access to API keys.

## 🚀 Quick Start

### 1. Test Locally (Optional)

```bash
# Install Vercel CLI
npm install -g vercel

# Start local dev server with serverless functions
vercel dev

# Your app runs at http://localhost:3000
# API routes work at http://localhost:3000/api/*
```

### 2. Deploy to Vercel

#### Option A: GitHub (Easiest)

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables (see below)
5. Deploy!

#### Option B: CLI

```bash
vercel login
vercel
```

### 3. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

**Build Variables** (exposed to frontend):
```
VITE_USE_BACKEND_API=true
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=your_db_url
VITE_USE_EMULATOR=false
```

**Server Variables** (SECURE - not exposed):
```
OPENAI_API_KEY=sk-proj-your-openai-key
TAVILY_API_KEY=tvly-your-tavily-key
FRONTEND_URL=https://your-app.vercel.app
```

## 🧪 Testing Your Deployment

### 1. Health Check

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T...",
  "service": "CollabCanvas Agent API",
  "version": "1.0.0"
}
```

### 2. Test Agent Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a red circle at 200, 300",
    "canvasContext": {"shapes": [], "selectedShapes": [], "viewport": {"x": 0, "y": 0, "scale": 1}},
    "userId": "test-user"
  }'
```

### 3. Verify Keys Not Exposed

1. Open your deployed app in browser
2. Open DevTools → Network tab
3. Send an agent command
4. Check the request payloads - **should NOT see** `sk-` keys
5. Check the JavaScript bundle - **should NOT see** `sk-` keys

## 💰 Cost Estimate

### Vercel (Free Tier Sufficient)
- ✅ 100 GB bandwidth/month
- ✅ 100 GB-Hours serverless execution/month
- ✅ More than enough for a personal/small project

### OpenAI
- Model: GPT-4o-mini
- Cost per request: ~$0.0002
- 1000 requests: ~$0.20
- 10,000 requests: ~$2.00

**Total monthly cost for moderate use**: ~$2-5

## 🔒 Security Checklist

After deployment, verify:

- [ ] No `VITE_OPENAI_API_KEY` in production environment variables
- [ ] No `VITE_TAVILY_API_KEY` in production environment variables
- [ ] `VITE_USE_BACKEND_API=true` in production
- [ ] `OPENAI_API_KEY` set (without VITE_ prefix) in Vercel
- [ ] Health endpoint returns 200: `/api/health`
- [ ] Agent endpoint works via browser
- [ ] No API keys visible in Network tab payloads
- [ ] No API keys in View Source of deployed app

## 🐛 Common Issues

### "Backend API not available"

**Cause**: Frontend can't reach the API

**Fix**:
1. Check `/api/health` endpoint responds
2. Verify `VITE_USE_BACKEND_API=true` in build settings
3. Redeploy after changing environment variables

### "Server configuration error"

**Cause**: `OPENAI_API_KEY` not set on server

**Fix**:
1. Go to Vercel → Settings → Environment Variables
2. Add `OPENAI_API_KEY` (without VITE_ prefix!)
3. Redeploy

### Build fails validation

**Cause**: `VITE_OPENAI_API_KEY` detected in build

**Fix**:
1. Remove `VITE_OPENAI_API_KEY` from Vercel environment variables
2. Add `OPENAI_API_KEY` instead (no VITE_ prefix)
3. Ensure `VITE_USE_BACKEND_API=true`

## 📚 Next Steps

### Recommended Enhancements

1. **Rate Limiting**
   - Add rate limiting to `/api/agent/chat`
   - Prevent abuse and control costs

2. **Caching**
   - Cache common agent responses
   - Reduce OpenAI API calls

3. **Monitoring**
   - Enable Vercel Analytics
   - Monitor OpenAI usage in their dashboard
   - Set up cost alerts

4. **Firebase App Check**
   - Add App Check to verify requests
   - Extra layer of security

5. **Streaming Support**
   - Implement streaming in backend API
   - Better UX with token-by-token responses

### Development Workflow

```bash
# Local development (with exposed keys)
npm run dev

# Local testing with Vercel dev server
vercel dev

# Deploy to preview (automatic on PR)
git push origin feature-branch

# Deploy to production
vercel --prod
# or merge PR to main (if connected to GitHub)
```

## 📖 Documentation

- **Full Deployment Guide**: `VERCEL_DEPLOYMENT.md`
- **Security Details**: `SECURITY.md`
- **Implementation Details**: `API_KEY_SECURITY_IMPLEMENTATION.md`

## 🎉 You're Done!

Your CollabCanvas app is now production-ready with:
- ✅ Secure API key management
- ✅ Serverless backend on Vercel
- ✅ Build validation to prevent exposure
- ✅ Flexible dev/prod modes
- ✅ Comprehensive documentation

**Deploy and enjoy! 🚀**

