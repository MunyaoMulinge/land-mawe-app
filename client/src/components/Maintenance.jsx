import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { usePermissions } from '../hooks/usePermissions'

export default function Maintenance({ currentUser }) {
  const [records, setRecords] = useState([])
  const [serviceTypes, setServiceTypes] = useState([])
  const [trucks, setTrucks] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [upcoming, setUpcoming] = useState({ upcoming: [], overdue: [] })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState('records')
  const [filter, setFilter] = useState({ truck_id: '', status: '' })
  const [selectedRecord, setSelectedRecord] = useState(null)
  const { hasPermission } = usePermissions()
  const [form, setForm] = useState({
    truck_id: '',
    service_type_id: '',
    service_date: new Date().toISOString().split('T')[0],
    description: '',
    mileage_at_service: '',
    parts_cost: '',
    labor_cost: '',
    vendor_name: '',
    vendor_contact: '',
    invoice_number: '',
    assigned_to: '',
    notes: '',
    status: 'scheduled'
  })

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.truck_id) params.append('truck_id', filter.truck_id)
      if (filter.status) params.append('status', filter.status)

      const [recordsRes, typesRes, statsRes, upcomingRes, trucksRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/maintenance?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/service-types`),
        fetch(`${API_BASE}/maintenance/stats`),
        fetch(`${API_BASE}/maintenance/upcoming`),
        fetch(`${API_BASE}/trucks`),
        fetch(`${API_BASE}/users`, { headers: { 'x-user-id': currentUser?.id } })
      ])

      setRecords(await recordsRes.json())
      setServiceTypes(await typesRes.json())
      setStats(await statsRes.json())
      setUpcoming(await upcomingRes.json())
      setTrucks(await trucksRes.json())
      setUsers(await usersRes.json())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/maintenance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to create maintenance record')
      
      resetForm()
      setShowForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const resetForm = () => {
    setForm({
      truck_id: '',
      service_type_id: '',
      service_date: new Date().toISOString().split('T')[0],
      description: '',
      mileage_at_service: '',
      parts_cost: '',
      labor_cost: '',
      vendor_name: '',
      vendor_contact: '',
      invoice_number: '',
      assigned_to: '',
      notes: '',
      status: 'scheduled'
    })
  }

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed to update status')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const completeRecord = async (id) => {
    const nextDate = prompt('Next service date (YYYY-MM-DD):')
    const nextKm = prompt('Next service mileage (km):')
    
    try {
      const res = await fetch(`${API_BASE}/maintenance/${id}/complete`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({ 
          next_service_date: nextDate || null,
          next_service_km: nextKm ? parseInt(nextKm) : null
        })
      })
      if (!res.ok) throw new Error('Failed to complete')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0)
  }

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: { bg: '#fff3cd', color: '#856404' },
      in_progress: { bg: '#cce5ff', color: '#004085' },
      completed: { bg: '#d4edda', color: '#155724' },
      cancelled: { bg: '#f8d7da', color: '#721c24' }
    }
    const style = styles[status] || styles.scheduled
    return (
      <span style={{ 
        padding: '0.25rem 0.75rem', 
        borderRadius: '20px', 
        fontSize: '0.8rem',
        background: style.bg,
        color: style.color
      }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const handleServiceTypeChange = (typeId) => {
    const type = serviceTypes.find(t => t.id === parseInt(typeId))
    setForm({
      ...form,
      service_type_id: typeId,
      description: type?.name || '',
      parts_cost: type?.estimated_cost ? (type.estimated_cost * 0.6).toFixed(0) : '',
      labor_cost: type?.estimated_cost ? (type.estimated_cost * 0.4).toFixed(0) : ''
    })
  }

  if (loading) return <div className="loading">Loading maintenance data...</div>

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="stat-card">
            <div className="number">{stats.total}</div>
            <div className="label">Total Records</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#ffc107' }}>{stats.scheduled}</div>
            <div className="label">Scheduled</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#007bff' }}>{stats.in_progress}</div>
            <div className="label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#28a745' }}>{stats.completed}</div>
            <div className="label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#e67e22' }}>{formatCurrency(stats.total_cost)}</div>
            <div className="label">Total Cost</div>
          </div>
        </div>
      )}

      {/* Alerts for overdue */}
      {upcoming.overdue?.length > 0 && (
        <div className="card" style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107', marginBottom: '1rem' }}>
          <h3 style={{ color: '#856404', marginBottom: '0.5rem' }}>⚠️ Overdue Maintenance</h3>
          <p style={{ color: '#856404' }}>
            {upcoming.overdue.length} maintenance task(s) are overdue and need attention!
          </p>
        </div>
      )}

      {/* View Toggle */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeView === 'records' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('records')}
          >
            📋 All Records
          </button>
          <button 
            className={`btn ${activeView === 'upcoming' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('upcoming')}
          >
            📅 Upcoming ({upcoming.upcoming?.length || 0})
          </button>
          <button 
            className={`btn ${activeView === 'overdue' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('overdue')}
            style={upcoming.overdue?.length > 0 ? { background: '#dc3545', color: 'white' } : {}}
          >
            🚨 Overdue ({upcoming.overdue?.length || 0})
          </button>
        </div>
      </div>

      {/* Records View */}
      {activeView === 'records' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>🔧 Maintenance Records</h2>
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
              <select 
                value={filter.status}
                onChange={e => setFilter({...filter, status: e.target.value})}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              {hasPermission('maintenance', 'create') && (
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                  {showForm ? 'Cancel' : '+ Schedule Maintenance'}
                </button>
              )}
            </div>
          </div>

          {showForm && hasPermission('maintenance', 'create') && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Schedule Maintenance</h3>
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
                  <label>Service Type</label>
                  <select 
                    value={form.service_type_id}
                    onChange={e => handleServiceTypeChange(e.target.value)}
                  >
                    <option value="">Select Type</option>
                    {serviceTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Service Date *</label>
                  <input 
                    type="date"
                    value={form.service_date}
                    onChange={e => setForm({...form, service_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="e.g. Oil change and filter replacement"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Mileage at Service</label>
                  <input 
                    type="number"
                    value={form.mileage_at_service}
                    onChange={e => setForm({...form, mileage_at_service: e.target.value})}
                    placeholder="e.g. 45000"
                  />
                </div>
                <div className="form-group">
                  <label>Parts Cost (KES)</label>
                  <input 
                    type="number"
                    value={form.parts_cost}
                    onChange={e => setForm({...form, parts_cost: e.target.value})}
                    placeholder="e.g. 3000"
                  />
                </div>
                <div className="form-group">
                  <label>Labor Cost (KES)</label>
                  <input 
                    type="number"
                    value={form.labor_cost}
                    onChange={e => setForm({...form, labor_cost: e.target.value})}
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor/Mechanic</label>
                  <input 
                    value={form.vendor_name}
                    onChange={e => setForm({...form, vendor_name: e.target.value})}
                    placeholder="e.g. ABC Auto Services"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor Contact</label>
                  <input 
                    value={form.vendor_contact}
                    onChange={e => setForm({...form, vendor_contact: e.target.value})}
                    placeholder="e.g. 0722123456"
                  />
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <select 
                    value={form.assigned_to}
                    onChange={e => setForm({...form, assigned_to: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea 
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <button type="submit" className="btn btn-success">💾 Save Maintenance Record</button>
            </form>
          )}

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Truck</th>
                <th>Service</th>
                <th>Vendor</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}>
                  <td>{new Date(record.service_date).toLocaleDateString()}</td>
                  <td><strong>{record.truck_plate}</strong></td>
                  <td>{record.description}</td>
                  <td>{record.vendor_name || '-'}</td>
                  <td><strong style={{ color: '#e67e22' }}>{formatCurrency(record.total_cost)}</strong></td>
                  <td>{getStatusBadge(record.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {record.status === 'scheduled' && (
                        <button 
                          className="btn btn-small btn-primary"
                          onClick={() => updateStatus(record.id, 'in_progress')}
                          title="Start"
                        >
                          ▶️
                        </button>
                      )}
                      {record.status === 'in_progress' && (
                        <button 
                          className="btn btn-small btn-success"
                          onClick={() => completeRecord(record.id)}
                          title="Complete"
                        >
                          ✅
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {records.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No maintenance records found.
            </p>
          )}
        </div>
      )}

      {/* Upcoming View */}
      {activeView === 'upcoming' && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>📅 Upcoming Maintenance</h2>
          {upcoming.upcoming?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Due Date</th>
                  <th>Truck</th>
                  <th>Service</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.upcoming.map(record => (
                  <tr key={record.id}>
                    <td>{new Date(record.service_date).toLocaleDateString()}</td>
                    <td><strong>{record.truck_plate}</strong></td>
                    <td>{record.description}</td>
                    <td>{record.assigned_to_name || 'Unassigned'}</td>
                    <td>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => updateStatus(record.id, 'in_progress')}
                      >
                        Start
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No upcoming maintenance scheduled.
            </p>
          )}
        </div>
      )}

      {/* Overdue View */}
      {activeView === 'overdue' && (
        <div className="card" style={{ borderLeft: '4px solid #dc3545' }}>
          <h2 style={{ marginBottom: '1rem', color: '#dc3545' }}>🚨 Overdue Maintenance</h2>
          {upcoming.overdue?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Truck</th>
                  <th>Service</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.overdue.map(record => {
                  const daysOverdue = Math.floor((new Date() - new Date(record.service_date)) / (1000 * 60 * 60 * 24))
                  return (
                    <tr key={record.id} style={{ background: '#fff5f5' }}>
                      <td>{new Date(record.service_date).toLocaleDateString()}</td>
                      <td><strong style={{ color: '#dc3545' }}>{daysOverdue} days</strong></td>
                      <td><strong>{record.truck_plate}</strong></td>
                      <td>{record.description}</td>
                      <td>
                        <button 
                          className="btn btn-small btn-danger"
                          onClick={() => updateStatus(record.id, 'in_progress')}
                        >
                          Start Now
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#28a745' }}>
              ✅ No overdue maintenance. Great job!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
