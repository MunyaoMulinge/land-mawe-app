import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import { useSession, getSessionInfo, formatTimeRemaining } from './hooks/useSession'
import { PermissionsProvider, usePermissions } from './hooks/usePermissions.jsx'
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
import PermissionManager from './components/PermissionManager'
import DriverPortal from './components/DriverPortal'
import SetPassword from './components/SetPassword'
import ResetPassword from './components/ResetPassword'
import './App.css'

// Define tabs based on user role
const baseTabs = [
  { id: 'dashboard', label: '📊 Dashboard', path: '/dashboard', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'mytrips', label: '🚛 My Trips', path: '/my-trips', roles: ['driver'], driverOnly: true },
  { id: 'bookings', label: '📅 Bookings', path: '/bookings', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'trucks', label: '🚛 Trucks', path: '/trucks', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'drivers', label: '👤 Drivers', path: '/drivers', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'equipment', label: '📦 Equipment', path: '/equipment', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'jobcards', label: '📋 Job Cards', path: '/jobcards', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'fuel', label: '⛽ Fuel', path: '/fuel', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'maintenance', label: '🔧 Maintenance', path: '/maintenance', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'compliance', label: '🛡️ Compliance', path: '/compliance', roles: ['superadmin', 'admin', 'finance', 'staff', 'driver'] },
  { id: 'invoices', label: '💰 Invoices', path: '/invoices', roles: ['superadmin', 'admin', 'finance', 'staff'] },
  { id: 'users', label: '👥 Users', path: '/users', roles: ['superadmin', 'admin', 'staff'] },
  { id: 'activity', label: '📋 Activity', path: '/activity', roles: ['superadmin', 'admin', 'finance', 'staff'] },
  { id: 'permissions', label: '🔐 Permissions', path: '/permissions', roles: ['superadmin'] }
]

// Protected Route component for permission-based access
function ProtectedRoute({ user, allowedRoles, requiredPermission, children }) {
  const { hasPermission, loading } = usePermissions()
  
  if (!user) return <Navigate to="/" replace />
  
  // Check role first (backward compatibility)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/no-access" replace />
  }
  
  // Check permission if specified
  if (requiredPermission && !loading) {
    const [module, action] = requiredPermission.split(':')
    if (!hasPermission(module, action)) {
      return <Navigate to="/no-access" replace />
    }
  }
  
  // Show loading while permissions are being fetched
  if (requiredPermission && loading) {
    return <div className="loading">Loading...</div>
  }
  
  return children
}

// Auth wrapper - redirects to login if not authenticated
function RequireAuth({ user, children }) {
  const location = useLocation()
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }
  return children
}

