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
    </div>
  )
}
