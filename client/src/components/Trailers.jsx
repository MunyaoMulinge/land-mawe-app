import { useState, useEffect, useRef } from 'react'
import { Formik, Form } from 'formik'
import * as Yup from 'yup'
import { API_BASE } from '../config'
import AnimatedLoader from './AnimatedLoader'
import FormikField from './FormikField'
import AnimatedModal from './AnimatedModal'
import { gsap } from 'gsap'
import { usePermissions } from '../hooks/usePermissions'

// Validation schema
const trailerSchema = Yup.object({
  trailer_number: Yup.string().required('Trailer number is required'),
  type: Yup.string().required('Type is required'),
  make: Yup.string(),
  model: Yup.string(),
  year: Yup.number().min(1900).max(new Date().getFullYear() + 1),
  capacity_kg: Yup.number().positive(),
  capacity_volume: Yup.string(),
  chassis_number: Yup.string(),
  registration_number: Yup.string(),
  current_truck_id: Yup.number().nullable(),
  status: Yup.string().oneOf(['available', 'in_use', 'maintenance', 'retired']),
  notes: Yup.string()
})

const maintenanceSchema = Yup.object({
  service_date: Yup.date().required('Service date is required'),
  service_type: Yup.string().required('Service type is required'),
  description: Yup.string().required('Description is required'),
  mileage_at_service: Yup.number().positive(),
  cost: Yup.number().min(0),
  vendor_name: Yup.string(),
  vendor_contact: Yup.string(),
  invoice_number: Yup.string(),
  next_service_date: Yup.date(),
  next_service_mileage: Yup.number().positive(),
  notes: Yup.string()
})

