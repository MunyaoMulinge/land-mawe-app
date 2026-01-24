import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

const EQUIPMENT_TYPES = [
  'Generator Model', 'Sub Woofer', 'Full Range', 'Rear Speakers', 'Monitor',
  'Microphones', 'Batteries', 'Amplifier', 'Cross Over', 'Mixer', 'Lights'
]

export default function JobCards({ currentUser }) {
  const [jobCards, setJobCards] = useState([])
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedJobCard, setSelectedJobCard] = useState(null)
  const [filter, setFilter] = useState({ status: '' })
  
  const [form, setForm] = useState({
    // Basic Info
    job_date: new Date().toISOString().split('T')[0],
    purpose: '', // Job Description
    client_name: '',
    event_start_date: '',
    event_finish_date: '',
    branding_in_house: false,
    
    // Personnel
    driver_id: '',
    crew: '',
    team_lead: '',
    
    // Route & Merchandise
    notes: '', // Notes/Route
    merchandise: '',
    
    // Vehicle Info
    truck_id: '',
    vehicle_reg: '',
    kilometer: '',
    fuel_gauge: 'full',
    current_average: '',
    
    // Equipment
    equipment: EQUIPMENT_TYPES.map(name => ({ name, type: '', quantity: 0, returned: false })),
    
    // Inspection
    damage_report: ''
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
      console.error(err)
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
      // Filter out equipment with 0 quantity
      const activeEquipment = form.equipment.filter(eq => eq.quantity > 0)
      
      const res = await fetch(`${API_BASE}/job-cards`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({
          ...form,
          equipment: activeEquipment
        })
      })
      if (!res.ok) throw new Error('Failed to create job card')
      
      alert('✅ Job card created successfully!')
      resetForm()
      setShowForm(false)
      fetchJobCards()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const resetForm = () => {
    setForm({
      job_date: new Date().toISOString().split('T')[0],
      purpose: '',
      client_name: '',
      event_start_date: '',
      event_finish_date: '',
      branding_in_house: false,
      driver_id: '',
      crew: '',
      team_lead: '',
      notes: '',
      merchandise: '',
      truck_id: '',
      vehicle_reg: '',
      kilometer: '',
      fuel_gauge: 'full',
      current_average: '',
      equipment: EQUIPMENT_TYPES.map(name => ({ name, type: '', quantity: 0, returned: false })),
      damage_report: ''
    })
  }

  const updateEquipment = (index, field, value) => {
    const newEquipment = [...form.equipment]
    newEquipment[index][field] = value
    setForm({ ...form, equipment: newEquipment })
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
      <span className="badge" style={{ background: style.bg, color: style.color }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  if (loading) return <div className="loading">Loading job cards...</div>

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📋 Job Cards</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={filter.status}
              onChange={e => setFilter({...filter, status: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="departed">Departed</option>
              <option value="completed">Completed</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Job Card'}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Create New Job Card</h3>
          <form onSubmit={handleSubmit}>
            {/* Section 1: Basic Info */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>📄 Basic Information</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date"
                    value={form.job_date}
                    onChange={e => setForm({...form, job_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Job Description *</label>
                  <input 
                    value={form.purpose}
                    onChange={e => setForm({...form, purpose: e.target.value})}
                    placeholder="Event description"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Client *</label>
                  <input 
                    value={form.client_name}
                    onChange={e => setForm({...form, client_name: e.target.value})}
                    placeholder="Client name"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Event Start Date *</label>
                  <input 
                    type="date"
                    value={form.event_start_date}
                    onChange={e => setForm({...form, event_start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Event Finish Date *</label>
                  <input 
                    type="date"
                    value={form.event_finish_date}
                    onChange={e => setForm({...form, event_finish_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <input 
                      type="checkbox"
                      checked={form.branding_in_house}
                      onChange={e => setForm({...form, branding_in_house: e.target.checked})}
                      style={{ width: 'auto' }}
                    />
                    Branding In House
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Personnel */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>👥 Personnel</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Driver *</label>
                  <select 
                    value={form.driver_id}
                    onChange={e => setForm({...form, driver_id: e.target.value})}
                    required
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Crew</label>
                  <input 
                    value={form.crew}
                    onChange={e => setForm({...form, crew: e.target.value})}
                    placeholder="Crew members"
                  />
                </div>
                <div className="form-group">
                  <label>Team Lead</label>
                  <input 
                    value={form.team_lead}
                    onChange={e => setForm({...form, team_lead: e.target.value})}
                    placeholder="Team lead name"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Route & Merchandise */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>📍 Route & Merchandise</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Notes / Route</label>
                  <input 
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    placeholder="Route details and notes"
                  />
                </div>
                <div className="form-group">
                  <label>Merchandise</label>
                  <input 
                    value={form.merchandise}
                    onChange={e => setForm({...form, merchandise: e.target.value})}
                    placeholder="Merchandise details"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Vehicle Info */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>🚛 Vehicle Information</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Truck *</label>
                  <select 
                    value={form.truck_id}
                    onChange={e => {
                      const truck = trucks.find(t => t.id === parseInt(e.target.value))
                      setForm({...form, truck_id: e.target.value, vehicle_reg: truck?.plate_number || ''})
                    }}
                    required
                  >
                    <option value="">Select Truck</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.plate_number} - {t.model}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vehicle Reg</label>
                  <input 
                    value={form.vehicle_reg}
                    onChange={e => setForm({...form, vehicle_reg: e.target.value})}
                    placeholder="Auto-filled"
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Kilometer</label>
                  <input 
                    type="number"
                    value={form.kilometer}
                    onChange={e => setForm({...form, kilometer: e.target.value})}
                    placeholder="Current mileage"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fuel Gauge</label>
                  <select 
                    value={form.fuel_gauge}
                    onChange={e => setForm({...form, fuel_gauge: e.target.value})}
                  >
                    <option value="reserve">Reserve (E)</option>
                    <option value="quarter">1/4</option>
                    <option value="half">1/2</option>
                    <option value="full">Full</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Current Average (km/l)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={form.current_average}
                    onChange={e => setForm({...form, current_average: e.target.value})}
                    placeholder="e.g. 8.5"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Equipment Checklist */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>📦 Equipment Checklist</h4>
              <table style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Return</th>
                  </tr>
                </thead>
                <tbody>
                  {form.equipment.map((eq, index) => (
                    <tr key={index}>
                      <td><strong>{eq.name}</strong></td>
                      <td>
                        <input 
                          value={eq.type}
                          onChange={e => updateEquipment(index, 'type', e.target.value)}
                          placeholder="Model/Type"
                          style={{ width: '100%', padding: '0.25rem' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number"
                          value={eq.quantity}
                          onChange={e => updateEquipment(index, 'quantity', parseInt(e.target.value) || 0)}
                          style={{ width: '60px', padding: '0.25rem' }}
                          min="0"
                        />
                      </td>
                      <td>
                        <input 
                          type="checkbox"
                          checked={eq.returned}
                          onChange={e => updateEquipment(index, 'returned', e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 6: Inspection */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>🔍 Damage Report</h4>
              <div className="form-group">
                <label>Damage Report / Notes</label>
                <textarea 
                  value={form.damage_report}
                  onChange={e => setForm({...form, damage_report: e.target.value})}
                  placeholder="Report any damage or issues..."
                  rows="3"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-success">💾 Create Job Card</button>
          </form>
        </div>
      )}

      {/* Job Cards List */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Job Cards List</h3>
        {jobCards.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No job cards found. Create your first one!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Job #</th>
                <th>Date</th>
                <th>Client</th>
                <th>Driver</th>
                <th>Truck</th>
                <th>Event Dates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobCards.map(job => (
                <tr key={job.id}>
                  <td><strong>{job.job_number}</strong></td>
                  <td>{new Date(job.created_at).toLocaleDateString()}</td>
                  <td>{job.client_name || job.purpose}</td>
                  <td>{job.driver_name}</td>
                  <td>{job.truck_plate}</td>
                  <td>
                    {job.event_start_date ? (
                      `${new Date(job.event_start_date).toLocaleDateString()} - ${new Date(job.event_finish_date).toLocaleDateString()}`
                    ) : (
                      new Date(job.departure_date).toLocaleDateString()
                    )}
                  </td>
                  <td>{getStatusBadge(job.status)}</td>
                  <td>
                    <button 
                      className="btn btn-small btn-primary"
                      onClick={() => setSelectedJobCard(job)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Modal */}
      {selectedJobCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Job Card: {selectedJobCard.job_number}</h3>
              {getStatusBadge(selectedJobCard.status)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <strong>Client:</strong> {selectedJobCard.client_name || '-'}<br />
                <strong>Driver:</strong> {selectedJobCard.driver_name}<br />
                <strong>Truck:</strong> {selectedJobCard.truck_plate}<br />
                <strong>Team Lead:</strong> {selectedJobCard.team_lead || '-'}
              </div>
              <div>
                <strong>Event Dates:</strong><br />
                {selectedJobCard.event_start_date ? (
                  `${new Date(selectedJobCard.event_start_date).toLocaleDateString()} - ${new Date(selectedJobCard.event_finish_date).toLocaleDateString()}`
                ) : '-'}<br />
                <strong>Branding In House:</strong> {selectedJobCard.branding_in_house ? 'Yes' : 'No'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setSelectedJobCard(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
