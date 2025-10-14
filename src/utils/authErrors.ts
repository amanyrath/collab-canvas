// Firebase Auth error code to user-friendly message mapping

export interface AuthError {
  code: string
  message: string
  userMessage: string
}

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
export const getAuthErrorMessage = (error: any): string => {
  // Handle both Firebase auth errors and generic errors
  const code = error?.code || 'unknown'
  
  // ✅ BUILT-IN: Map Firebase error codes to friendly messages
  const errorMessages: Record<string, string> = {
    // Email/Password Login Errors
    'auth/user-not-found': 'No account found with this email address. Please check your email or create a new account.',
    'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    
    // Registration Errors  
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
    'auth/weak-password': 'Password should be at least 6 characters long.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
    
    // Google OAuth Errors
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    
    // Network Errors
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/timeout': 'Request timed out. Please check your connection and try again.',
    
    // Generic Errors
    'auth/internal-error': 'Something went wrong. Please try again.',
    'unknown': 'An unexpected error occurred. Please try again.'
  }
  
  // Return user-friendly message or fallback
  return errorMessages[code] || errorMessages['unknown']
}

/**
 * Check if error indicates a temporary/network issue vs permanent issue
 */
export const isRetryableAuthError = (error: any): boolean => {
  const retryableCodes = [
    'auth/network-request-failed',
    'auth/timeout', 
    'auth/too-many-requests',
    'auth/internal-error',
    'auth/popup-blocked'
  ]
  
  return retryableCodes.includes(error?.code)
}

/**
 * Get suggested action for auth error
 */
export const getAuthErrorAction = (error: any): string | undefined => {
  const code = error?.code
  
  const actionMap: Record<string, string> = {
    'auth/user-not-found': 'Create Account',
    'auth/email-already-in-use': 'Sign In Instead',
    'auth/popup-blocked': 'Enable Pop-ups',
    'auth/weak-password': 'Use Stronger Password'
  }
  
  return actionMap[code] || undefined
}
