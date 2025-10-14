// Enhanced error handling with retry logic
interface RetryOptions {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export class FirebaseErrorHandler {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_RETRY_OPTIONS, ...options }
    let lastError: Error
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on auth errors or permission errors
        if (this.isNonRetryableError(error)) {
          throw error
        }
        
        if (attempt < opts.maxRetries) {
          const delay = Math.min(
            opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
            opts.maxDelayMs
          )
          
          console.log(`Operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), retrying in ${delay}ms...`)
          await this.delay(delay)
        }
      }
    }
    
    throw lastError!
  }

  private static isNonRetryableError(error: any): boolean {
    const code = error?.code
    return [
      'auth/invalid-user-token',
      'auth/user-disabled', 
      'permission-denied',
      'invalid-argument'
    ].includes(code)
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
