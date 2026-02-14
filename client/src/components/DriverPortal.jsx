import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import AnimatedToast from './AnimatedToast'

// Live Location Capture Component (embedded for DriverPortal)
function LiveLocationCapture({ onLocationCaptured }) {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')

  const captureLocation = () => {
    setLoading(true)
    setError(null)
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const locationData = {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          timestamp: new Date().toISOString()
        }
        setLocation(locationData)
        
        // Try to reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await response.json()
          const locationName = data.display_name || `${latitude}, ${longitude}`
          setAddress(locationName)
          onLocationCaptured(locationName, locationData)
        } catch (err) {
          const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          setAddress(coordString)
          onLocationCaptured(coordString, locationData)
        }
        
        setLoading(false)
      },
      (err) => {
        setLoading(false)
        switch(err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location services.')
            break
          case err.POSITION_UNAVAILABLE:
            setError('Location information unavailable.')
            break
          case err.TIMEOUT:
            setError('Location request timed out.')
            break
          default:
            setError('An error occurred while getting location.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return (
    <div style={{ 
      padding: '1rem', 
      background: 'var(--bg-tertiary)', 
      borderRadius: '8px',
      border: location ? '2px solid #28a745' : '1px solid var(--border-color)',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>📍</span>
        <strong style={{ color: 'var(--text-primary)' }}>Live Location Verification</strong>
        {location && <span style={{ color: '#28a745', fontSize: '0.8rem' }}>✓ Captured</span>}
      </div>
      
      {!location ? (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Capture your current GPS location to verify you are at the fuel station.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
            💡 Note: The address shown may be the nearest landmark. The exact coordinates are what matter for verification.
          </p>
          <button
            type="button"
            onClick={captureLocation}
            disabled={loading}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <span style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid rgba(255,255,255,0.3)', 
                  borderTop: '2px solid white', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
                Getting Location...
              </>
            ) : (
              <>📍 Capture Current Location</>
            )}
          </button>
          {error && (
            <p style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              ⚠️ {error}
            </p>
          )}
        </div>
      ) : (
        <div>
          <div style={{ 
            background: '#d4edda', 
            color: '#155724', 
            padding: '0.75rem', 
            borderRadius: '6px',
            marginBottom: '0.75rem'
          }}>
            <strong>✓ Location Verified</strong>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              📍 {address.substring(0, 60)}{address.length > 60 ? '...' : ''}
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
              Accuracy: ±{location.accuracy} meters
            </div>
            <a 
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                display: 'inline-block',
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: '#155724',
                textDecoration: 'underline'
              }}
            >
              🗺️ View on Google Maps →
            </a>
          </div>
          <button
            type="button"
            onClick={captureLocation}
            className="btn"
            style={{ fontSize: '0.8rem', width: '100%' }}
          >
            🔄 Recapture Location
          </button>
        </div>
      )}
    </div>
  )
}

export default function DriverPortal({ currentUser }) {
  const [driverInfo, setDriverInfo] = useState(null)
  const [myJobCards, setMyJobCards] = useState([])
  const [myFuelRecords, setMyFuelRecords] = useState([])
  const [trucks, setTrucks] = useState([])
  const [stats, setStats] = useState({ total_jobs: 0, completed: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('overview')
  const [showFuelForm, setShowFuelForm] = useState(false)
  const [toast, setToast] = useState(null)
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
    notes: '',
    gps_coordinates: '',
    gps_accuracy: '',
    gps_timestamp: ''
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const handleFuelSubmit = async (e) => {
    e.preventDefault()
    
    // Require GPS location
    if (!fuelForm.gps_coordinates) {
      showToast('Please capture your location first before submitting.', 'error')
      return
    }
    
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
          station_location: fuelForm.station_location,
          odometer_reading: fuelForm.mileage_at_refill,
          payment_method: fuelForm.payment_method,
          receipt_number: fuelForm.receipt_number,
          notes: fuelForm.notes,
          gps_coordinates: fuelForm.gps_coordinates,
          gps_accuracy: fuelForm.gps_accuracy,
          gps_timestamp: fuelForm.gps_timestamp
        })
      })

      if (!res.ok) throw new Error('Failed to add fuel record')

      showToast('✅ Fuel record submitted! Pending finance approval.', 'success')
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
        notes: '',
        gps_coordinates: '',
        gps_accuracy: '',
        gps_timestamp: ''
      })
      fetchDriverData()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  const handleLocationCaptured = (locationName, locationData) => {
    setFuelForm(prev => ({
      ...prev,
      station_location: locationName,
      gps_coordinates: `${locationData.latitude},${locationData.longitude}`,
      gps_accuracy: locationData.accuracy,
      gps_timestamp: locationData.timestamp
    }))
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
      {/* Toast Notification */}
      {toast && (
        <AnimatedToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

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
                
                {/* Live Location Capture - REQUIRED */}
                <LiveLocationCapture onLocationCaptured={handleLocationCaptured} />
                
                {!fuelForm.gps_coordinates && (
                  <p style={{ color: '#dc3545', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    ⚠️ You must capture your location before submitting.
                  </p>
                )}
                
                <button 
                  type="submit" 
                  className="btn btn-success"
                  disabled={!fuelForm.gps_coordinates}
                  style={{ opacity: fuelForm.gps_coordinates ? 1 : 0.6 }}
                >
                  💾 Save Fuel Entry
                </button>
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
                      <th>📍 GPS</th>
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
                        <td>
                          {record.gps_coordinates ? (
                            <span 
                              className="badge" 
                              style={{ 
                                background: (record.gps_accuracy < 50) ? '#d4edda' : '#fff3cd',
                                color: (record.gps_accuracy < 50) ? '#155724' : '#856404'
                              }}
                              title={`GPS: ${record.gps_coordinates}\nAccuracy: ±${record.gps_accuracy}m`}
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>
                              ✗
                            </span>
                          )}
                        </td>
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
