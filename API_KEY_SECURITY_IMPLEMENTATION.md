# API Key Security Implementation

## Summary

Implemented a security layer to protect API keys and prevent accidental exposure in production builds.

## Changes Made

### 1. Key Manager Utility (`src/utils/keyManager.ts`)

Created a centralized key management system that:
- ✅ Allows `VITE_` prefixed keys in development mode only
- ✅ Blocks direct key access in production builds
- ✅ Provides clear error messages guiding users to backend implementation
- ✅ Includes environment detection and validation

**Key Functions:**
- `getOpenAIKey()` - Returns key in dev, blocks in prod
- `getTavilyKey()` - Returns key in dev, blocks in prod
- `isAgentEnvironmentSecure()` - Checks if environment is safe for agent features
- `shouldShowDevWarning()` - Determines if warning banner should display

### 2. Build Validation Script (`scripts/validate-build.js`)

Pre-build validation that:
- ✅ Scans `.env` file for exposed API keys (VITE_ prefix)
- ✅ Fails production builds if sensitive keys are exposed
- ✅ Provides clear error messages with remediation steps
- ✅ Can be skipped for local dev builds: `SKIP_KEY_VALIDATION=true npm run build`

### 3. Development Warning Banner (`src/components/DevWarningBanner.tsx`)

Visual warning component that:
- ✅ Displays prominent yellow warning banner in development
- ✅ Informs users that keys are exposed (local testing only)
- ✅ References SECURITY.md for production guidance
- ✅ Can be dismissed by user

### 4. Updated LLM Module (`src/agent/llm.ts`)

Modified to:
- ✅ Use `keyManager` instead of direct `import.meta.env` access
- ✅ Provide appropriate error messages for dev vs prod
- ✅ Block LLM initialization in production without backend

### 5. Updated Tavily Tool (`src/agent/tools/tavily.ts`)

Modified to:
- ✅ Use `keyManager` for API key retrieval
- ✅ Check environment security before initializing
- ✅ Fall back to mock tool in production

### 6. Updated Package Scripts

Added new npm scripts:
```json
{
  "prebuild": "node scripts/validate-build.js",
  "build:dev": "SKIP_KEY_VALIDATION=true npm run build"
}
```

### 7. Security Documentation (`SECURITY.md`)

Comprehensive guide covering:
- ✅ Why API keys must not be exposed
- ✅ Development vs production approaches
- ✅ Three backend implementation options:
  1. Firebase Cloud Functions (requires Blaze plan)
  2. Custom backend server (Express.js)
  3. Alternative serverless (Vercel, Netlify)
- ✅ Migration checklist for production deployment
- ✅ Testing procedures
- ✅ Additional security measures

### 8. Updated Environment Files

Updated `env.example` with:
- ✅ Clear warnings about VITE_ prefix exposure
- ✅ Guidance on production setup
- ✅ References to SECURITY.md

## Usage

### For Local Development

1. Create `.env` file from `env.example`:
   ```bash
   cp env.example .env
   ```

2. Add your API keys with VITE_ prefix:
   ```env
   VITE_OPENAI_API_KEY=sk-proj-your-key-here
   VITE_TAVILY_API_KEY=tvly-your-key-here
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. You'll see a warning banner - this is expected and safe for local testing.

### For Production Deployment

**DO NOT deploy with VITE_ prefixed API keys!**

1. Set up a backend API (see SECURITY.md for options)
2. Move API keys to server-side environment variables (without VITE_ prefix)
3. Update frontend to call backend endpoints
4. Build validation will prevent accidental exposure:
   ```bash
   npm run build  # Will fail if VITE_ keys detected
   ```

### Building for Local Testing

If you need to build locally (e.g., to test the built version):
```bash
npm run build:dev
```

⚠️ **Never deploy this build to production!**

## Security Guarantees

### ✅ What This Protects Against

1. **Accidental Production Deployment**: Build validation prevents deploying with exposed keys
2. **Unclear Error Messages**: Users get clear guidance on what to do
3. **Missing Warnings**: Dev banner alerts users to the limitation
4. **Silent Failures**: Production attempts fail explicitly with helpful messages

### ⚠️ What This Does NOT Protect Against

1. **Local Dev Key Exposure**: Keys in dev mode are still visible in browser DevTools (by design)
2. **Malicious Builds**: Someone with access to `.env` can skip validation
3. **Production Security**: You MUST implement a backend for production use

## Architecture

```
┌─────────────────────────────────────────┐
│         Development Mode                │
├─────────────────────────────────────────┤
│  Frontend (Browser)                     │
│  ├─ VITE_OPENAI_API_KEY ❌ Exposed     │
│  ├─ keyManager: Allows access ✓        │
│  ├─ Warning Banner: Shows ✓            │
│  └─ Agent: Works locally ✓             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Production Mode                 │
├─────────────────────────────────────────┤
│  Frontend (Browser)                     │
│  ├─ No VITE_ keys ✓                    │
│  ├─ keyManager: Blocks access ✓        │
│  └─ Calls backend API ✓                │
│                                         │
│  Backend (Server/Functions)             │
│  ├─ OPENAI_API_KEY ✓ Secure           │
│  ├─ TAVILY_API_KEY ✓ Secure           │
│  └─ Handles LLM calls ✓                │
└─────────────────────────────────────────┘
```

## Testing

### Verify Keys Are Not Exposed

After building for production:
```bash
npm run build
grep -r "sk-proj" dist/
grep -r "tvly-" dist/
# Should return no results!
```

### Test Development Mode

```bash
npm run dev
# Should see warning banner
# Agent features should work
```

### Test Production Build (Local)

```bash
# Without backend (should fail gracefully)
npm run build:dev
npm run preview
# Agent features should show error about needing backend
```

## Migration Path

Current status: **Local Development Only**

To deploy to production:
- [ ] Choose backend approach (see SECURITY.md)
- [ ] Implement backend API endpoints
- [ ] Move API keys to backend environment
- [ ] Update frontend to call backend
- [ ] Remove VITE_ prefix from production keys
- [ ] Test that agent works through backend
- [ ] Verify no keys in production bundle
- [ ] Deploy!

## Cost Considerations

- **Free Tier**: Current implementation works perfectly
- **Production**: Backend required (Cloud Functions needs Blaze plan, or use free alternatives like Vercel/Netlify)
- **Alternative**: Keep on free tier and only use agent features locally (document for users)

## Questions?

See `SECURITY.md` for detailed implementation guides, or check:
- Firebase Cloud Functions: https://firebase.google.com/docs/functions
- Vercel Serverless: https://vercel.com/docs/functions
- Netlify Functions: https://docs.netlify.com/functions/overview/

