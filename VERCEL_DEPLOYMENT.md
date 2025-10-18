# Deploying CollabCanvas to Vercel

This guide walks you through deploying CollabCanvas to Vercel with secure API key management using serverless functions.

## 🎯 Overview

The Vercel deployment architecture:
- **Frontend**: React/Vite app served as static files
- **Backend**: Serverless functions in `/api` directory
- **API Keys**: Stored securely in Vercel environment variables (server-side only)

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional but recommended):
   ```bash
   npm install -g vercel
   ```
3. **API Keys**:
   - OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Tavily API key from [tavily.com](https://tavily.com) (optional)

## 🚀 Quick Deploy

### Option 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel serverless backend"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Configure Environment Variables**:
   In the Vercel project settings, add these environment variables:

   **Build-time variables** (exposed to frontend):
   ```
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
   VITE_USE_EMULATOR=false
   VITE_USE_BACKEND_API=true
   ```

   **Server-side variables** (SECURE - not exposed):
   ```
   OPENAI_API_KEY=sk-proj-your-openai-key-here
   TAVILY_API_KEY=tvly-your-tavily-key-here
   FRONTEND_URL=https://your-app.vercel.app
   ```

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your app

### Option 2: Deploy via CLI

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set environment variables**:
   ```bash
   # Server-side (secure)
   vercel env add OPENAI_API_KEY
   # Paste your key when prompted
   
   vercel env add TAVILY_API_KEY
   # Paste your key when prompted
   
   # Frontend URL for CORS
   vercel env add FRONTEND_URL
   # Enter your production URL
   
   # Build-time variables
   vercel env add VITE_USE_BACKEND_API
   # Enter: true
   
   vercel env add VITE_FIREBASE_API_KEY
   # Enter your Firebase API key
   
   # ... add other VITE_FIREBASE_* variables
   ```

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

## 🧪 Testing Locally with Vercel Dev

Test the serverless functions locally before deploying:

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Create `.env` file** for local testing:
   ```bash
   cp env.example .env
   ```

3. **Edit `.env`** and add your keys:
   ```env
   # Server-side keys (no VITE_ prefix for local Vercel dev)
   OPENAI_API_KEY=sk-proj-your-key-here
   TAVILY_API_KEY=tvly-your-key-here
   FRONTEND_URL=http://localhost:3000
   
   # Frontend config
   VITE_USE_BACKEND_API=true
   VITE_FIREBASE_API_KEY=your_api_key
   # ... other VITE_ vars
   ```

4. **Start Vercel dev server**:
   ```bash
   vercel dev
   ```

   This will:
   - Start the frontend on port 3000
   - Run serverless functions locally
   - Hot reload on changes

5. **Test the endpoints**:
   ```bash
   # Health check
   curl http://localhost:3000/api/health
   
   # Agent chat (requires valid request body)
   curl -X POST http://localhost:3000/api/agent/chat \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Create a red circle",
       "canvasContext": {"shapes": []},
       "userId": "test-user"
     }'
   ```

## 📁 Project Structure

```
collabcanvas-fresh/
├── api/                      # Vercel serverless functions
│   ├── health.ts            # Health check endpoint
│   └── agent/
│       └── chat.ts          # Agent chat endpoint
├── src/
│   ├── api/
│   │   └── agentApi.ts      # Frontend API client
│   ├── agent/
│   │   ├── executor.ts      # Local LLM executor (dev)
│   │   └── backendExecutor.ts  # Backend API executor (prod)
│   └── hooks/
│       └── useAgent.ts      # React hook (auto-detects backend)
├── dist/                    # Build output (auto-generated)
├── vercel.json             # Vercel configuration
└── package.json
```

## 🔧 Configuration Details

### vercel.json

The `vercel.json` file configures Vercel deployment:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ]
}
```

### Build Command

Vercel automatically runs:
```bash
npm run build
```

Which executes:
1. `node scripts/validate-build.js` - Validates no exposed keys
2. `tsc && vite build` - Compiles TypeScript and builds frontend

## 🔒 Security Features

### ✅ What's Secure

1. **API Keys**: Stored server-side only, never exposed to browser
2. **Build Validation**: Prevents deploying with `VITE_*` prefixed API keys
3. **CORS Protection**: Configurable allowed origins
4. **User Authentication**: API validates user IDs

### 🛡️ Additional Security Steps (Recommended)

1. **Set up Firebase App Check**:
   - Protects against unauthorized API usage
   - Add to your Firebase project settings

2. **Rate Limiting**:
   - Add Vercel rate limiting in `vercel.json`:
   ```json
   {
     "functions": {
       "api/**/*.ts": {
         "maxDuration": 30,
         "memory": 1024
       }
     }
   }
   ```

3. **Environment-specific CORS**:
   - Update `FRONTEND_URL` in production environment variables
   - Consider using Vercel's automatic environment URLs

4. **Monitoring**:
   - Enable Vercel Analytics
   - Monitor serverless function logs
   - Set up alerts for errors

## 🐛 Troubleshooting

### Build Fails with "Exposed API Keys" Error

**Problem**: Build validation detected `VITE_` prefixed API keys

**Solution**: 
- Remove `VITE_OPENAI_API_KEY` and `VITE_TAVILY_API_KEY` from environment variables
- Add them without `VITE_` prefix as server-side variables
- Add `VITE_USE_BACKEND_API=true` instead

### 500 Error from `/api/agent/chat`

**Problem**: Server error when calling agent endpoint

**Solutions**:
1. Check Vercel function logs: Dashboard → Functions → Logs
2. Verify `OPENAI_API_KEY` is set correctly
3. Check API key format (should start with `sk-`)
4. Ensure dependencies are installed correctly

### CORS Errors in Browser Console

**Problem**: Cross-origin request blocked

**Solutions**:
1. Set `FRONTEND_URL` environment variable to your Vercel domain
2. Check CORS headers in `api/agent/chat.ts`
3. Verify you're not using `http://` in production

