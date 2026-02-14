import { useState, useEffect } from 'react'
import { Formik, Form, useFormikContext } from 'formik'
import { API_BASE } from '../config'
import AnimatedToast from './AnimatedToast'
import FormikField from './FormikField'
import { fuelSchema } from '../validations/schemas'
import { usePermissions } from '../hooks/usePermissions'

// Live Location Capture Component
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
          // If reverse geocoding fails, use coordinates
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
      border: location ? '2px solid #28a745' : '1px solid var(--border-color)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>📍</span>
        <strong style={{ color: 'var(--text-primary)' }}>Live Location Verification</strong>
        {location && <span style={{ color: '#28a745', fontSize: '0.8rem' }}>✓ Captured</span>}
      </div>
      
      {!location ? (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Click the button below to capture your current GPS location. This helps prevent fraud and verifies you are at the fuel station.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
            💡 Note: The address shown may be the nearest landmark. The exact coordinates are what matter for verification.
          </p>
          <button
            type="button"
            onClick={captureLocation}
            disabled={loading}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ 
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
              <>
                📍 Capture Current Location
              </>
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
              📍 {address}
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
              Accuracy: ±{location.accuracy} meters • {new Date(location.timestamp).toLocaleTimeString()}
            </div>
            <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.7 }}>
              Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
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
            style={{ fontSize: '0.8rem' }}
          >
            🔄 Recapture Location
          </button>
        </div>
      )}
    </div>
  )
}

