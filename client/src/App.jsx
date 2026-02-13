import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import { useSession, getSessionInfo, formatTimeRemaining } from './hooks/useSession'
import IdleWarningModal from './components/IdleWarningModal'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Trucks from './components/Trucks'
import Drivers from './components/Drivers'
import Bookings from './components/Bookings'
import Equipment from './components/Equipment'
import JobCards from './components/JobCards'
import Fuel from './components/Fuel'
import Maintenance from './components/Maintenance'
import Compliance from './components/Compliance'
import Invoices from './components/Invoices'
import Users from './components/Users'
import ActivityLogs from './components/ActivityLogs'
import DriverPortal from './components/DriverPortal'
import './App.css'

// Define tabs based on user role
const baseTabs = [
  { id: 'dashboard', label: '📊 Dashboard', path: '/', roles: ['superadmin', 'admin', 'finance', 'staff'] },
  { id: 'bookings', label: '📅 Bookings', path: '/bookings', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'trucks', label: '🚛 Trucks', path: '/trucks', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'drivers', label: '👤 Drivers', path: '/drivers', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'equipment', label: '📦 Equipment', path: '/equipment', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'jobcards', label: '📋 Job Cards', path: '/jobcards', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'fuel', label: '⛽ Fuel', path: '/fuel', roles: ['superadmin', 'admin', 'finance', 'staff'] },
  { id: 'maintenance', label: '🔧 Maintenance', path: '/maintenance', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'compliance', label: '🛡️ Compliance', path: '/compliance', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'invoices', label: '💰 Invoices', path: '/invoices', roles: ['superadmin', 'finance'] },
  { id: 'users', label: '👥 Users', path: '/users', roles: ['superadmin', 'admin'] },
  { id: 'activity', label: '📋 Activity', path: '/activity', roles: ['superadmin', 'admin'] }
]

// Protected Route component for role-based access
function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

// Session Timer Component
function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState('')
  
  useEffect(() => {
    const updateTimer = () => {
      const session = getSessionInfo()
      if (session) {
        setTimeLeft(formatTimeRemaining(session.idleTimeRemaining))
      }
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <span style={{ 
      fontSize: '0.7rem', 
      opacity: 0.8,
      background: 'rgba(255,255,255,0.2)',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px'
    }}>
      ⏱️ {timeLeft}
    </span>
  )
}

// Layout component with header and navigation
function Layout({ user, onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [showWarning, setShowWarning] = useState(false)
  
  // Initialize session management
  const { showWarning: sessionWarning } = useSession(onLogout, () => setShowWarning(true))
  
  // Filter tabs based on user role
  const tabs = baseTabs.filter(tab => tab.roles.includes(user.role || 'staff'))

  const getRoleDisplay = (role) => {
    switch(role) {
      case 'superadmin': return '⭐ Super Admin'
      case 'admin': return '👑 Admin'
      case 'finance': return '💰 Finance'
      case 'driver': return '🚗 Driver'
      default: return '👤 Staff'
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>🚛 Land Mawe</h1>
          <p>Truck Tracking Admin Portal</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={{ textAlign: 'right' }}>
            <span style={{ opacity: 0.9 }}>Welcome, {user.name || user.email}</span>
            <span style={{ 
              display: 'block', 
              fontSize: '0.75rem', 
              opacity: 0.7,
              textTransform: 'capitalize'
            }}>
              {getRoleDisplay(user.role)}
            </span>
            <SessionTimer />
          </div>
          <button 
            onClick={onLogout}
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <nav className="nav">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            to={tab.path}
            className={location.pathname === tab.path ? 'active' : ''}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <main className="main">
        <Outlet />
      </main>
      
      {/* Idle Warning Modal */}
      {(showWarning || sessionWarning) && (
        <IdleWarningModal 
          onStayActive={() => setShowWarning(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  )
}

// Driver Layout (simpler, no navigation)
function DriverLayout({ user, onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const [showWarning, setShowWarning] = useState(false)
  
  // Initialize session management
  const { showWarning: sessionWarning } = useSession(onLogout, () => setShowWarning(true))

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>🚛 Land Mawe</h1>
          <p>Driver Portal</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={{ textAlign: 'right' }}>
            <span style={{ opacity: 0.9 }}>Welcome, {user.name || user.email}</span>
            <span style={{ 
              display: 'block', 
              fontSize: '0.75rem', 
              opacity: 0.7,
              textTransform: 'capitalize'
            }}>
              🚗 Driver
            </span>
          </div>
          <button 
            onClick={onLogout}
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      
      {/* Idle Warning Modal */}
      {(showWarning || sessionWarning) && (
        <IdleWarningModal 
          onStayActive={() => setShowWarning(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const sessionStart = localStorage.getItem('sessionStart')
    
    if (savedUser && sessionStart) {
      const sessionAge = Date.now() - parseInt(sessionStart)
      const TOKEN_LIFETIME = 24 * 60 * 60 * 1000 // 24 hours
      
      if (sessionAge > TOKEN_LIFETIME) {
        // Session expired, clear everything
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('sessionStart')
        localStorage.removeItem('lastActivity')
        alert('Your session has expired. Please log in again.')
      } else {
        setUser(JSON.parse(savedUser))
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('sessionStart')
    localStorage.removeItem('lastActivity')
    setUser(null)
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    // Initialize session
    localStorage.setItem('sessionStart', Date.now().toString())
    localStorage.setItem('lastActivity', Date.now().toString())
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>
  }

  // Not logged in - show auth
  if (!user) {
    return <Auth onLogin={handleLogin} />
  }

  // Driver role - show only driver portal
  if (user.role === 'driver') {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<DriverLayout user={user} onLogout={handleLogout} />}>
            <Route path="/" element={<DriverPortal currentUser={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    )
  }

  // Admin/Staff routes
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout user={user} onLogout={handleLogout} />}>
          {/* Public routes for all authenticated users */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Staff/Admin routes */}
          <Route 
            path="/bookings" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'staff']}>
                <Bookings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trucks" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'staff']}>
                <Trucks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/drivers" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'staff']}>
                <Drivers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/equipment" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'staff']}>
                <Equipment currentUser={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/jobcards" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'staff']}>
                <JobCards currentUser={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/fuel" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'finance', 'staff']}>
                <Fuel currentUser={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/maintenance" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'staff']}>
                <Maintenance currentUser={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/compliance" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin', 'staff']}>
                <Compliance currentUser={user} />
              </ProtectedRoute>
            } 
          />
          
          {/* Finance-only routes */}
          <Route 
            path="/invoices" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'finance']}>
                <Invoices currentUser={user} />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin/Superadmin only routes */}
          <Route 
            path="/users" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin']}>
                <Users currentUser={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/activity" 
            element={
              <ProtectedRoute user={user} allowedRoles={['superadmin', 'admin']}>
                <ActivityLogs currentUser={user} />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
