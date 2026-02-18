import { useState, useEffect, useRef } from 'react'
import { Formik, Form } from 'formik'
import { API_BASE } from '../config'
import { usePermissions } from '../hooks/usePermissions'
import AnimatedModal from './AnimatedModal'
import AnimatedLoader from './AnimatedLoader'
import FormikField from './FormikField'
import { driverSchema, driverAccountSchema } from '../validations/schemas'
const API = API_BASE

const checklistItems = [
  { key: 'license_verified', label: 'License Verified' },
  { key: 'medical_check', label: 'Medical Check Complete' },
  { key: 'safety_training', label: 'Safety Training Done' },
  { key: 'vehicle_inspection', label: 'Vehicle Inspection Passed' },
  { key: 'insurance_verified', label: 'Insurance Verified' },
  { key: 'contract_signed', label: 'Contract Signed' }
]

export default function Drivers() {
  const { hasPermission } = usePermissions()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showLinkModal, setShowLinkModal] = useState(null)
  const checklistRef = useRef(null)

  // Auto-scroll to checklist when opened
  useEffect(() => {
    if (selectedDriver && checklistRef.current) {
      checklistRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedDriver])

  const fetchDrivers = () => {
    fetch(`${API}/drivers`)
      .then(r => r.json())
      .then(data => { setDrivers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchDrivers() }, [])

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create driver')
      }
      
      resetForm()
      setShowForm(false)
      fetchDrivers()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleChecklist = (driverId, field, currentValue) => {
    fetch(`${API}/drivers/${driverId}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value: !currentValue })
    }).then(() => fetchDrivers())
  }

  const handleCreateDriverAccount = async (values, { setSubmitting }) => {
    try {
      // Create user account with driver role
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          name: showLinkModal.name,
          phone: values.phone || showLinkModal.phone,
          role: 'driver'
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        alert(data.error || 'Failed to create account')
        setSubmitting(false)
        return
      }
      
      // Link driver to user
      await fetch(`${API}/drivers/${showLinkModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id })
      })
      
      alert('Driver account created successfully!')
      setShowLinkModal(null)
      fetchDrivers()
    } catch (err) {
      alert('Error creating driver account: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <AnimatedLoader message="Loading drivers..." />

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Driver Management</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Driver'}
          </button>
        </div>

        {showForm && (
          <Formik
            initialValues={{ name: '', phone: '', license_number: '' }}
            validationSchema={driverSchema}
            validateOnChange={true}
            validateOnBlur={true}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div className="form-row">
                  <FormikField
                    label="Full Name"
                    name="name"
                    placeholder="Driver's full name"
                    required
                  />
                  <FormikField
                    label="Phone"
                    name="phone"
                    placeholder="e.g. 0722123456"
                  />
                  <FormikField
                    label="License Number"
                    name="license_number"
                    placeholder="e.g. DL123456"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Driver'}
                </button>
              </Form>
            )}
          </Formik>
        )}

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>License</th>
              <th>Account</th>
              <th>Onboarding</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(driver => (
              <tr key={driver.id}>
                <td>{driver.name}</td>
                <td>{driver.phone}</td>
                <td>{driver.license_number}</td>
                <td>
                  {driver.user_id ? (
                    <span className="badge" style={{ background: '#d4edda', color: '#155724' }}>✓ Linked</span>
                  ) : (
                    <button 
                      className="btn btn-small btn-primary" 
                      onClick={() => setShowLinkModal(driver)}
                      title="Create driver account"
                    >
                      Create Account
                    </button>
                  )}
                </td>
                <td>
                  <span className={`badge ${driver.onboarding_complete ? 'available' : 'pending'}`}>
                    {driver.onboarding_complete ? 'Complete' : 'Pending'}
                  </span>
                </td>
                <td>
                  {hasPermission('users', 'edit') && (
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}>
                      {selectedDriver?.id === driver.id ? 'Hide' : 'Checklist'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDriver && hasPermission('users', 'edit') && (
        <div ref={checklistRef} className="card">
          <h2>Onboarding Checklist - {selectedDriver.name}</h2>
          <ul className="checklist">
            {checklistItems.map(item => (
              <li key={item.key}>
                <input
                  type="checkbox"
                  checked={selectedDriver[item.key] || false}
                  onChange={() => toggleChecklist(selectedDriver.id, item.key, selectedDriver[item.key])}
                  disabled={!hasPermission('users', 'edit')}
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Driver Account Modal */}
      <AnimatedModal
        isOpen={!!showLinkModal}
        onClose={() => setShowLinkModal(null)}
        title="🚗 Create Driver Account"
      >
        {showLinkModal && (
          <Formik
            initialValues={{ email: '', password: '', phone: '' }}
            validationSchema={driverAccountSchema}
            validateOnChange={true}
            validateOnBlur={true}
            onSubmit={handleCreateDriverAccount}
          >
            {({ isSubmitting }) => (
              <Form>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Creating login account for: <strong>{showLinkModal.name}</strong>
                </p>
                <FormikField
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="driver@example.com"
                  required
                />
                <FormikField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  required
                />
                <FormikField
                  label="Phone (optional)"
                  name="phone"
                  placeholder={showLinkModal.phone || "Phone number"}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setShowLinkModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : '✅ Create Account'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </AnimatedModal>
    </div>
  )
}
