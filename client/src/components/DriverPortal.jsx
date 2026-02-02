import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function DriverPortal({ currentUser }) {
  const [driverInfo, setDriverInfo] = useState(null)
  const [myJobCards, setMyJobCards] = useState([])
  const [myFuelRecords, setMyFuelRecords] = useState([])
  const [trucks, setTrucks] = useState([])
  const [stats, setStats] = useState({ total_jobs: 0, completed: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('overview')
  const [showFuelForm, setShowFuelForm] = useState(false)
  const [fuelForm, setFuelForm] = useState({
    truck_id: '',
    fuel_date: new Date().toISOString().split('T')[0],
    quantity_liters: '',
    price_per_liter: '',
    total_cost: '',
    fuel_station: '',
    mileage_at_refill: '',
    payment_method: 'cash',
    receipt_number: '',
    notes: ''
  })

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

      // Get trucks for fuel form
      const trucksRes = await fetch(`${API_BASE}/trucks`)
      const trucksData = await trucksRes.json()
      setTrucks(trucksData)

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

  const handleFuelSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/fuel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          truck_id: fuelForm.truck_id,
          driver_id: driverInfo.id,
          fuel_date: fuelForm.fuel_date,
          quantity_liters: fuelForm.quantity_liters,
          cost_per_liter: fuelForm.price_per_liter,
          fuel_station: fuelForm.fuel_station,
          odometer_reading: fuelForm.mileage_at_refill,
          payment_method: fuelForm.payment_method,
          receipt_number: fuelForm.receipt_number,
          notes: fuelForm.notes
        })
      })

      if (!res.ok) throw new Error('Failed to add fuel record')

      alert('✅ Fuel record submitted! Pending finance approval.')
      setShowFuelForm(false)
      setFuelForm({
        truck_id: '',
        fuel_date: new Date().toISOString().split('T')[0],
        quantity_liters: '',
        price_per_liter: '',
        total_cost: '',
        fuel_station: '',
        mileage_at_refill: '',
        payment_method: 'cash',
        receipt_number: '',
        notes: ''
      })
      fetchDriverData()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const calculateTotalCost = () => {
    const qty = parseFloat(fuelForm.quantity_liters) || 0
    const price = parseFloat(fuelForm.price_per_liter) || 0
    return (qty * price).toFixed(2)
  }

  const updateFuelForm = (field, value) => {
    const updated = { ...fuelForm, [field]: value }
    
    // Auto-calculate total cost
    if (field === 'quantity_liters' || field === 'price_per_liter') {
      const qty = parseFloat(field === 'quantity_liters' ? value : updated.quantity_liters) || 0
      const price = parseFloat(field === 'price_per_liter' ? value : updated.price_per_liter) || 0
      updated.total_cost = (qty * price).toFixed(2)
    }
    
    setFuelForm(updated)
  }

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
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>⛽ My Fuel Records</h3>
              <button 
                className="btn btn-success" 
                onClick={() => setShowFuelForm(!showFuelForm)}
              >
                {showFuelForm ? 'Cancel' : '+ Add Fuel Entry'}
              </button>
            </div>

            {showFuelForm && (
              <form onSubmit={handleFuelSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem' }}>Add Fuel Entry</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Truck *</label>
                    <select 
                      value={fuelForm.truck_id}
                      onChange={e => updateFuelForm('truck_id', e.target.value)}
                      required
                    >
                      <option value="">Select Truck</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id}>{t.plate_number} - {t.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date *</label>
                    <input 
                      type="date"
                      value={fuelForm.fuel_date}
                      onChange={e => updateFuelForm('fuel_date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fuel Station</label>
                    <input 
                      value={fuelForm.fuel_station}
                      onChange={e => updateFuelForm('fuel_station', e.target.value)}
                      placeholder="e.g. Shell Westlands"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity (Liters) *</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={fuelForm.quantity_liters}
                      onChange={e => updateFuelForm('quantity_liters', e.target.value)}
                      placeholder="e.g. 50"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Price per Liter (KES) *</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={fuelForm.price_per_liter}
                      onChange={e => updateFuelForm('price_per_liter', e.target.value)}
                      placeholder="e.g. 180"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Cost (KES)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={fuelForm.total_cost}
                      onChange={e => updateFuelForm('total_cost', e.target.value)}
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mileage at Refill (km)</label>
                    <input 
                      type="number"
                      value={fuelForm.mileage_at_refill}
                      onChange={e => updateFuelForm('mileage_at_refill', e.target.value)}
                      placeholder="e.g. 45000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select 
                      value={fuelForm.payment_method}
                      onChange={e => updateFuelForm('payment_method', e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="fuel_card">Fuel Card</option>
                      <option value="mpesa">M-Pesa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Receipt Number</label>
                    <input 
                      value={fuelForm.receipt_number}
                      onChange={e => updateFuelForm('receipt_number', e.target.value)}
                      placeholder="Receipt/Invoice #"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input 
                    value={fuelForm.notes}
                    onChange={e => updateFuelForm('notes', e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>
                <button type="submit" className="btn btn-success">💾 Save Fuel Entry</button>
              </form>
            )}

            {myFuelRecords.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No fuel records yet. Add your first entry above!</p>
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
        </div>
      )}
    </div>
  )
}
