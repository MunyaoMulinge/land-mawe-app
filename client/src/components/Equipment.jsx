import { useState, useEffect } from 'react'
import { Formik, Form } from 'formik'
import { API_BASE } from '../config'
import { usePermissions } from '../hooks/usePermissions'
import FormikField from './FormikField'
import { equipmentSchema } from '../validations/schemas'

const EQUIPMENT_CATEGORIES = [
  'Generator Model', 'Sub Woofer', 'Full Range', 'Rear Speakers', 'Monitor',
  'Microphones', 'Batteries', 'Amplifier', 'Cross Over', 'Mixer', 'Lights', 'Other'
]

export default function Equipment({ currentUser }) {
  const { hasPermission } = usePermissions()
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState({ category: '', status: 'all' })

  const initialValues = {
    name: '',
    category: '',
    model: '',
    serial_number: '',
    quantity: 1,
    condition: 'good',
    location: '',
    notes: ''
  }

  const fetchEquipment = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.category) params.append('category', filter.category)
      
      const res = await fetch(`${API_BASE}/equipment?${params}`)
      const data = await res.json()
      
      let filtered = data
      if (filter.status === 'available') {
        filtered = data.filter(e => e.status === 'available')
      } else if (filter.status === 'in_use') {
        filtered = data.filter(e => e.status === 'in_use')
      }
      
      setEquipment(filtered)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching equipment:', err)
      setLoading(false)
    }
  }

  useEffect(() => { fetchEquipment() }, [filter])

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API_BASE}/equipment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify(values)
      })
      
      if (!res.ok) throw new Error('Failed to add equipment')
      
      resetForm()
      setShowForm(false)
      fetchEquipment()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getConditionBadge = (condition) => {
    const styles = {
      excellent: { bg: '#d4edda', color: '#155724' },
      good: { bg: '#d1ecf1', color: '#0c5460' },
      fair: { bg: '#fff3cd', color: '#856404' },
      poor: { bg: '#f8d7da', color: '#721c24' },
      damaged: { bg: '#f8d7da', color: '#721c24' }
    }
    const s = styles[condition] || styles.good
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{condition.toUpperCase()}</span>
  }

  const getStatusBadge = (status) => {
    const styles = {
      available: { bg: '#d4edda', color: '#155724' },
      in_use: { bg: '#fff3cd', color: '#856404' },
      maintenance: { bg: '#f8d7da', color: '#721c24' }
    }
    const s = styles[status] || styles.available
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{status.replace('_', ' ').toUpperCase()}</span>
  }

  if (loading) return <div className="loading">Loading equipment...</div>

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📦 Equipment Management</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select 
              value={filter.category}
              onChange={e => setFilter({...filter, category: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="">All Categories</option>
              {EQUIPMENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select 
              value={filter.status}
              onChange={e => setFilter({...filter, status: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
            </select>
            {hasPermission('equipment', 'create') && (
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : '+ Add Equipment'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Formik
          initialValues={initialValues}
          validationSchema={equipmentSchema}
          validateOnChange={true}
          validateOnBlur={true}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="card">
              <h3 style={{ marginBottom: '1rem' }}>Add New Equipment</h3>
              <div className="form-row">
                <FormikField
                  label="Equipment Name"
                  name="name"
                  placeholder="e.g. JBL Speaker"
                  required
                />
                <FormikField
                  label="Category"
                  name="category"
                  type="select"
                  required
                >
                  <option value="">Select Category</option>
                  {EQUIPMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </FormikField>
                <FormikField
                  label="Model"
                  name="model"
                  placeholder="Model number"
                />
              </div>
              <div className="form-row">
                <FormikField
                  label="Serial Number"
                  name="serial_number"
                  placeholder="Serial/Asset number"
                />
                <FormikField
                  label="Quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  required
                />
                <FormikField
                  label="Condition"
                  name="condition"
                  type="select"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="damaged">Damaged</option>
                </FormikField>
              </div>
              <div className="form-row">
                <FormikField
                  label="Location"
                  name="location"
                  placeholder="Storage location"
                />
                <FormikField
                  label="Notes"
                  name="notes"
                  placeholder="Additional notes"
                />
              </div>
              <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : '💾 Add Equipment'}
              </button>
            </Form>
          )}
        </Formik>
      )}

      {/* Equipment List */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Equipment Inventory</h3>
        {equipment.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No equipment found. Add your first item!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Model</th>
                <th>Serial #</th>
                <th>Quantity</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>{item.model || '-'}</td>
                  <td>{item.serial_number || '-'}</td>
                  <td>{item.quantity}</td>
                  <td>{getConditionBadge(item.condition)}</td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td>{item.location || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
