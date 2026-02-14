import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_BASE } from '../config'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Get email and access token from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const emailFromUrl = searchParams.get('email')
    if (emailFromUrl) {
      setEmail(emailFromUrl)
    }
  }, [location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('Please enter your email')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Get access token from URL hash (Supabase sends it in the hash)
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      
      if (!accessToken) {
        throw new Error('Invalid or expired reset link. Please request a new password reset.')
      }

      // Update password using Supabase
      const res = await fetch(`${API_BASE}/auth/reset-password-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, access_token: accessToken })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reset password')
      }

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-box" style={{ textAlign: 'center' }}>
          <h2>✅ Password Reset Successfully!</h2>
          <p>Your password has been reset. You can now log in with your new password.</p>
          <p>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>🚛 Land Mawe</h1>
          <p>Reset Your Password</p>
        </div>

        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '0.75rem', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Remember your password? <a href="/">Sign In</a></p>
        </div>
      </div>
    </div>
  )
}
