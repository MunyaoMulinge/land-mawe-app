import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { usePermissions } from '../hooks/usePermissions'
import AnimatedModal from './AnimatedModal'
import AnimatedLoader from './AnimatedLoader'
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
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [editingDriver, setEditingDriver] = useState(null)
  const [unlinkedUsers, setUnlinkedUsers] = useState([])
  const [editForm, setEditForm] = useState({ name: '', phone: '', license_number: '' })

  const fetchDrivers = () => {
    Promise.all([
      fetch(`${API}/drivers`).then(r => r.json()),
      fetch(`${API}/drivers/unlinked-users`).then(r => r.json())
    ]).then(([driversData, unlinked]) => {
      setDrivers(driversData)
      setUnlinkedUsers(unlinked)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchDrivers() }, [])

  const toggleChecklist = async (driverId, field, currentValue) => {
    try {
      await fetch(`${API}/drivers/${driverId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value: !currentValue })
      })
      await fetchDrivers()
      const updatedDriver = drivers.find(d => d.id === driverId)
      if (updatedDriver) {
        setSelectedDriver({ ...updatedDriver, [field]: !currentValue })
      }
    } catch (err) {
      console.error('Error updating checklist:', err)
    }
  }

  const handleLinkExistingUser = async (userId) => {
    try {
      const res = await fetch(`${API}/drivers/link-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to link user')
        return
      }
      alert('Driver profile created and linked!')
      fetchDrivers()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const startEdit = (driver) => {
    setEditingDriver(driver)
    setEditForm({
      name: driver.name || '',
      phone: driver.phone || '',
      license_number: driver.license_number || ''
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API}/drivers/${editingDriver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update driver')
      }
      setEditingDriver(null)
      fetchDrivers()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <AnimatedLoader message="Loading drivers..." />

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Driver Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            To add a new driver, create a user with the "Driver" role in User Management.
          </p>
        </div>

        {/* Unlinked Driver Users Warning */}
        {unlinkedUsers.length > 0 && (
          <div style={{ 
            padding: '1rem', 
            background: '#fff3cd', 
            border: '1px solid #ffc107', 
            borderRadius: '8px', 
            marginBottom: '1rem' 
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>
              ⚠️ {unlinkedUsers.length} driver user(s) without driver profiles
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#856404', marginBottom: '0.75rem' }}>
              These users have the driver role but no driver profile. Click to create their profile.
            </p>
            {unlinkedUsers.map(u => (
              <div key={u.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '6px',
                marginBottom: '0.5rem'
              }}>
                <span style={{ color: '#333' }}>
                  {u.name} ({u.email})
                </span>
                <button 
                  className="btn btn-success btn-small"
                  onClick={() => handleLinkExistingUser(u.id)}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  Create Driver Profile
                </button>
              </div>
            ))}
          </div>
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
            {drivers.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No drivers yet. Create a user with the "Driver" role to get started.</td></tr>
            ) : drivers.map(driver => (
              <tr key={driver.id}>
                <td>{driver.name}</td>
                <td>{driver.phone || '-'}</td>
                <td>
                  {driver.license_number?.startsWith('PENDING') ? (
                    <span style={{ color: '#dc3545', fontStyle: 'italic' }}>⚠️ Pending</span>
                  ) : driver.license_number}
                </td>
                <td>
                  {driver.user_id ? (
                    <span className="badge" style={{ background: '#d4edda', color: '#155724' }}>✓ Linked</span>
                  ) : (
                    <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>Not linked</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${driver.onboarding_complete ? 'available' : 'pending'}`}>
                    {driver.onboarding_complete ? 'Complete' : 'Pending'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {hasPermission('drivers', 'edit') && (
                      <button className="btn btn-small" onClick={() => startEdit(driver)} title="Edit details">
                        ✏️
                      </button>
                    )}
                    {hasPermission('users', 'edit') && (
                      <button className="btn btn-small btn-primary" onClick={() => setSelectedDriver(driver)} title="Onboarding checklist">
                        📋
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Driver Modal */}
      <AnimatedModal
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        title={editingDriver ? `Edit Driver - ${editingDriver.name}` : 'Edit Driver'}
      >
        {editingDriver && (
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input 
                value={editForm.name} 
                onChange={e => setEditForm({...editForm, name: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input 
                value={editForm.phone} 
                onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                placeholder="e.g. 0722123456"
              />
            </div>
            <div className="form-group">
              <label>License Number {editingDriver.license_number?.startsWith('PENDING') && <span style={{ color: '#dc3545' }}>*Required</span>}</label>
              <input 
                value={editForm.license_number} 
                onChange={e => setEditForm({...editForm, license_number: e.target.value})} 
                placeholder="e.g. DL123456"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn" onClick={() => setEditingDriver(null)}>Cancel</button>
              <button type="submit" className="btn btn-success">Save Changes</button>
            </div>
          </form>
        )}
      </AnimatedModal>

      {/* Checklist Modal */}
      <AnimatedModal
        isOpen={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        title={selectedDriver ? `Onboarding Checklist - ${selectedDriver.name}` : 'Onboarding Checklist'}
      >
        {selectedDriver && (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Driver: <strong>{selectedDriver.name}</strong> | License: {selectedDriver.license_number}
            </p>
            <ul className="checklist" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {checklistItems.map(item => (
                <li key={item.key} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <input
                    type="checkbox"
                    id={`checklist-${item.key}`}
                    checked={selectedDriver[item.key] || false}
                    onChange={() => toggleChecklist(selectedDriver.id, item.key, selectedDriver[item.key])}
                    disabled={!hasPermission('users', 'edit')}
                    style={{ 
                      marginRight: '0.75rem', 
                      width: '24px', 
                      height: '24px', 
                      cursor: hasPermission('users', 'edit') ? 'pointer' : 'not-allowed',
                      accentColor: '#007bff',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <label htmlFor={`checklist-${item.key}`} style={{ cursor: 'pointer', fontSize: '1rem' }}>
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedDriver(null)}>Close</button>
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  )
}
