# Security Guidelines for CollabCanvas

## API Key Management

### ⚠️ CRITICAL: API Keys Must Not Be Exposed to Browser

API keys (OpenAI, Tavily, etc.) should **NEVER** be accessible in client-side JavaScript in production.

### Development vs Production

#### 🛠️ Local Development (Current Setup)

For local testing only, you can use `VITE_` prefixed keys:

```env
VITE_OPENAI_API_KEY=sk-proj-your-key-here
VITE_TAVILY_API_KEY=tvly-your-key-here
```

**Limitations:**
- ⚠️ Keys are visible in browser DevTools
- ⚠️ Anyone using your dev build can extract them
- ✅ Acceptable for local testing only
- ✅ Build validation prevents accidental production deployment

#### 🚀 Production (Required for Public Deployment)

For production, you **MUST** implement a backend API:

##### Option 1: Firebase Cloud Functions (Requires Blaze Plan)

1. Upgrade to Firebase Blaze plan
2. Set up Cloud Functions:
   ```bash
   firebase init functions
   ```

3. Create function to handle agent requests:
   ```typescript
   // functions/src/index.ts
   import * as functions from 'firebase-functions';
   import { ChatOpenAI } from '@langchain/openai';
   
   export const agentChat = functions.https.onCall(async (data, context) => {
     // Verify user is authenticated
     if (!context.auth) {
       throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
     }
     
     // Get API key from environment (NOT from client)
     const apiKey = functions.config().openai.key;
     
     // Process request with LLM
     const llm = new ChatOpenAI({ openAIApiKey: apiKey });
     // ... rest of logic
   });
   ```

4. Set environment variables:
   ```bash
   firebase functions:config:set openai.key="sk-proj-your-key-here"
   firebase functions:config:set tavily.key="tvly-your-key-here"
   ```

##### Option 2: Custom Backend Server

1. Create Express.js backend
2. Store keys in server environment variables (no VITE_ prefix)
3. Frontend calls your API endpoints
4. Backend handles all LLM interactions

##### Option 3: Alternative Serverless (Vercel, Netlify, etc.)

1. Deploy to Vercel/Netlify with serverless functions
2. Add API routes that handle agent logic
3. Set keys as secret environment variables in platform dashboard

## Current Implementation

### Build Validation

The build process includes validation that prevents accidental key exposure:

```bash
# This will fail if VITE_* API keys are present in production build
npm run build

# To build for local testing (NOT for deployment):
SKIP_KEY_VALIDATION=true npm run build
```

### Key Manager Utility

The `src/utils/keyManager.ts` provides:
- Development mode: Allows VITE_ keys for local testing
- Production mode: Blocks direct key access and shows error
- Runtime warnings when in dev mode with exposed keys

### Development Warning Banner

When running locally with exposed keys, a warning banner appears to remind you that this is not production-ready.

## Migration Checklist

When ready to deploy to production:

- [ ] Set up backend API (Cloud Functions, Express, or serverless)
- [ ] Move all LLM/AI logic to backend
- [ ] Remove VITE_ prefix from API keys in production environment
- [ ] Store keys as server-side environment variables only
- [ ] Update frontend to call backend API endpoints
- [ ] Test that no keys are exposed in production bundle
- [ ] Add Firebase App Check or similar to prevent unauthorized API access
- [ ] Set up rate limiting on backend endpoints

## Testing Key Exposure

To verify your production build doesn't expose keys:

```bash
# Build for production
npm run build

# Search the built files for keys
grep -r "sk-proj" dist/
grep -r "tvly-" dist/

# Should return no results!
```

## Additional Security Measures

1. **Firebase App Check**: Verify requests come from your app
2. **Rate Limiting**: Prevent abuse of your API endpoints
3. **User Authentication**: Ensure only logged-in users can access agent features
4. **Request Validation**: Sanitize and validate all inputs
5. **Monitoring**: Set up alerts for unusual API usage patterns

## Getting Help

If you need assistance with:
- Setting up a backend
- Migrating to Cloud Functions
- Implementing security measures

See the Firebase documentation or contact support.

---

**Remember**: The current setup is for LOCAL DEVELOPMENT ONLY. Do not deploy to production without implementing a proper backend!

