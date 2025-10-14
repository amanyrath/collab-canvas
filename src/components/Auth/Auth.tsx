import React, { useState } from 'react'
import Login from './Login'
import Register from './Register'

interface AuthProps {
  onAuthSuccess?: () => void
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)

  const handleSuccess = () => {
    onAuthSuccess?.()
  }

  const switchToLogin = () => setIsLogin(true)
  const switchToRegister = () => setIsLogin(false)

  return (
    <div className="w-full max-w-md mx-auto">
      {isLogin ? (
        <Login 
          onSuccess={handleSuccess}
          onSwitchToRegister={switchToRegister}
        />
      ) : (
        <Register 
          onSuccess={handleSuccess}
          onSwitchToLogin={switchToLogin}
        />
      )}
    </div>
  )
}

export default Auth
