import { useState, useEffect } from 'react'

import { API_BASE } from '../config'
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
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showLinkModal, setShowLinkModal] = useState(null)
  const [linkForm, setLinkForm] = useState({ email: '', password: '', phone: '' })
  const [form, setForm] = useState({ name: '', phone: '', license_number: '' })

  const fetchDrivers = () => {
    fetch(`${API}/drivers`)
      .then(r => r.json())
      .then(data => { setDrivers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchDrivers() }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetch(`${API}/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    }).then(() => {
      setForm({ name: '', phone: '', license_number: '' })
      setShowForm(false)
      fetchDrivers()
    })
  }

  const toggleChecklist = (driverId, field, currentValue) => {
    fetch(`${API}/drivers/${driverId}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value: !currentValue })
    }).then(() => fetchDrivers())
  }

  const handleCreateDriverAccount = async (e) => {
    e.preventDefault()
    try {
      // Create user account with driver role
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: linkForm.email,
          password: linkForm.password,
          name: showLinkModal.name,
          phone: linkForm.phone || showLinkModal.phone,
          role: 'driver'
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        alert(data.error || 'Failed to create account')
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
      setLinkForm({ email: '', password: '', phone: '' })
      fetchDrivers()
    } catch (err) {
      alert('Error creating driver account: ' + err.message)
    }
  }

  if (loading) return <div className="loading">Loading drivers...</div>

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
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>License Number</label>
                <input value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="btn btn-success">Add Driver</button>
          </form>
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
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}>
                    {selectedDriver?.id === driver.id ? 'Hide' : 'Checklist'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDriver && (
        <div className="card">
          <h2>Onboarding Checklist - {selectedDriver.name}</h2>
          <ul className="checklist">
            {checklistItems.map(item => (
              <li key={item.key}>
                <input
                  type="checkbox"
                  checked={selectedDriver[item.key] || false}
                  onChange={() => toggleChecklist(selectedDriver.id, item.key, selectedDriver[item.key])}
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Driver Account Modal */}
      {showLinkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '500px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1rem' }}>🚗 Create Driver Account</h3>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Creating login account for: <strong>{showLinkModal.name}</strong>
            </p>
            <form onSubmit={handleCreateDriverAccount}>
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email"
                  value={linkForm.email}
                  onChange={e => setLinkForm({...linkForm, email: e.target.value})}
                  placeholder="driver@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input 
                  type="password"
                  value={linkForm.password}
                  onChange={e => setLinkForm({...linkForm, password: e.target.value})}
                  placeholder="Minimum 6 characters"
                  minLength="6"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input 
                  value={linkForm.phone}
                  onChange={e => setLinkForm({...linkForm, phone: e.target.value})}
                  placeholder={showLinkModal.phone || "Phone number"}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowLinkModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">✅ Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