export default function Fuel({ currentUser }) {
  const [fuelRecords, setFuelRecords] = useState([])
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [stats, setStats] = useState(null)
  const [truckStats, setTruckStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState('records') // records, analytics, pending
  const [filter, setFilter] = useState({ truck_id: '', from_date: '', to_date: '' })
  const [toast, setToast] = useState(null)

  const initialValues = {
    truck_id: '',
    driver_id: '',
    fuel_date: new Date().toISOString().split('T')[0],
    quantity_liters: '',
    cost_per_liter: '',
    fuel_station: '',
    station_location: '',
    receipt_number: '',
    odometer_reading: '',
    fuel_type: 'diesel',
    payment_method: 'cash',
    notes: '',
    gps_coordinates: '',
    gps_accuracy: '',
    gps_timestamp: ''
  }

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.truck_id) params.append('truck_id', filter.truck_id)
      if (filter.from_date) params.append('from_date', filter.from_date)
      if (filter.to_date) params.append('to_date', filter.to_date)

      const [recordsRes, statsRes, truckStatsRes, trucksRes, driversRes] = await Promise.all([
        fetch(`${API_BASE}/fuel?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/fuel/stats?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/fuel/by-truck`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/trucks`),
        fetch(`${API_BASE}/drivers`)
      ])

      setFuelRecords(await recordsRes.json())
      setStats(await statsRes.json())
      setTruckStats(await truckStatsRes.json())
      setTrucks(await trucksRes.json())
      setDrivers(await driversRes.json())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching fuel data:', err)
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filter])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API_BASE}/fuel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(values)
      })
      if (!res.ok) throw new Error('Failed to record fuel')
      
      showToast('✅ Fuel record submitted! Pending finance approval.', 'success')
      
      resetForm()
      setShowForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproval = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/fuel/${id}/approve`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({ approval_status: status })
      })
      if (!res.ok) throw new Error('Failed to update approval status')
      showToast(`Fuel record ${status}!`, 'success')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const deleteRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this fuel record?')) return
    try {
      const res = await fetch(`${API_BASE}/fuel/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id }
      })
      if (!res.ok) throw new Error('Failed to delete')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount)
  }

  if (loading) return <div className="loading">Loading fuel data...</div>

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '1rem 1.5rem',
          background: toast.type === 'success' ? '#d4edda' : '#f8d7da',
          color: toast.type === 'success' ? '#155724' : '#721c24',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="number">{stats.total_records}</div>
            <div className="label">Total Refills</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#3498db' }}>
              {stats.total_liters.toFixed(0)}L
            </div>
            <div className="label">Total Fuel</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#e67e22' }}>
              {formatCurrency(stats.total_cost)}
            </div>
            <div className="label">Total Cost</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#27ae60' }}>
              {formatCurrency(stats.avg_cost_per_liter)}/L
            </div>
            <div className="label">Avg Price/Liter</div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeView === 'records' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('records')}
          >
            📋 Fuel Records
          </button>
          {(currentUser?.role === 'finance' || currentUser?.role === 'superadmin') && (
            <button 
              className={`btn ${activeView === 'pending' ? 'btn-primary' : ''}`}
              onClick={() => setActiveView('pending')}
            >
              ⏳ Pending Approval
            </button>
          )}
          <button 
            className={`btn ${activeView === 'analytics' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            📊 Analytics by Truck
          </button>
        </div>
      </div>

      {/* Records View */}
      {activeView === 'records' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>⛽ Fuel Records</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select 
                value={filter.truck_id}
                onChange={e => setFilter({...filter, truck_id: e.target.value})}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                <option value="">All Trucks</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>{t.plate_number}</option>
                ))}
              </select>
              <input 
                type="date"
                value={filter.from_date}
                onChange={e => setFilter({...filter, from_date: e.target.value})}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
                placeholder="From"
              />
              <input 
                type="date"
                value={filter.to_date}
                onChange={e => setFilter({...filter, to_date: e.target.value})}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
                placeholder="To"
              />
              {hasPermission('fuel', 'create') && (
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                  {showForm ? 'Cancel' : '+ Add Fuel Record'}
                </button>
              )}
            </div>
          </div>

          {showForm && (
            <Formik
              initialValues={initialValues}
              validationSchema={fuelSchema}
              validateOnChange={true}
              validateOnBlur={true}
              onSubmit={handleSubmit}
            >
              {({ values, isSubmitting, setFieldValue }) => {
                const totalCost = values.quantity_liters && values.cost_per_liter 
                  ? formatCurrency(parseFloat(values.quantity_liters) * parseFloat(values.cost_per_liter))
                  : ''
                
                const handleLocationCaptured = (locationName, locationData) => {
                  setFieldValue('station_location', locationName)
                  setFieldValue('gps_coordinates', `${locationData.latitude},${locationData.longitude}`)
                  setFieldValue('gps_accuracy', locationData.accuracy)
                  setFieldValue('gps_timestamp', locationData.timestamp)
                }
                
                return (
                  <Form style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Record Fuel Purchase</h3>
                    <div className="form-row">
                      <FormikField
                        label="Truck"
                        name="truck_id"
                        type="select"
                        required
                      >
                        <option value="">Select Truck</option>
                        {trucks.map(t => (
                          <option key={t.id} value={t.id}>{t.plate_number} - {t.model}</option>
                        ))}
                      </FormikField>
                      <FormikField
                        label="Driver"
                        name="driver_id"
                        type="select"
                      >
                        <option value="">Select Driver</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </FormikField>
                      <FormikField
                        label="Date"
                        name="fuel_date"
                        type="date"
                        required
                      />
                    </div>
                    <div className="form-row">
                      <FormikField
                        label="Quantity (Liters)"
                        name="quantity_liters"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 50"
                        required
                      />
                      <FormikField
                        label="Cost per Liter (KES)"
                        name="cost_per_liter"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 180"
                        required
                      />
                      <div className="form-group">
                        <label>Total Cost</label>
                        <input 
                          type="text"
                          value={totalCost}
                          disabled
                          style={{ background: '#e9ecef', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <FormikField
                        label="Fuel Station"
                        name="fuel_station"
                        placeholder="e.g. Shell, Total"
                      />
                      <FormikField
                        label="Station Location"
                        name="station_location"
                        placeholder="e.g. Westlands, Nairobi"
                      />
                      <FormikField
                        label="Receipt Number"
                        name="receipt_number"
                        placeholder="e.g. RCP-12345"
                      />
                    </div>
                    <div className="form-row">
                      <FormikField
                        label="Odometer Reading (km)"
                        name="odometer_reading"
                        type="number"
                        placeholder="e.g. 45000"
                      />
                      <FormikField
                        label="Fuel Type"
                        name="fuel_type"
                        type="select"
                      >
                        <option value="diesel">Diesel</option>
                        <option value="petrol">Petrol</option>
                        <option value="gas">Gas</option>
                      </FormikField>
                      <FormikField
                        label="Payment Method"
                        name="payment_method"
                        type="select"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="fuel_card">Fuel Card</option>
                        <option value="credit">Credit</option>
                      </FormikField>
                    </div>
                    <FormikField
                      label="Notes"
                      name="notes"
                      type="textarea"
                      placeholder="Additional notes..."
                    />
                    
                    {/* Live Location Capture */}
                    <div style={{ marginBottom: '1rem' }}>
                      <LiveLocationCapture onLocationCaptured={handleLocationCaptured} />
                    </div>
                    
                    {/* Hidden GPS fields */}
                    <input type="hidden" name="gps_coordinates" value={values.gps_coordinates} />
                    <input type="hidden" name="gps_accuracy" value={values.gps_accuracy} />
                    <input type="hidden" name="gps_timestamp" value={values.gps_timestamp} />
                    
                    <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : '💾 Save Fuel Record'}
                    </button>
                  </Form>
                )
              }}
            </Formik>
          )}

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Truck</th>
                <th>Driver</th>
                <th>Liters</th>
                <th>Cost/L</th>
                <th>Total</th>
                <th>Station</th>
                <th>📍 GPS</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fuelRecords.map(record => (
                <tr key={record.id}>
                  <td>{new Date(record.fuel_date).toLocaleDateString()}</td>
                  <td>{record.truck_plate}</td>
                  <td>{record.driver_name || '-'}</td>
                  <td><strong>{parseFloat(record.quantity_liters).toFixed(1)}L</strong></td>
                  <td>{formatCurrency(record.cost_per_liter)}</td>
                  <td><strong style={{ color: '#e67e22' }}>{formatCurrency(record.total_cost)}</strong></td>
                  <td>
                    {record.fuel_station || '-'}
                    {record.station_location && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        📍 {record.station_location.substring(0, 30)}{record.station_location.length > 30 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    {record.gps_coordinates ? (
                      <div>
                        <span 
                          className="badge" 
                          title={`GPS: ${record.gps_coordinates}\nAccuracy: ±${record.gps_accuracy}m\nTime: ${new Date(record.gps_timestamp).toLocaleTimeString()}`}
                          style={{ 
                            background: record.gps_accuracy < 50 ? '#d4edda' : '#fff3cd',
                            color: record.gps_accuracy < 50 ? '#155724' : '#856404',
                            cursor: 'help'
                          }}
                        >
                          📍 {record.gps_accuracy < 50 ? 'High' : 'Low'}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${record.gps_coordinates}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '0.75rem', 
                            marginLeft: '0.25rem',
                            color: 'var(--accent-primary)',
                            textDecoration: 'underline'
                          }}
                          title="View on map"
                        >
                          Map
                        </a>
                      </div>
                    ) : (
                      <span className="badge" style={{ background: '#e2e3e5', color: '#383d41' }}>
                        ❌ None
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      background: record.payment_method === 'cash' ? '#d4edda' : '#cce5ff',
                      color: record.payment_method === 'cash' ? '#155724' : '#004085'
                    }}>
                      {record.payment_method}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      background: 
                        record.approval_status === 'approved' ? '#d4edda' : 
                        record.approval_status === 'rejected' ? '#f8d7da' : 
                        '#fff3cd',
                      color: 
                        record.approval_status === 'approved' ? '#155724' : 
                        record.approval_status === 'rejected' ? '#721c24' : 
                        '#856404'
                    }}>
                      {record.approval_status === 'approved' ? '✅ Approved' : 
                       record.approval_status === 'rejected' ? '❌ Rejected' : 
                       '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => deleteRecord(record.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {fuelRecords.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No fuel records found. Add one to get started.
            </p>
          )}
        </div>
      )}

      {/* Pending Approval View (Finance Only) */}
      {activeView === 'pending' && (currentUser?.role === 'finance' || currentUser?.role === 'superadmin') && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>⏳ Pending Fuel Approvals</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Truck</th>
                <th>Driver</th>
                <th>Liters</th>
                <th>Cost/L</th>
                <th>Total</th>
                <th>Station</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fuelRecords.filter(r => r.approval_status === 'pending').map(record => (
                <tr key={record.id} style={{ background: '#fff3cd' }}>
                  <td>{new Date(record.fuel_date).toLocaleDateString()}</td>
                  <td><strong>{record.truck_plate}</strong></td>
                  <td>{record.driver_name || '-'}</td>
                  <td><strong>{parseFloat(record.quantity_liters).toFixed(1)}L</strong></td>
                  <td>{formatCurrency(record.cost_per_liter)}</td>
                  <td><strong style={{ color: '#e67e22' }}>{formatCurrency(record.total_cost)}</strong></td>
                  <td>{record.fuel_station || '-'}</td>
                  <td>
                    <span className="badge" style={{ 
                      background: record.payment_method === 'cash' ? '#d4edda' : '#cce5ff',
                      color: record.payment_method === 'cash' ? '#155724' : '#004085'
                    }}>
                      {record.payment_method}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-small btn-success"
                        onClick={() => handleApproval(record.id, 'approved')}
                        title="Approve"
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => handleApproval(record.id, 'rejected')}
                        title="Reject"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {fuelRecords.filter(r => r.approval_status === 'pending').length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No pending fuel records to approve.
            </p>
          )}
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>📊 Fuel Consumption by Truck</h2>
          <table>
            <thead>
              <tr>
                <th>Truck</th>
                <th>Model</th>
                <th>Total Refills</th>
                <th>Total Liters</th>
                <th>Total Cost</th>
                <th>Avg Cost/Refill</th>
                <th>Last Refill</th>
              </tr>
            </thead>
            <tbody>
              {truckStats.map(truck => (
                <tr key={truck.truck_id}>
                  <td><strong>{truck.plate_number}</strong></td>
                  <td>{truck.model}</td>
                  <td>{truck.total_refills}</td>
                  <td>{truck.total_liters.toFixed(1)}L</td>
                  <td><strong style={{ color: '#e67e22' }}>{formatCurrency(truck.total_cost)}</strong></td>
                  <td>
                    {truck.total_refills > 0 
                      ? formatCurrency(truck.total_cost / truck.total_refills)
                      : '-'
                    }
                  </td>
                  <td>
                    {truck.last_refill 
                      ? new Date(truck.last_refill).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {truckStats.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No fuel data available yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