### Frontend Says "Backend API Not Available"

**Problem**: Frontend can't reach the API

**Solutions**:
1. Check if `/api/health` returns 200: `curl https://your-app.vercel.app/api/health`
2. Verify `VITE_USE_BACKEND_API=true` in build settings
3. Clear browser cache and hard reload

### Local `vercel dev` Not Working

**Problem**: Serverless functions not running locally

**Solutions**:
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel login` first
3. Ensure `.env` file has `OPENAI_API_KEY` (without `VITE_` prefix)
4. Try `vercel dev --debug` for verbose output

## 📊 Monitoring & Costs

### Vercel Limits (Free Tier)

- **Bandwidth**: 100 GB/month
- **Serverless Function Execution**: 100 GB-Hours/month
- **Edge Function Execution**: 1M invocations/month

### OpenAI Costs

Each agent request uses:
- **Model**: GPT-4o-mini
- **Avg Tokens**: ~700 tokens (500 input, 200 output)
- **Cost**: ~$0.0002 per request (less than $0.01 per 50 requests)

**Estimated costs for typical usage**:
- 1000 requests/month: ~$0.20
- 10,000 requests/month: ~$2.00

### Monitoring

1. **Vercel Dashboard**:
   - View function invocations
   - Monitor bandwidth usage
   - Check error rates

2. **OpenAI Dashboard**:
   - Track API usage
   - Set usage limits
   - Monitor costs

## 🔄 Updating Your Deployment

### Quick Update (Automatic)

If connected via GitHub:
1. Push changes to your repository
2. Vercel automatically rebuilds and deploys

### Manual Update

```bash
# Make your changes
git add .
git commit -m "Update agent logic"

# Deploy
vercel --prod
```

### Update Environment Variables

Via CLI:
```bash
vercel env rm OPENAI_API_KEY production
vercel env add OPENAI_API_KEY production
```

Via Dashboard:
- Go to project settings → Environment Variables
- Edit or add variables
- Redeploy for changes to take effect

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)

## 🎉 Success Checklist

After deployment, verify:

- [ ] Frontend loads at your Vercel URL
- [ ] Users can sign in with Firebase Auth
- [ ] Canvas features work (create/move/delete shapes)
- [ ] Agent chat interface appears
- [ ] Health check returns OK: `https://your-app.vercel.app/api/health`
- [ ] Agent responds to commands
- [ ] No API keys visible in browser DevTools → Network → Payloads
- [ ] No console errors related to API keys
- [ ] Firebase Firestore/Realtime Database syncing works

## 💡 Tips

1. **Use Preview Deployments**: Each PR gets a unique URL for testing
2. **Environment per Branch**: Set different API keys for development branches
3. **Monitor Costs**: Set up OpenAI usage limits to avoid surprise bills
4. **Cache Responses**: Consider caching common agent responses
5. **Optimize Bundle**: Use lazy loading for agent features to reduce initial load

---

**Need Help?** 
- Check the [SECURITY.md](./SECURITY.md) for security best practices
- Review [API_KEY_SECURITY_IMPLEMENTATION.md](./API_KEY_SECURITY_IMPLEMENTATION.md) for architecture details
- Open an issue on GitHub for project-specific questions

