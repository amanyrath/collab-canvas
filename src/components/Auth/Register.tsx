import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../utils/firebase'
import { getAuthErrorMessage, isRetryableAuthError, getAuthErrorAction } from '../../utils/authErrors'

interface RegisterProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; action?: string; retryable?: boolean } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // ✅ Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError({ message: 'Please enter a valid email address' })
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError({ message: 'Passwords do not match' })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError({ message: 'Password must be at least 6 characters' })
      setLoading(false)
      return
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password)
      onSuccess?.()
    } catch (err: any) {
      // ✅ PHASE 9: User-friendly error messages
      setError({
        message: getAuthErrorMessage(err),
        action: getAuthErrorAction(err),
        retryable: isRetryableAuthError(err)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Create Account
      </h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-lg">⚠️</div>
            <div className="flex-1">
              <div className="text-red-800 font-medium text-sm mb-1">
                Registration Error
              </div>
              <div className="text-red-700 text-sm">
                {error.message}
              </div>
              
              {/* ✅ Suggested action button */}
              {error.action && (
                <button
                  onClick={() => {
                    if (error.action === 'Sign In Instead') {
                      onSwitchToLogin?.()
                    }
                    setError(null)
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  {error.action}
                </button>
              )}
              
              {/* ✅ Retry button for network errors */}
              {error.retryable && (
                <button
                  onClick={() => setError(null)}
                  className="mt-2 ml-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
            minLength={6}
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={onSwitchToLogin}
          className="text-blue-600 hover:underline text-sm"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  )
}

export default Register
