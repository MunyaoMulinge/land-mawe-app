import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Trucks from './components/Trucks'
import Drivers from './components/Drivers'
import Bookings from './components/Bookings'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

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

  if (!user) {
    return <Auth onLogin={setUser} />
  }

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'trucks', label: '🚛 Trucks' },
    { id: 'drivers', label: '👤 Drivers' },
    { id: 'bookings', label: '📅 Bookings' }
  ]

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>🚛 Land Mawe</h1>
          <p>Truck Tracking Admin Portal</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ opacity: 0.9 }}>Welcome, {user.name || user.email}</span>
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
        {activeTab === 'bookings' && <Bookings />}
      </main>
    </div>
  )
}

export default App
