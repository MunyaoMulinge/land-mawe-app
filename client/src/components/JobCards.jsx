import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function JobCards({ currentUser }) {
  const [jobCards, setJobCards] = useState([])
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedJobCard, setSelectedJobCard] = useState(null)
  const [filter, setFilter] = useState({ status: '' })
  const [form, setForm] = useState({
    truck_id: '',
    driver_id: '',
    departure_date: new Date().toISOString().split('T')[0],
    destination: '',
    purpose: '',
    notes: ''
  })

  const fetchJobCards = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.status) params.append('status', filter.status)
      
      const res = await fetch(`${API_BASE}/job-cards?${params}`, {
        headers: { 'x-user-id': currentUser?.id }
      })
      if (!res.ok) throw new Error('Failed to fetch job cards')
      const data = await res.json()
      setJobCards(data)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const fetchTrucksAndDrivers = async () => {
    try {
      const [trucksRes, driversRes] = await Promise.all([
        fetch(`${API_BASE}/trucks`),
        fetch(`${API_BASE}/drivers`)
      ])
      setTrucks(await trucksRes.json())
      setDrivers(await driversRes.json())
    } catch (err) {
      console.error('Error fetching trucks/drivers:', err)
    }
  }

  useEffect(() => { 
    fetchJobCards()
    fetchTrucksAndDrivers()
  }, [filter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/job-cards`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to create job card')
      
      setForm({
        truck_id: '',
        driver_id: '',
        departure_date: new Date().toISOString().split('T')[0],
        destination: '',
        purpose: '',
        notes: ''
      })
      setShowForm(false)
      fetchJobCards()
    } catch (err) {
      alert(err.message)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: '#e2e3e5', color: '#383d41' },
      pending_approval: { bg: '#fff3cd', color: '#856404' },
      approved: { bg: '#cce5ff', color: '#004085' },
      departed: { bg: '#d4edda', color: '#155724' },
      completed: { bg: '#d1ecf1', color: '#0c5460' },
      cancelled: { bg: '#f8d7da', color: '#721c24' }
    }
    const style = styles[status] || styles.draft
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

  if (loading) return <div className="loading">Loading job cards...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="number">{jobCards.length}</div>
          <div className="label">Total Job Cards</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#ffc107' }}>
            {jobCards.filter(j => j.status === 'pending_approval').length}
          </div>
          <div className="label">Pending Approval</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#007bff' }}>
            {jobCards.filter(j => j.status === 'approved').length}
          </div>
          <div className="label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#28a745' }}>
            {jobCards.filter(j => j.status === 'departed').length}
          </div>
          <div className="label">On Trip</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#17a2b8' }}>
            {jobCards.filter(j => j.status === 'completed').length}
          </div>
          <div className="label">Completed</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>📋 Job Cards</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select 
              value={filter.status} 
              onChange={e => setFilter({...filter, status: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="departed">Departed</option>
              <option value="completed">Completed</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Job Card'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Create New Job Card</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Truck *</label>
                <select 
                  value={form.truck_id} 
                  onChange={e => setForm({...form, truck_id: e.target.value})}
                  required
                >
                  <option value="">Select Truck</option>
                  {trucks.filter(t => t.status === 'available').map(truck => (
                    <option key={truck.id} value={truck.id}>
                      {truck.plate_number} - {truck.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Driver *</label>
                <select 
                  value={form.driver_id} 
                  onChange={e => setForm({...form, driver_id: e.target.value})}
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.filter(d => d.onboarding_complete).map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Departure Date *</label>
                <input 
                  type="date"
                  value={form.departure_date} 
                  onChange={e => setForm({...form, departure_date: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Destination *</label>
                <input 
                  value={form.destination} 
                  onChange={e => setForm({...form, destination: e.target.value})}
                  placeholder="e.g. KICC, Nairobi"
                  required
                />
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input 
                  value={form.purpose} 
                  onChange={e => setForm({...form, purpose: e.target.value})}
                  placeholder="e.g. Tech Expo Roadshow"
                />
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
            <button type="submit" className="btn btn-success">Create Job Card</button>
          </form>
        )}

        {/* Job Cards List */}
        <table>
          <thead>
            <tr>
              <th>Job #</th>
              <th>Truck</th>
              <th>Driver</th>
              <th>Destination</th>
              <th>Departure</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobCards.map(jc => (
              <tr key={jc.id}>
                <td><strong>{jc.job_number}</strong></td>
                <td>{jc.truck_plate} ({jc.truck_model})</td>
                <td>{jc.driver_name}</td>
                <td>{jc.destination}</td>
                <td>{new Date(jc.departure_date).toLocaleDateString()}</td>
                <td>{getStatusBadge(jc.status)}</td>
                <td>
                  <button 
                    className="btn btn-small"
                    onClick={() => setSelectedJobCard(jc)}
                  >
                    👁️ View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {jobCards.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No job cards found. Create one to get started.
          </p>
        )}
      </div>

      {/* Job Card Detail Modal */}
      {selectedJobCard && (
        <JobCardDetail 
          jobCard={selectedJobCard} 
          currentUser={currentUser}
          onClose={() => setSelectedJobCard(null)}
          onUpdate={() => {
            fetchJobCards()
            setSelectedJobCard(null)
          }}
        />
      )}
    </div>
  )
}

// Job Card Detail Component
function JobCardDetail({ jobCard, currentUser, onClose, onUpdate }) {
  const [checklist, setChecklist] = useState(jobCard.checklist || {})
  const [saving, setSaving] = useState(false)
  const [returnMileage, setReturnMileage] = useState('')
  const [returnNotes, setReturnNotes] = useState('')

  const updateChecklist = async (updates) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/job-cards/${jobCard.id}/checklist`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to update checklist')
      const data = await res.json()
      setChecklist(data)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action, body = {}) => {
    try {
      const res = await fetch(`${API_BASE}/job-cards/${jobCard.id}/${action}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Action failed')
      }
      onUpdate()
    } catch (err) {
      alert(err.message)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: '#e2e3e5', color: '#383d41' },
      pending_approval: { bg: '#fff3cd', color: '#856404' },
      approved: { bg: '#cce5ff', color: '#004085' },
      departed: { bg: '#d4edda', color: '#155724' },
      completed: { bg: '#d1ecf1', color: '#0c5460' },
      cancelled: { bg: '#f8d7da', color: '#721c24' }
    }
    const style = styles[status] || styles.draft
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>📋 Job Card: {jobCard.job_number}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Job Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div>
            <strong>Status:</strong> {getStatusBadge(jobCard.status)}
          </div>
          <div><strong>Departure Date:</strong> {new Date(jobCard.departure_date).toLocaleDateString()}</div>
          <div><strong>Truck:</strong> {jobCard.truck_plate} ({jobCard.truck_model})</div>
          <div><strong>Driver:</strong> {jobCard.driver_name}</div>
          <div><strong>Destination:</strong> {jobCard.destination}</div>
          <div><strong>Purpose:</strong> {jobCard.purpose || '-'}</div>
          <div><strong>Created By:</strong> {jobCard.created_by_name}</div>
          {jobCard.approved_by_name && <div><strong>Approved By:</strong> {jobCard.approved_by_name}</div>}
        </div>

        {/* Pre-Departure Checklist */}
        {(jobCard.status === 'draft' || jobCard.status === 'pending_approval') && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>🔍 Pre-Departure Checklist</h3>
            
            {/* Equipment */}
            <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #e1e5eb', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>📺 Equipment</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Screens Count</label>
                  <input 
                    type="number" 
                    value={checklist.screens_count || 0}
                    onChange={e => updateChecklist({ screens_count: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Screens Condition</label>
                  <select 
                    value={checklist.screens_condition || 'not_checked'}
                    onChange={e => updateChecklist({ screens_condition: e.target.value })}
                  >
                    <option value="not_checked">Not Checked</option>
                    <option value="good">Good</option>
                    <option value="damaged">Damaged</option>
                    <option value="missing">Missing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Speakers Count</label>
                  <input 
                    type="number" 
                    value={checklist.speakers_count || 0}
                    onChange={e => updateChecklist({ speakers_count: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Speakers Condition</label>
                  <select 
                    value={checklist.speakers_condition || 'not_checked'}
                    onChange={e => updateChecklist({ speakers_condition: e.target.value })}
                  >
                    <option value="not_checked">Not Checked</option>
                    <option value="good">Good</option>
                    <option value="damaged">Damaged</option>
                    <option value="missing">Missing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Safety Equipment */}
            <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #e1e5eb', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>🦺 Safety Equipment</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {[
                  { key: 'fire_extinguisher', label: '🧯 Fire Extinguisher' },
                  { key: 'first_aid_kit', label: '🩹 First Aid Kit' },
                  { key: 'warning_triangles', label: '⚠️ Warning Triangles' },
                  { key: 'reflective_jacket', label: '🦺 Reflective Jacket' },
                  { key: 'spare_wheel', label: '🛞 Spare Wheel' },
                  { key: 'jack_and_tools', label: '🔧 Jack & Tools' }
                ].map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={checklist[item.key] || false}
                      onChange={e => updateChecklist({ [item.key]: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Vehicle Condition */}
            <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #e1e5eb', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>🚛 Vehicle Condition</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox"
                    checked={checklist.lights_working || false}
                    onChange={e => updateChecklist({ lights_working: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  💡 Lights Working
                </label>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tires Condition</label>
                  <select 
                    value={checklist.tires_condition || 'not_checked'}
                    onChange={e => updateChecklist({ tires_condition: e.target.value })}
                  >
                    <option value="not_checked">Not Checked</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Brakes Condition</label>
                  <select 
                    value={checklist.brakes_condition || 'not_checked'}
                    onChange={e => updateChecklist({ brakes_condition: e.target.value })}
                  >
                    <option value="not_checked">Not Checked</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Oil Level</label>
                  <select 
                    value={checklist.oil_level || 'not_checked'}
                    onChange={e => updateChecklist({ oil_level: e.target.value })}
                  >
                    <option value="not_checked">Not Checked</option>
                    <option value="full">Full</option>
                    <option value="low">Low</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Fuel Level</label>
                  <select 
                    value={checklist.fuel_level || 'not_checked'}
                    onChange={e => updateChecklist({ fuel_level: e.target.value })}
                  >
                    <option value="not_checked">Not Checked</option>
                    <option value="full">Full</option>
                    <option value="half">Half</option>
                    <option value="quarter">Quarter</option>
                    <option value="empty">Empty</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Coolant Level</label>
                  <select 
                    value={checklist.coolant_level || 'not_checked'}
                    onChange={e => updateChecklist({ coolant_level: e.target.value })}
                  >
                    <option value="not_checked">Not Checked</option>
                    <option value="full">Full</option>
                    <option value="low">Low</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mileage */}
            <div style={{ padding: '1rem', border: '1px solid #e1e5eb', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>📏 Mileage</h4>
              <div className="form-group" style={{ maxWidth: '200px' }}>
                <label>Departure Mileage (km)</label>
                <input 
                  type="number"
                  value={checklist.departure_mileage || ''}
                  onChange={e => updateChecklist({ departure_mileage: parseInt(e.target.value) || null })}
                  placeholder="e.g. 45000"
                />
              </div>
            </div>
          </div>
        )}

        {/* Return Section */}
        {jobCard.status === 'departed' && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '2px solid #28a745', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem' }}>🔙 Complete Trip</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Return Mileage (km) *</label>
                <input 
                  type="number"
                  value={returnMileage}
                  onChange={e => setReturnMileage(e.target.value)}
                  placeholder="e.g. 45500"
                  required
                />
              </div>
              <div className="form-group">
                <label>Return Notes</label>
                <input 
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  placeholder="Any issues or notes..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e1e5eb', paddingTop: '1rem' }}>
          <button className="btn" onClick={onClose}>Close</button>
          
          {jobCard.status === 'draft' && (
            <button 
              className="btn btn-primary"
              onClick={() => handleAction('submit')}
            >
              ✅ Submit for Approval
            </button>
          )}
          
          {jobCard.status === 'pending_approval' && currentUser?.role === 'admin' && (
            <button 
              className="btn btn-success"
              onClick={() => handleAction('approve')}
            >
              👍 Approve
            </button>
          )}
          
          {jobCard.status === 'approved' && (
            <button 
              className="btn btn-primary"
              onClick={() => handleAction('depart', { departure_mileage: checklist.departure_mileage })}
            >
              🚛 Mark as Departed
            </button>
          )}
          
          {jobCard.status === 'departed' && (
            <button 
              className="btn btn-success"
              onClick={() => handleAction('complete', { return_mileage: parseInt(returnMileage), return_notes: returnNotes })}
              disabled={!returnMileage}
            >
              ✅ Complete Trip
            </button>
          )}
        </div>

        {saving && <div style={{ textAlign: 'center', padding: '0.5rem', color: '#666' }}>Saving...</div>}
      </div>
    </div>
  )
}
