// React Error Boundary to catch component crashes
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Error Boundary component to catch React crashes
 * Provides user-friendly error UI with reload option
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  // ✅ BUILT-IN: React Error Boundary lifecycle methods
  static getDerivedStateFromError(error: Error): State {
    // Update state to show error UI
    return {
      hasError: true,
      error
    }
  }

  // ✅ BUILT-IN: Error logging
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('🚨 React Error Boundary caught an error:', error)
    console.error('Error Info:', errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // TODO: Could send to error reporting service (Sentry, etc.)
  }

  private handleReload = () => {
    // ✅ BUILT-IN: Page reload
    window.location.reload()
  }

  private handleRetry = () => {
    // Reset error state to try rendering again
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // ✅ Custom fallback UI or default error screen
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                The canvas encountered an unexpected error. This shouldn't happen often.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reload Page
                </button>
              </div>

              {/* ✅ Development error details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Show Error Details (Dev Mode)
                  </summary>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-800 overflow-auto max-h-40">
                    <div className="font-semibold mb-2">Error:</div>
                    <div className="mb-3">{this.state.error.message}</div>
                    {this.state.errorInfo && (
                      <>
                        <div className="font-semibold mb-2">Component Stack:</div>
                        <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    // ✅ BUILT-IN: Normal rendering when no error
    return this.props.children
  }
}

export default ErrorBoundary
