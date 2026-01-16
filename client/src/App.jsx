import { useState, useEffect } from 'react'
import { useTheme } from './hooks/useTheme'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Trucks from './components/Trucks'
import Drivers from './components/Drivers'
import Bookings from './components/Bookings'
import JobCards from './components/JobCards'
import Fuel from './components/Fuel'
import Maintenance from './components/Maintenance'
import Compliance from './components/Compliance'
import Invoices from './components/Invoices'
import Users from './components/Users'
import ActivityLogs from './components/ActivityLogs'
import DriverPortal from './components/DriverPortal'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />
  }

  // Driver role - show only driver portal
  if (user.role === 'driver') {
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
              onClick={handleLogout}
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
          <DriverPortal currentUser={user} />
        </main>
      </div>
    )
  }

  // Define tabs based on user role
  const baseTabs = [
    { id: 'dashboard', label: '📊 Dashboard', roles: ['admin', 'staff'] },
    { id: 'trucks', label: '🚛 Trucks', roles: ['admin', 'staff'] },
    { id: 'drivers', label: '👤 Drivers', roles: ['admin', 'staff'] },
    { id: 'jobcards', label: '📋 Job Cards', roles: ['admin', 'staff'] },
    { id: 'fuel', label: '⛽ Fuel', roles: ['admin', 'staff'] },
    { id: 'maintenance', label: '🔧 Maintenance', roles: ['admin', 'staff'] },
    { id: 'compliance', label: '🛡️ Compliance', roles: ['admin', 'staff'] },
    { id: 'invoices', label: '💰 Invoices', roles: ['admin', 'staff'] },
    { id: 'bookings', label: '📅 Bookings', roles: ['admin', 'staff'] },
    { id: 'users', label: '👥 Users', roles: ['admin'] },
    { id: 'activity', label: '📋 Activity', roles: ['admin'] }
  ]

  // Filter tabs based on user role
  const tabs = baseTabs.filter(tab => tab.roles.includes(user.role || 'staff'))

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
              {user.role === 'admin' ? '👑 Admin' : user.role === 'driver' ? '🚗 Driver' : '👤 Staff'}
            </span>
          </div>
          <button 
            onClick={handleLogout}
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
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'trucks' && <Trucks />}
        {activeTab === 'drivers' && <Drivers />}
        {activeTab === 'jobcards' && <JobCards currentUser={user} />}
        {activeTab === 'fuel' && <Fuel currentUser={user} />}
        {activeTab === 'maintenance' && <Maintenance currentUser={user} />}
        {activeTab === 'compliance' && <Compliance currentUser={user} />}
        {activeTab === 'invoices' && <Invoices currentUser={user} />}
        {activeTab === 'bookings' && <Bookings />}
        {activeTab === 'users' && user.role === 'admin' && <Users currentUser={user} />}
        {activeTab === 'activity' && user.role === 'admin' && <ActivityLogs currentUser={user} />}
      </main>
    </div>
  )
}

export default App
