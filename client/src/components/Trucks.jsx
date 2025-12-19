import { useState, useEffect } from 'react'

import { API_BASE } from '../config'
const API = API_BASE

export default function Trucks() {
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate_number: '', model: '', capacity: '' })

  const fetchTrucks = () => {
    fetch(`${API}/trucks`)
      .then(r => r.json())
      .then(data => { setTrucks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchTrucks() }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetch(`${API}/trucks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    }).then(() => {
      setForm({ plate_number: '', model: '', capacity: '' })
      setShowForm(false)
      fetchTrucks()
    })
  }

  const updateStatus = (id, status) => {
    fetch(`${API}/trucks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(() => fetchTrucks())
  }

  if (loading) return <div className="loading">Loading trucks...</div>

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Fleet Management</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Truck'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Plate Number</label>
                <input value={form.plate_number} onChange={e => setForm({...form, plate_number: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} placeholder="e.g. 5 tons" />
              </div>
            </div>
            <button type="submit" className="btn btn-success">Add Truck</button>
          </form>
        )}

        <table>
          <thead>
            <tr>
              <th>Plate Number</th>
              <th>Model</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(truck => (
              <tr key={truck.id}>
                <td>{truck.plate_number}</td>
                <td>{truck.model}</td>
                <td>{truck.capacity}</td>
                <td><span className={`badge ${truck.status}`}>{truck.status}</span></td>
                <td>
                  <select value={truck.status} onChange={e => updateStatus(truck.id, e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px' }}>
                    <option value="available">Available</option>
                    <option value="booked">Booked</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
