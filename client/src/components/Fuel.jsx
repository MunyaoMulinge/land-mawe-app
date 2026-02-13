import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import AnimatedToast from './AnimatedToast'

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
  const [form, setForm] = useState({
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
    notes: ''
  })

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/fuel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to record fuel')
      
      showToast('✅ Fuel record submitted! Pending finance approval.', 'success')
      
      setForm({
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
        notes: ''
      })
      setShowForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
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
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : '+ Add Fuel Record'}
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Record Fuel Purchase</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Truck *</label>
                  <select 
                    value={form.truck_id}
                    onChange={e => setForm({...form, truck_id: e.target.value})}
                    required
                  >
                    <option value="">Select Truck</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.plate_number} - {t.model}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Driver</label>
                  <select 
                    value={form.driver_id}
                    onChange={e => setForm({...form, driver_id: e.target.value})}
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date"
                    value={form.fuel_date}
                    onChange={e => setForm({...form, fuel_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity (Liters) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={form.quantity_liters}
                    onChange={e => setForm({...form, quantity_liters: e.target.value})}
                    placeholder="e.g. 50"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cost per Liter (KES) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={form.cost_per_liter}
                    onChange={e => setForm({...form, cost_per_liter: e.target.value})}
                    placeholder="e.g. 180"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Total Cost</label>
                  <input 
                    type="text"
                    value={form.quantity_liters && form.cost_per_liter 
                      ? formatCurrency(parseFloat(form.quantity_liters) * parseFloat(form.cost_per_liter))
                      : ''
                    }
                    disabled
                    style={{ background: '#e9ecef' }}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fuel Station</label>
                  <input 
                    value={form.fuel_station}
                    onChange={e => setForm({...form, fuel_station: e.target.value})}
                    placeholder="e.g. Shell, Total"
                  />
                </div>
                <div className="form-group">
                  <label>Station Location</label>
                  <input 
                    value={form.station_location}
                    onChange={e => setForm({...form, station_location: e.target.value})}
                    placeholder="e.g. Westlands, Nairobi"
                  />
                </div>
                <div className="form-group">
                  <label>Receipt Number</label>
                  <input 
                    value={form.receipt_number}
                    onChange={e => setForm({...form, receipt_number: e.target.value})}
                    placeholder="e.g. RCP-12345"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Odometer Reading (km)</label>
                  <input 
                    type="number"
                    value={form.odometer_reading}
                    onChange={e => setForm({...form, odometer_reading: e.target.value})}
                    placeholder="e.g. 45000"
                  />
                </div>
                <div className="form-group">
                  <label>Fuel Type</label>
                  <select 
                    value={form.fuel_type}
                    onChange={e => setForm({...form, fuel_type: e.target.value})}
                  >
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                    <option value="gas">Gas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select 
                    value={form.payment_method}
                    onChange={e => setForm({...form, payment_method: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="fuel_card">Fuel Card</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input 
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>
              <button type="submit" className="btn btn-success">💾 Save Fuel Record</button>
            </form>
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
