import { useState } from 'react'
import { Formik, Form } from 'formik'
import { useTheme } from '../hooks/useTheme'
import { API_BASE } from '../config'
import FormikField from './FormikField'
import { loginSchema, registerSchema } from '../validations/schemas'

const API = API_BASE

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { theme, toggleTheme } = useTheme()

  // Disable signup - only login allowed
  const SIGNUP_DISABLED = true

  const handleSubmit = async (values, { setSubmitting }) => {
    // Block signup attempts
    if (!isLogin && SIGNUP_DISABLED) {
      setError('Signup is disabled. Please contact your administrator for account creation.')
      setSubmitting(false)
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const data = await response.json()
      
      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }

  const getInitialValues = () => {
    if (isLogin) {
      return { email: '', password: '' }
    }
    return { name: '', email: '', password: '' }
  }

  const getValidationSchema = () => {
    return isLogin ? loginSchema : registerSchema
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h1>🚛 Land Mawe</h1>
              <p>{isLogin ? 'Sign in to your account' : 'Create your account'}</p>
            </div>
            <button 
              onClick={toggleTheme}
              className="theme-toggle"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <Formik
          initialValues={getInitialValues()}
          validationSchema={getValidationSchema()}
          validateOnChange={true}
          validateOnBlur={true}
          onSubmit={handleSubmit}
          enableReinitialize={true}
        >
          {({ isSubmitting }) => (
            <Form>
              {!isLogin && (
                <FormikField
                  label="Full Name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  required
                />
              )}
              
              <FormikField
                label="Email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
              />
              
              <FormikField
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />

              <button 
                type="submit" 
                className="auth-btn" 
                disabled={isSubmitting || loading}
              >
                {isSubmitting || loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </Form>
          )}
        </Formik>

        <div className="auth-footer">
          {!SIGNUP_DISABLED && (
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="auth-toggle"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
          {SIGNUP_DISABLED && isLogin && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Need an account? Contact your administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
