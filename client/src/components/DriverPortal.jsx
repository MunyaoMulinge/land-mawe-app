import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function DriverPortal({ currentUser }) {
  const [driverInfo, setDriverInfo] = useState(null)
  const [myJobCards, setMyJobCards] = useState([])
  const [myFuelRecords, setMyFuelRecords] = useState([])
  const [stats, setStats] = useState({ total_jobs: 0, completed: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    fetchDriverData()
  }, [])

  const fetchDriverData = async () => {
    try {
      // Get driver info linked to this user
      const driverRes = await fetch(`${API_BASE}/drivers/by-user/${currentUser.id}`)
      const driver = await driverRes.json()
      
      if (!driver || driver.error) {
        setLoading(false)
        return
      }
      
      setDriverInfo(driver)

      // Get driver's job cards
      const jobsRes = await fetch(`${API_BASE}/job-cards?driver_id=${driver.id}`)
      const jobs = await jobsRes.json()
      setMyJobCards(jobs)

      // Get driver's fuel records
      const fuelRes = await fetch(`${API_BASE}/fuel?driver_id=${driver.id}`)
      const fuel = await fuelRes.json()
      setMyFuelRecords(fuel)

      // Calculate stats
      setStats({
        total_jobs: jobs.length,
        completed: jobs.filter(j => j.status === 'completed').length,
        active: jobs.filter(j => ['approved', 'departed'].includes(j.status)).length
      })

      setLoading(false)
    } catch (err) {
      console.error('Error fetching driver data:', err)
      setLoading(false)
    }
  }

  const formatDate = (date) => new Date(date).toLocaleDateString()
  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0)

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: '#e9ecef', color: '#495057' },
      pending_approval: { bg: '#fff3cd', color: '#856404' },
      approved: { bg: '#cce5ff', color: '#004085' },
      departed: { bg: '#d1ecf1', color: '#0c5460' },
      completed: { bg: '#d4edda', color: '#155724' },
      cancelled: { bg: '#f8d7da', color: '#721c24' }
    }
    const s = styles[status] || styles.draft
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{status.replace('_', ' ').toUpperCase()}</span>
  }

  if (loading) return <div className="loading">Loading your dashboard...</div>

  if (!driverInfo) {
    return (
      <div className="card">
        <h2>⚠️ Driver Account Not Linked</h2>
        <p>Your user account is not linked to a driver profile. Please contact your administrator to link your account.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{ background: 'var(--gradient-primary)', color: 'white', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          👋 Welcome, {driverInfo.name}!
        </h2>
        <p style={{ opacity: 0.9, margin: 0 }}>
          License: {driverInfo.license_number} | Phone: {driverInfo.phone}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="number">{stats.total_jobs}</div>
          <div className="label">Total Jobs</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#3498db' }}>{stats.active}</div>
          <div className="label">Active Jobs</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#27ae60' }}>{stats.completed}</div>
          <div className="label">Completed</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeView === 'overview' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`btn ${activeView === 'jobs' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('jobs')}
          >
            📋 My Jobs
          </button>
          <button 
            className={`btn ${activeView === 'fuel' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('fuel')}
          >
            ⛽ Fuel Records
          </button>
        </div>
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>🚛 Current Active Jobs</h3>
            {myJobCards.filter(j => ['approved', 'departed'].includes(j.status)).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No active jobs at the moment.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Truck</th>
                    <th>Destination</th>
                    <th>Departure</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myJobCards.filter(j => ['approved', 'departed'].includes(j.status)).map(job => (
                    <tr key={job.id}>
                      <td><strong>{job.job_number}</strong></td>
                      <td>{job.truck_plate} ({job.truck_model})</td>
                      <td>{job.destination}</td>
                      <td>{formatDate(job.departure_date)}</td>
                      <td>{getStatusBadge(job.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>📅 Recent Completed Jobs</h3>
            {myJobCards.filter(j => j.status === 'completed').slice(0, 5).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No completed jobs yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Truck</th>
                    <th>Destination</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {myJobCards.filter(j => j.status === 'completed').slice(0, 5).map(job => (
                    <tr key={job.id}>
                      <td><strong>{job.job_number}</strong></td>
                      <td>{job.truck_plate}</td>
                      <td>{job.destination}</td>
                      <td>{job.completed_at ? formatDate(job.completed_at) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* My Jobs */}
      {activeView === 'jobs' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>📋 All My Job Cards</h3>
          {myJobCards.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No job cards assigned to you yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Truck</th>
                  <th>Destination</th>
                  <th>Purpose</th>
                  <th>Departure Date</th>
                  <th>Status</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {myJobCards.map(job => (
                  <tr key={job.id}>
                    <td><strong>{job.job_number}</strong></td>
                    <td>{job.truck_plate} ({job.truck_model})</td>
                    <td>{job.destination}</td>
                    <td>{job.purpose || '-'}</td>
                    <td>{formatDate(job.departure_date)}</td>
                    <td>{getStatusBadge(job.status)}</td>
                    <td>{job.completed_at ? formatDate(job.completed_at) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Fuel Records */}
      {activeView === 'fuel' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>⛽ My Fuel Records</h3>
          {myFuelRecords.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No fuel records found.</p>
          ) : (
            <>
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <strong>Total Fuel Used:</strong> {myFuelRecords.reduce((sum, r) => sum + parseFloat(r.quantity_liters || 0), 0).toLocaleString()} Liters
                <br />
                <strong>Total Cost:</strong> {formatCurrency(myFuelRecords.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0))}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Truck</th>
                    <th>Station</th>
                    <th>Quantity (L)</th>
                    <th>Cost</th>
                    <th>Mileage</th>
                  </tr>
                </thead>
                <tbody>
                  {myFuelRecords.map(record => (
                    <tr key={record.id}>
                      <td>{formatDate(record.fuel_date)}</td>
                      <td>{record.truck_plate}</td>
                      <td>{record.fuel_station || '-'}</td>
                      <td>{record.quantity_liters}L</td>
                      <td>{formatCurrency(record.total_cost)}</td>
                      <td>{record.mileage_at_refill ? `${record.mileage_at_refill} km` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}
