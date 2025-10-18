/**
 * Key Manager for API Keys
 * 
 * WARNING: This is for LOCAL DEVELOPMENT ONLY!
 * 
 * This provides basic obfuscation (NOT encryption) for local testing.
 * In production, you MUST use a backend server to keep keys secure.
 * 
 * The obfuscation here just makes the key slightly less obvious in the bundle,
 * but anyone with DevTools can still extract it. This is acceptable for local
 * development but NOT for production deployments.
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Get API key with appropriate handling for dev vs prod
 */
export function getOpenAIKey(): string | null {
  // Development mode: Use VITE_ prefixed key
  if (isDevelopment) {
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    if (key && key !== 'your_openai_api_key_here') {
      return key;
    }
    console.warn('⚠️ OpenAI API key not configured for development');
    return null;
  }

  // Production mode: Keys should come from backend API calls
  console.error(
    '🚨 SECURITY ERROR: Cannot access OpenAI key directly in production!\n' +
    'You must call your backend API endpoint instead of using the key directly.\n' +
    'See SECURITY.md for implementation details.'
  );
  return null;
}

/**
 * Get Tavily API key with appropriate handling for dev vs prod
 */
export function getTavilyKey(): string | null {
  if (isDevelopment) {
    const key = import.meta.env.VITE_TAVILY_API_KEY;
    if (key && key !== 'your_tavily_api_key_here') {
      return key;
    }
    console.warn('⚠️ Tavily API key not configured for development');
    return null;
  }

  console.error(
    '🚨 SECURITY ERROR: Cannot access Tavily key directly in production!\n' +
    'You must call your backend API endpoint instead.'
  );
  return null;
}

/**
 * Check if we're in a secure environment for using agent features
 */
export function isAgentEnvironmentSecure(): boolean {
  return isDevelopment;
}

/**
 * Check if we should use the backend API for agent operations
 */
export function shouldUseBackendAPI(): boolean {
  // If VITE_USE_BACKEND_API is explicitly set to true, use backend
  if (import.meta.env.VITE_USE_BACKEND_API === 'true') {
    return true;
  }
  
  // In production, always use backend API
  if (!isDevelopment) {
    return true;
  }
  
  // In development, default to local mode unless backend is configured
  return false;
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    isDevelopment,
    hasOpenAIKey: isDevelopment && !!import.meta.env.VITE_OPENAI_API_KEY,
    hasTavilyKey: isDevelopment && !!import.meta.env.VITE_TAVILY_API_KEY,
    isSecure: isAgentEnvironmentSecure(),
    mode: import.meta.env.MODE,
  };
}

/**
 * Show warning banner if running agent in development mode
 */
export function shouldShowDevWarning(): boolean {
  return isDevelopment && (
    !!import.meta.env.VITE_OPENAI_API_KEY ||
    !!import.meta.env.VITE_TAVILY_API_KEY
  );
}

