import { useState, useEffect } from 'react'
import { Formik, Form } from 'formik'
import { API_BASE } from '../config'
import AnimatedModal from './AnimatedModal'
import FormikField from './FormikField'
import { jobCardSchema } from '../validations/schemas'
import { usePermissions } from '../hooks/usePermissions'

const EQUIPMENT_TYPES = [
  'Generator Model', 'Sub Woofer', 'Full Range', 'Rear Speakers', 'Monitor',
  'Microphones', 'Batteries', 'Amplifier', 'Cross Over', 'Mixer', 'Lights'
]

export default function JobCards({ currentUser }) {
  const [jobCards, setJobCards] = useState([])
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingJobCard, setEditingJobCard] = useState(null)
  const [selectedJobCard, setSelectedJobCard] = useState(null)
  const [checklist, setChecklist] = useState(null)
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [filter, setFilter] = useState({ status: '' })
  const { hasPermission } = usePermissions()
  
  const initialValues = {
    // Booking reference
    booking_id: '',
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
  }

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
      const [trucksRes, driversRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE}/trucks`),
        fetch(`${API_BASE}/drivers`),
        fetch(`${API_BASE}/bookings`)
      ])
      setTrucks(await trucksRes.json())
      setDrivers(await driversRes.json())
      const allBookings = await bookingsRes.json()
      // Only show confirmed bookings that don't already have a job card
      setBookings(allBookings.filter(b => b.status === 'confirmed'))
    } catch (err) {
      console.error('Error fetching trucks/drivers:', err)
    }
  }

  useEffect(() => { 
    fetchJobCards()
    fetchTrucksAndDrivers()
  }, [filter])

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // Filter out equipment with 0 quantity
      const activeEquipment = values.equipment.filter(eq => eq.quantity > 0)
      
      const url = editingJobCard 
        ? `${API_BASE}/job-cards/${editingJobCard.id}`
        : `${API_BASE}/job-cards`
      const method = editingJobCard ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({
          ...values,
          equipment: activeEquipment
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save job card')
      }
      
      resetForm()
      setShowForm(false)
      setEditingJobCard(null)
      fetchJobCards()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = async (job) => {
    try {
      const res = await fetch(`${API_BASE}/job-cards/${job.id}`, {
        headers: { 'x-user-id': currentUser?.id }
      })
      const data = await res.json()
      
      // Map saved equipment back to the full equipment list
      const mappedEquipment = EQUIPMENT_TYPES.map(name => {
        const saved = (data.equipment || []).find(eq => eq.equipment_name === name)
        return {
          name,
          type: saved?.equipment_type || '',
          quantity: saved?.quantity || 0,
          returned: saved?.returned || false
        }
      })

      setEditingJobCard({ ...data, mappedEquipment })
      setShowForm(true)
    } catch (err) {
      alert('Error loading job card: ' + err.message)
    }
  }

  const getEditValues = () => {
    if (!editingJobCard) return initialValues
    return {
      booking_id: editingJobCard.booking_id || '',
      job_date: editingJobCard.departure_date?.slice(0, 10) || new Date().toISOString().split('T')[0],
      purpose: editingJobCard.purpose || '',
      client_name: editingJobCard.client_name || '',
      event_start_date: editingJobCard.event_start_date?.slice(0, 10) || '',
      event_finish_date: editingJobCard.event_finish_date?.slice(0, 10) || '',
      branding_in_house: editingJobCard.branding_in_house || false,
      driver_id: editingJobCard.driver_id ? String(editingJobCard.driver_id) : '',
      crew: editingJobCard.crew || '',
      team_lead: editingJobCard.team_lead || '',
      notes: editingJobCard.route || editingJobCard.notes || '',
      merchandise: editingJobCard.merchandise || '',
      truck_id: editingJobCard.truck_id ? String(editingJobCard.truck_id) : '',
      vehicle_reg: editingJobCard.vehicle_reg || '',
      kilometer: editingJobCard.kilometer || '',
      fuel_gauge: editingJobCard.fuel_gauge || 'full',
      current_average: editingJobCard.current_average || '',
      equipment: (() => {
        const equipmentMap = {}
        if (editingJobCard.equipment) {
          editingJobCard.equipment.forEach(eq => { equipmentMap[eq.equipment_name] = eq })
        }
        return EQUIPMENT_TYPES.map(name => ({
          name,
          type: equipmentMap[name]?.equipment_type || '',
          quantity: equipmentMap[name]?.quantity || 0,
          returned: equipmentMap[name]?.returned || false
        }))
      })(),
      damage_report: editingJobCard.damage_report || ''
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
      <span className="badge" style={{ background: style.bg, color: style.color }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const updateJobCardStatus = async (jobId, action) => {
    try {
      const res = await fetch(`${API_BASE}/job-cards/${jobId}/${action}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id 
        }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update status')
      }
      setSelectedJobCard(null)
      setChecklist(null)
      fetchJobCards()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const openJobCard = async (job) => {
    setSelectedJobCard(job)
    // Load checklist
    try {
      const res = await fetch(`${API_BASE}/job-cards/${job.id}`, {
        headers: { 'x-user-id': currentUser?.id }
      })
      const data = await res.json()
      setChecklist(data.checklist || {})
    } catch (err) {
      console.error('Error loading checklist:', err)
      setChecklist({})
    }
  }

  const saveChecklist = async (updates) => {
    if (!selectedJobCard) return
    setSavingChecklist(true)
    const newChecklist = { ...checklist, ...updates }
    setChecklist(newChecklist)
    try {
      await fetch(`${API_BASE}/job-cards/${selectedJobCard.id}/checklist`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id 
        },
        body: JSON.stringify(updates)
      })
    } catch (err) {
      console.error('Error saving checklist:', err)
    } finally {
      setSavingChecklist(false)
    }
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
            {hasPermission('job_cards', 'create') && (
              <button className="btn btn-primary" onClick={() => {
                setEditingJobCard(null)
                setShowForm(!showForm)
              }}>
                {showForm && !editingJobCard ? 'Cancel' : '+ New Job Card'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (hasPermission('job_cards', 'create') || editingJobCard) && (
        <Formik
          initialValues={getEditValues()}
          validationSchema={jobCardSchema}
          validateOnChange={true}
          validateOnBlur={true}
          enableReinitialize={true}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>{editingJobCard ? `Edit Job Card: ${editingJobCard.job_number}` : 'Create New Job Card'}</h3>
                {editingJobCard && (
                  <button type="button" className="btn" onClick={() => { setShowForm(false); setEditingJobCard(null) }}>
                    Cancel Edit
                  </button>
                )}
              </div>
              
              {/* Booking Selector */}
              {bookings.length > 0 && (
                <div style={{ background: '#e8f4fd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #b8daff' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>📅 Pre-fill from Booking (optional)</h4>
                  <div className="form-group">
                    <label>Select a Booking</label>
                    <select
                      value={values.booking_id || ''}
                      onChange={e => {
                        const bookingId = e.target.value
                        if (!bookingId) {
                          // Clear booking-related fields when "No booking" is selected
                          setFieldValue('booking_id', '')
                          return
                        }
                        
                        const booking = bookings.find(b => b.id === parseInt(bookingId))
                        if (booking) {
                          setFieldValue('booking_id', booking.id)
                          setFieldValue('purpose', booking.event_name || '')
                          setFieldValue('event_start_date', booking.start_date?.slice(0, 10) || '')
                          setFieldValue('event_finish_date', booking.end_date?.slice(0, 10) || '')
                          setFieldValue('notes', booking.location || '')
                          if (booking.truck_id) {
                            setFieldValue('truck_id', String(booking.truck_id))
                            const truck = trucks.find(t => t.id === booking.truck_id)
                            setFieldValue('vehicle_reg', truck?.plate_number || '')
                          }
                          if (booking.driver_id) {
                            setFieldValue('driver_id', String(booking.driver_id))
                          }
                        }
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    >
                      <option value="">-- No booking (manual entry) --</option>
                      {bookings.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.event_name} — {b.plate_number} — {b.start_date?.slice(0, 10)} to {b.end_date?.slice(0, 10)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Section 1: Basic Info */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>📄 Basic Information</h4>
                <div className="form-row">
                  <FormikField
                    label="Date"
                    name="job_date"
                    type="date"
                    required
                  />
                  <FormikField
                    label="Job Description"
                    name="purpose"
                    placeholder="Event description"
                    required
                  />
                  <FormikField
                    label="Client"
                    name="client_name"
                    placeholder="Client name"
                    required
                  />
                </div>
                <div className="form-row">
                  <FormikField
                    label="Event Start Date"
                    name="event_start_date"
                    type="date"
                    required
                  />
                  <FormikField
                    label="Event Finish Date"
                    name="event_finish_date"
                    type="date"
                    required
                  />
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input 
                        type="checkbox"
                        checked={values.branding_in_house}
                        onChange={e => setFieldValue('branding_in_house', e.target.checked)}
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
                  <FormikField
                    label="Driver"
                    name="driver_id"
                    type="select"
                    required
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </FormikField>
                  <FormikField
                    label="Crew"
                    name="crew"
                    placeholder="Crew members"
                  />
                  <FormikField
                    label="Team Lead"
                    name="team_lead"
                    placeholder="Team lead name"
                  />
                </div>
              </div>

              {/* Section 3: Route & Merchandise */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>📍 Route & Merchandise</h4>
                <div className="form-row">
                  <FormikField
                    label="Notes / Route"
                    name="notes"
                    placeholder="Route details and notes"
                  />
                  <FormikField
                    label="Merchandise"
                    name="merchandise"
                    placeholder="Merchandise details"
                  />
                </div>
              </div>

              {/* Section 4: Vehicle Info */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>🚛 Vehicle Information</h4>
                <div className="form-row">
                  <FormikField
                    label="Truck"
                    name="truck_id"
                    type="select"
                    required
                    onChange={e => {
                      const truck = trucks.find(t => t.id === parseInt(e.target.value))
                      setFieldValue('truck_id', e.target.value)
                      setFieldValue('vehicle_reg', truck?.plate_number || '')
                    }}
                  >
                    <option value="">Select Truck</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.plate_number} - {t.model}</option>
                    ))}
                  </FormikField>
                  <div className="form-group">
                    <label>Vehicle Reg</label>
                    <input 
                      value={values.vehicle_reg}
                      readOnly
                      style={{ background: '#e9ecef', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                  <FormikField
                    label="Kilometer"
                    name="kilometer"
                    type="number"
                    placeholder="Current mileage"
                  />
                </div>
                <div className="form-row">
                  <FormikField
                    label="Fuel Gauge"
                    name="fuel_gauge"
                    type="select"
                  >
                    <option value="reserve">Reserve (E)</option>
                    <option value="quarter">1/4</option>
                    <option value="half">1/2</option>
                    <option value="full">Full</option>
                  </FormikField>
                  <FormikField
                    label="Current Average (km/l)"
                    name="current_average"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 8.5"
                  />
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
                    {values.equipment.map((eq, index) => (
                      <tr key={index}>
                        <td><strong>{eq.name}</strong></td>
                        <td>
                          <input 
                            value={eq.type}
                            onChange={e => {
                              const newEquipment = [...values.equipment]
                              newEquipment[index].type = e.target.value
                              setFieldValue('equipment', newEquipment)
                            }}
                            placeholder="Model/Type"
                            style={{ width: '100%', padding: '0.25rem' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            value={eq.quantity}
                            onChange={e => {
                              const newEquipment = [...values.equipment]
                              newEquipment[index].quantity = parseInt(e.target.value) || 0
                              setFieldValue('equipment', newEquipment)
                            }}
                            style={{ width: '60px', padding: '0.25rem' }}
                            min="0"
                          />
                        </td>
                        <td>
                          <input 
                            type="checkbox"
                            checked={eq.returned}
                            onChange={e => {
                              const newEquipment = [...values.equipment]
                              newEquipment[index].returned = e.target.checked
                              setFieldValue('equipment', newEquipment)
                            }}
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
                <FormikField
                  label="Damage Report / Notes"
                  name="damage_report"
                  type="textarea"
                  placeholder="Report any damage or issues..."
                  rows="3"
                />
              </div>

              <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingJobCard ? '💾 Update Job Card' : '💾 Create Job Card'}
              </button>
            </Form>
          )}
        </Formik>
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
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => openJobCard(job)}
                      >
                        View
                      </button>
                      {hasPermission('job_cards', 'edit') && ['draft', 'pending_approval'].includes(job.status) && (
                        <button 
                          className="btn btn-small"
                          onClick={() => startEdit(job)}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Modal */}
      <AnimatedModal isOpen={!!selectedJobCard} onClose={() => { setSelectedJobCard(null); setChecklist(null) }} title={`Job Card: ${selectedJobCard?.job_number || ''}`}>
        {selectedJobCard && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              {getStatusBadge(selectedJobCard.status)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
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

            {/* Pre-Departure Safety Checklist */}
            {checklist && selectedJobCard.status === 'draft' && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem' }}>🔍 Pre-Departure Safety Checklist</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Complete all required checks (marked with *) before submitting for approval.
                </p>

                {/* Safety Equipment */}
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem' }}>🛡️ Safety Equipment</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { key: 'fire_extinguisher', label: 'Fire Extinguisher *' },
                      { key: 'first_aid_kit', label: 'First Aid Kit *' },
                      { key: 'warning_triangles', label: 'Warning Triangles *' },
                      { key: 'reflective_jacket', label: 'Reflective Jacket' },
                      { key: 'spare_wheel', label: 'Spare Wheel' },
                      { key: 'jack_and_tools', label: 'Jack & Tools' }
                    ].map(item => (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checklist[item.key] || false}
                          onChange={e => saveChecklist({ [item.key]: e.target.checked })}
                          style={{ width: 'auto' }}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Vehicle Condition */}
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem' }}>🚛 Vehicle Condition</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checklist.lights_working || false}
                        onChange={e => saveChecklist({ lights_working: e.target.checked })}
                        style={{ width: 'auto' }}
                      />
                      Lights Working *
                    </label>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Tires Condition *</label>
                      <select
                        value={checklist.tires_condition || 'not_checked'}
                        onChange={e => saveChecklist({ tires_condition: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <option value="not_checked">Not Checked</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Brakes Condition *</label>
                      <select
                        value={checklist.brakes_condition || 'not_checked'}
                        onChange={e => saveChecklist({ brakes_condition: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <option value="not_checked">Not Checked</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Fuel Level *</label>
                      <select
                        value={checklist.fuel_level || 'not_checked'}
                        onChange={e => saveChecklist({ fuel_level: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <option value="not_checked">Not Checked</option>
                        <option value="full">Full</option>
                        <option value="half">Half</option>
                        <option value="quarter">Quarter</option>
                        <option value="empty">Empty</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Oil Level</label>
                      <select
                        value={checklist.oil_level || 'not_checked'}
                        onChange={e => saveChecklist({ oil_level: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <option value="not_checked">Not Checked</option>
                        <option value="full">Full</option>
                        <option value="low">Low</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Coolant Level</label>
                      <select
                        value={checklist.coolant_level || 'not_checked'}
                        onChange={e => saveChecklist({ coolant_level: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <option value="not_checked">Not Checked</option>
                        <option value="full">Full</option>
                        <option value="low">Low</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Inspection Notes */}
                <div>
                  <label style={{ fontSize: '0.85rem' }}>Inspection Notes</label>
                  <textarea
                    value={checklist.inspection_notes || ''}
                    onChange={e => saveChecklist({ inspection_notes: e.target.value })}
                    placeholder="Any additional inspection notes..."
                    rows="2"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', resize: 'vertical' }}
                  />
                </div>

                {savingChecklist && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Saving...</p>}
              </div>
            )}

            {/* Status Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {selectedJobCard.status === 'draft' && hasPermission('job_cards', 'edit') && (
                <button className="btn btn-primary" onClick={() => updateJobCardStatus(selectedJobCard.id, 'submit')}>
                  📤 Submit for Approval
                </button>
              )}
              {selectedJobCard.status === 'pending_approval' && hasPermission('job_cards', 'approve') && (
                <button className="btn btn-success" onClick={() => updateJobCardStatus(selectedJobCard.id, 'approve')}>
                  ✅ Approve
                </button>
              )}
              {selectedJobCard.status === 'approved' && hasPermission('job_cards', 'edit') && (
                <button className="btn btn-primary" onClick={() => updateJobCardStatus(selectedJobCard.id, 'depart')}>
                  🚛 Mark Departed
                </button>
              )}
              {selectedJobCard.status === 'departed' && hasPermission('job_cards', 'edit') && (
                <button className="btn btn-success" onClick={() => updateJobCardStatus(selectedJobCard.id, 'complete')}>
                  ✔️ Mark Completed
                </button>
              )}
              <button className="btn" onClick={() => { setSelectedJobCard(null); setChecklist(null) }}>Close</button>
            </div>
          </>
        )}
      </AnimatedModal>
    </div>
  )
}