export default function Trailers({ currentUser }) {
  const [trailers, setTrailers] = useState([])
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrailer, setEditingTrailer] = useState(null)
  const [selectedTrailer, setSelectedTrailer] = useState(null)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [maintenanceRecords, setMaintenanceRecords] = useState([])
  const [filter, setFilter] = useState({ status: '', type: '' })
  const tableRef = useRef(null)
  const { hasPermission } = usePermissions()

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.status) params.append('status', filter.status)
      if (filter.type) params.append('type', filter.type)

      const [trailersRes, trucksRes] = await Promise.all([
        fetch(`${API_BASE}/trailers?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/trucks`)
      ])

      setTrailers(await trailersRes.json())
      setTrucks(await trucksRes.json())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching trailers:', err)
      setLoading(false)
    }
  }

  const fetchMaintenanceHistory = async (trailerId) => {
    try {
      const res = await fetch(`${API_BASE}/trailers/${trailerId}/maintenance`, {
        headers: { 'x-user-id': currentUser?.id }
      })
      setMaintenanceRecords(await res.json())
    } catch (err) {
      console.error('Error fetching maintenance:', err)
    }
  }

  useEffect(() => { fetchData() }, [filter])

  useEffect(() => {
    if (tableRef.current && !loading) {
      const rows = tableRef.current.querySelectorAll('tbody tr')
      gsap.fromTo(rows,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out' }
      )
    }
  }, [trailers, loading])

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const url = editingTrailer 
        ? `${API_BASE}/trailers/${editingTrailer.id}`
        : `${API_BASE}/trailers`
      const method = editingTrailer ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(values)
      })

      if (!res.ok) throw new Error('Failed to save trailer')
      
      resetForm()
      setShowForm(false)
      setEditingTrailer(null)
      fetchData()
      alert(editingTrailer ? 'Trailer updated!' : 'Trailer created!')
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMaintenanceSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API_BASE}/trailers/${selectedTrailer.id}/maintenance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(values)
      })

      if (!res.ok) throw new Error('Failed to add maintenance record')
      
      resetForm()
      setShowMaintenanceModal(false)
      fetchMaintenanceHistory(selectedTrailer.id)
      fetchData()
      alert('Maintenance record added!')
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignTruck = async (truckId) => {
    try {
      const res = await fetch(`${API_BASE}/trailers/${selectedTrailer.id}/assign`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({ truck_id: truckId })
      })

      if (!res.ok) throw new Error('Failed to assign trailer')
      
      setShowAssignModal(false)
      setSelectedTrailer(null)
      fetchData()
      alert('Trailer assigned successfully!')
    } catch (err) {
      alert(err.message)
    }
  }

  const startEdit = (trailer) => {
    setEditingTrailer(trailer)
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingTrailer(null)
    setShowForm(false)
  }

  const getTrailerTypeIcon = (type) => {
    const icons = {
      flatbed: '📦',
      enclosed: '🚛',
      refrigerated: '❄️',
      tanker: '⛽',
      lowboy: '🔧',
      car_carrier: '🚗',
      other: '📋'
    }
    return icons[type] || '📋'
  }

  const getStatusBadge = (status) => {
    const styles = {
      available: { bg: '#d4edda', color: '#155724' },
      in_use: { bg: '#cce5ff', color: '#004085' },
      maintenance: { bg: '#fff3cd', color: '#856404' },
      retired: { bg: '#f8d7da', color: '#721c24' }
    }
    const s = styles[status] || styles.available
    return (
      <span className="badge" style={{ background: s.bg, color: s.color }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  if (loading) return <AnimatedLoader message="Loading trailers..." />

  const initialValues = editingTrailer || {
    trailer_number: '',
    type: 'flatbed',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    capacity_kg: '',
    capacity_volume: '',
    chassis_number: '',
    registration_number: '',
    current_truck_id: '',
    status: 'available',
    notes: ''
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>🚛 Trailer Management</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={filter.status} 
              onChange={e => setFilter({...filter, status: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
            <select 
              value={filter.type} 
              onChange={e => setFilter({...filter, type: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="">All Types</option>
              <option value="flatbed">Flatbed</option>
              <option value="enclosed">Enclosed</option>
              <option value="refrigerated">Refrigerated</option>
              <option value="tanker">Tanker</option>
              <option value="lowboy">Lowboy</option>
              <option value="car_carrier">Car Carrier</option>
            </select>
            {hasPermission('trailers', 'create') && (
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : '+ Add Trailer'}
              </button>
            )}
          </div>
        </div>

        {showForm && hasPermission('trailers', 'create') && (
          <Formik
            initialValues={initialValues}
            validationSchema={trailerSchema}
            validateOnChange={true}
            validateOnBlur={true}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, values }) => (
              <Form style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem' }}>
                  {editingTrailer ? 'Edit Trailer' : 'Add New Trailer'}
                </h3>
                <div className="form-row">
                  <FormikField label="Trailer Number *" name="trailer_number" placeholder="e.g., TRL-001" required />
                  <FormikField label="Type *" name="type" type="select" required>
                    <option value="flatbed">Flatbed</option>
                    <option value="enclosed">Enclosed</option>
                    <option value="refrigerated">Refrigerated</option>
                    <option value="tanker">Tanker</option>
                    <option value="lowboy">Lowboy</option>
                    <option value="car_carrier">Car Carrier</option>
                    <option value="other">Other</option>
                  </FormikField>
                  <FormikField label="Status" name="status" type="select">
                    <option value="available">Available</option>
                    <option value="in_use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </FormikField>
                </div>
                <div className="form-row">
                  <FormikField label="Make" name="make" placeholder="e.g., Trail King" />
                  <FormikField label="Model" name="model" placeholder="e.g., TK-40" />
                  <FormikField label="Year" name="year" type="number" />
                </div>
                <div className="form-row">
                  <FormikField label="Capacity (kg)" name="capacity_kg" type="number" placeholder="e.g., 20000" />
                  <FormikField label="Capacity (Volume)" name="capacity_volume" placeholder="e.g., 40ft or 20cbm" />
                  <FormikField label="Assigned Truck" name="current_truck_id" type="select">
                    <option value="">None (Available)</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.plate_number}</option>
                    ))}
                  </FormikField>
                </div>
                <div className="form-row">
                  <FormikField label="Chassis Number" name="chassis_number" placeholder="VIN/Chassis number" />
                  <FormikField label="Registration Number" name="registration_number" placeholder="Registration" />
                </div>
                <FormikField label="Notes" name="notes" type="textarea" placeholder="Additional information..." />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingTrailer ? 'Update Trailer' : 'Add Trailer')}
                  </button>
                  {editingTrailer && (
                    <button type="button" className="btn" onClick={cancelEdit}>Cancel</button>
                  )}
                </div>
              </Form>
            )}
          </Formik>
        )}

        <table ref={tableRef}>
          <thead>
            <tr>
              <th>Trailer</th>
              <th>Type</th>
              <th>Assigned Truck</th>
              <th>Status</th>
              <th>Capacity</th>
              <th>Next Service</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trailers.map(trailer => (
              <tr key={trailer.id}>
                <td>
                  <strong>{trailer.trailer_number}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {trailer.make} {trailer.model} {trailer.year}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>
                    {getTrailerTypeIcon(trailer.type)}
                  </span>
                  {trailer.type.replace('_', ' ')}
                </td>
                <td>
                  {trailer.current_truck ? (
                    <span className="badge" style={{ background: '#cce5ff', color: '#004085' }}>
                      {trailer.current_truck.plate_number}
                    </span>
                  ) : (
                    <span className="badge" style={{ background: '#d4edda', color: '#155724' }}>
                      Available
                    </span>
                  )}
                </td>
                <td>{getStatusBadge(trailer.status)}</td>
                <td>
                  {trailer.capacity_kg && <div>{trailer.capacity_kg.toLocaleString()} kg</div>}
                  {trailer.capacity_volume && <div style={{ fontSize: '0.75rem' }}>{trailer.capacity_volume}</div>}
                </td>
                <td>
                  {trailer.next_service_date ? (
                    <span style={{ 
                      color: new Date(trailer.next_service_date) < new Date() ? '#dc3545' : 'inherit',
                      fontWeight: new Date(trailer.next_service_date) < new Date() ? 'bold' : 'normal'
                    }}>
                      {new Date(trailer.next_service_date).toLocaleDateString()}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      className="btn btn-small" 
                      onClick={() => startEdit(trailer)}
                      title="Edit trailer"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn-small btn-primary"
                      onClick={() => { setSelectedTrailer(trailer); setShowAssignModal(true); }}
                      title="Assign to truck"
                    >
                      🚛
                    </button>
                    <button 
                      className="btn btn-small"
                      onClick={() => { 
                        setSelectedTrailer(trailer); 
                        fetchMaintenanceHistory(trailer.id);
                        setShowMaintenanceModal(true);
                      }}
                      title="Maintenance history"
                    >
                      🔧
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {trailers.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No trailers found. Add your first trailer!
          </p>
        )}
      </div>

      {/* Assign Truck Modal */}
      <AnimatedModal
        isOpen={!!showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedTrailer(null); }}
        title={`Assign ${selectedTrailer?.trailer_number} to Truck`}
      >
        {selectedTrailer && (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Currently assigned to: {selectedTrailer.current_truck?.plate_number || 'None (Available)'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                className="btn" 
                onClick={() => handleAssignTruck(null)}
                style={{ justifyContent: 'flex-start' }}
              >
                🚫 Make Available (Unassign)
              </button>
              {trucks.filter(t => t.status === 'available' || t.id === selectedTrailer.current_truck_id).map(truck => (
                <button 
                  key={truck.id}
                  className="btn btn-primary"
                  onClick={() => handleAssignTruck(truck.id)}
                  style={{ 
                    justifyContent: 'flex-start',
                    opacity: truck.id === selectedTrailer.current_truck_id ? 0.6 : 1
                  }}
                  disabled={truck.id === selectedTrailer.current_truck_id}
                >
                  {truck.id === selectedTrailer.current_truck_id ? '✓ ' : ''}{truck.plate_number} - {truck.model}
                </button>
              ))}
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Maintenance Modal */}
      <AnimatedModal
        isOpen={!!showMaintenanceModal}
        onClose={() => { setShowMaintenanceModal(false); setSelectedTrailer(null); setMaintenanceRecords([]); }}
        title={`Maintenance History - ${selectedTrailer?.trailer_number}`}
      >
        {selectedTrailer && (
          <div>
            <Formik
              initialValues={{
                service_date: new Date().toISOString().split('T')[0],
                service_type: '',
                description: '',
                mileage_at_service: selectedTrailer.current_mileage || '',
                cost: '',
                vendor_name: '',
                vendor_contact: '',
                invoice_number: '',
                next_service_date: '',
                next_service_mileage: '',
                notes: ''
              }}
              validationSchema={maintenanceSchema}
              onSubmit={handleMaintenanceSubmit}
            >
              {({ isSubmitting }) => (
                <Form style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>Add Maintenance Record</h4>
                  <div className="form-row">
                    <FormikField label="Date *" name="service_date" type="date" required />
                    <FormikField label="Type *" name="service_type" placeholder="e.g., Tire Replacement" required />
                    <FormikField label="Cost (KES)" name="cost" type="number" step="0.01" />
                  </div>
                  <FormikField label="Description *" name="description" type="textarea" placeholder="What was done..." required />
                  <div className="form-row">
                    <FormikField label="Mileage at Service" name="mileage_at_service" type="number" />
                    <FormikField label="Next Service Date" name="next_service_date" type="date" />
                    <FormikField label="Next Service Mileage" name="next_service_mileage" type="number" />
                  </div>
                  <div className="form-row">
                    <FormikField label="Vendor Name" name="vendor_name" />
                    <FormikField label="Vendor Contact" name="vendor_contact" />
                    <FormikField label="Invoice Number" name="invoice_number" />
                  </div>
                  <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Maintenance Record'}
                  </button>
                </Form>
              )}
            </Formik>

            <h4>Previous Maintenance</h4>
            {maintenanceRecords.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No maintenance records yet.</p>
            ) : (
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {maintenanceRecords.map(record => (
                  <div key={record.id} style={{ 
                    padding: '0.75rem', 
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    marginBottom: '0.5rem',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{record.service_type}</strong>
                      <span>{new Date(record.service_date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {record.description}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Cost: KES {record.cost?.toLocaleString() || 'N/A'} | 
                      Mileage: {record.mileage_at_service?.toLocaleString() || 'N/A'} km
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatedModal>
    </div>
  )
}