// Smart redirect component - redirects to first available route
function SmartRedirect({ user }) {
  const { hasPermission, loading } = usePermissions()
  
  if (loading) {
    return <div className="loading">Loading...</div>
  }
  
  // Define routes in priority order
  const routes = [
    { path: '/my-trips', permission: null, role: 'driver' },
    { path: '/dashboard', permission: 'dashboard:view' },
    { path: '/bookings', permission: 'bookings:view' },
    { path: '/jobcards', permission: 'job_cards:view' },
    { path: '/trucks', permission: 'trucks:view' },
    { path: '/drivers', permission: 'drivers:view' },
    { path: '/equipment', permission: 'equipment:view' },
    { path: '/fuel', permission: 'fuel:view' },
    { path: '/maintenance', permission: 'maintenance:view' },
    { path: '/compliance', permission: 'compliance:view' },
    { path: '/invoices', permission: 'invoices:view' },
    { path: '/users', permission: 'users:view' },
    { path: '/activity', permission: 'activity_logs:view' },
    { path: '/permissions', permission: null, role: 'superadmin' }
  ]
  
  // Find first route user has access to
  for (const route of routes) {
    if (route.role && !route.permission && user.role === route.role) {
      return <Navigate to={route.path} replace />
    }
    if (route.permission) {
      const [module, action] = route.permission.split(':')
      if (hasPermission(module, action)) {
        return <Navigate to={route.path} replace />
      }
    }
  }
  
  // No permissions - go to no-access page
  return <Navigate to="/no-access" replace />
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
  const { hasPermission, permissions } = usePermissions()
  
  // Initialize session management
  const { showWarning: sessionWarning } = useSession(onLogout, () => setShowWarning(true))
  
  // Filter tabs based on granular permissions
  const tabs = baseTabs.filter(tab => {
    // Super admin sees everything except driver-only tabs
    if (tab.driverOnly && user.role !== 'driver') return false
    if (user.role === 'superadmin') return true
    // During loading, fall back to role-based check
    if (permissions.length === 0) {
      return tab.roles.includes(user.role || 'staff')
    }
    // My Trips tab - always show for drivers
    if (tab.id === 'mytrips') {
      return user.role === 'driver'
    }
    // Check if user has view permission for this module
    const moduleName = tab.id === 'activity' ? 'activity_logs' : 
                       tab.id === 'jobcards' ? 'job_cards' : 
                       tab.id === 'dashboard' ? 'dashboard' : tab.id
    return hasPermission(moduleName, 'view')
  })

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

// No Access Page - shown when user doesn't have permission
function NoAccessPage({ user, onLogout }) {
  const { permissions, hasPermission } = usePermissions()
  
  // Find first available route for this user
  const getFirstAvailableRoute = () => {
    const routes = [
      { path: '/dashboard', permission: 'dashboard:view' },
      { path: '/bookings', permission: 'bookings:view' },
      { path: '/trucks', permission: 'trucks:view' },
      { path: '/drivers', permission: 'drivers:view' },
      { path: '/equipment', permission: 'equipment:view' },
      { path: '/jobcards', permission: 'job_cards:view' },
      { path: '/fuel', permission: 'fuel:view' },
      { path: '/maintenance', permission: 'maintenance:view' },
      { path: '/compliance', permission: 'compliance:view' },
      { path: '/invoices', permission: 'invoices:view' },
      { path: '/users', permission: 'users:view' },
      { path: '/activity', permission: 'activity_logs:view' },
      { path: '/permissions', permission: null, role: 'superadmin' }
    ]
    
    for (const route of routes) {
      if (route.role && user.role === route.role) return route.path
      if (route.permission) {
        const [module, action] = route.permission.split(':')
        if (hasPermission(module, action)) return route.path
      }
    }
    return null
  }
  
  const firstRoute = getFirstAvailableRoute()
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{ 
        background: 'var(--card-bg)', 
        padding: '3rem', 
        borderRadius: '12px',
        maxWidth: '500px'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</h1>
        <h2 style={{ marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          You don't have permission to access this page.
        </p>
        
        {firstRoute ? (
          <div>
            <Link 
              to={firstRoute}
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'var(--primary-color)',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                marginBottom: '1rem'
              }}
            >
              Go to Available Page
            </Link>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--danger-color)' }}>
              You don't have access to any modules. Please contact your administrator.
            </p>
            <button 
              onClick={onLogout}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--danger-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
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

  // All routes - some require auth, some don't
  return (
    <PermissionsProvider currentUser={user}>
      <BrowserRouter>
        <Routes>
          {/* Public routes (no auth required) */}
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Auth route */}
          <Route 
            path="/" 
            element={
              user ? <SmartRedirect user={user} /> : <Auth onLogin={handleLogin} />
            } 
          />
          
          {/* No Access page - shown when user doesn't have permission */}
          <Route 
            path="/no-access" 
            element={
              <RequireAuth user={user}>
                <NoAccessPage user={user} onLogout={handleLogout} />
              </RequireAuth>
            } 
          />
          
          {/* Protected routes (require auth) */}
          <Route element={<RequireAuth user={user}><Layout user={user} onLogout={handleLogout} /></RequireAuth>}>
            {/* Dashboard - controlled by permissions */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute user={user} requiredPermission="dashboard:view">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Driver's My Trips portal - always accessible for drivers */}
            <Route 
              path="/my-trips" 
              element={
                <ProtectedRoute user={user} allowedRoles={['driver']}>
                  <DriverPortal currentUser={user} />
                </ProtectedRoute>
              } 
            />
            
            {/* Module routes - access controlled by granular permissions */}
            <Route 
              path="/bookings" 
              element={
                <ProtectedRoute user={user} requiredPermission="bookings:view">
                  <Bookings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trucks" 
              element={
                <ProtectedRoute user={user} requiredPermission="trucks:view">
                  <Trucks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/drivers" 
              element={
                <ProtectedRoute user={user} requiredPermission="drivers:view">
                  <Drivers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/equipment" 
              element={
                <ProtectedRoute user={user} requiredPermission="equipment:view">
                  <Equipment currentUser={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/jobcards" 
              element={
                <ProtectedRoute user={user} requiredPermission="job_cards:view">
                  <JobCards currentUser={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fuel" 
              element={
                <ProtectedRoute user={user} requiredPermission="fuel:view">
                  <Fuel currentUser={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/maintenance" 
              element={
                <ProtectedRoute user={user} requiredPermission="maintenance:view">
                  <Maintenance currentUser={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/compliance" 
              element={
                <ProtectedRoute user={user} requiredPermission="compliance:view">
                  <Compliance currentUser={user} />
                </ProtectedRoute>
              } 
            />
            
            {/* Finance routes */}
            <Route 
              path="/invoices" 
              element={
                <ProtectedRoute user={user} requiredPermission="invoices:view">
                  <Invoices currentUser={user} />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin routes */}
            <Route 
              path="/users" 
              element={
                <ProtectedRoute user={user} requiredPermission="users:view">
                  <Users currentUser={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/activity" 
              element={
                <ProtectedRoute user={user} requiredPermission="activity_logs:view">
                  <ActivityLogs currentUser={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/permissions" 
              element={
                <ProtectedRoute user={user} allowedRoles={['superadmin']}>
                  <PermissionManager currentUser={user} />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all - redirect to no-access */}
            <Route path="*" element={<Navigate to="/no-access" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PermissionsProvider>
  )
}

export default App
