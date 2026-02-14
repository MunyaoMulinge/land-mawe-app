import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { usePermissions } from '../hooks/usePermissions'
const API = API_BASE

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ truck_id: '', driver_id: '', event_name: '', location: '', start_date: '', end_date: '' })
  const { hasPermission } = usePermissions()

  const fetchData = () => {
    Promise.all([
      fetch(`${API}/bookings`).then(r => r.json()),
      fetch(`${API}/trucks`).then(r => r.json()),
      fetch(`${API}/drivers`).then(r => r.json())
    ]).then(([b, t, d]) => {
      setBookings(b)
      setTrucks(t.filter(truck => truck.status === 'available'))
      setDrivers(d.filter(driver => driver.onboarding_complete))
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetch(`${API}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    }).then(() => {
      setForm({ truck_id: '', driver_id: '', event_name: '', location: '', start_date: '', end_date: '' })
      setShowForm(false)
      fetchData()
    })
  }

  if (loading) return <div className="loading">Loading bookings...</div>

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Roadshow Bookings</h2>
          {hasPermission('bookings', 'create') && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Booking'}
            </button>
          )}
        </div>

        {showForm && hasPermission('bookings', 'create') && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Event Name</label>
                <input value={form.event_name} onChange={e => setForm({...form, event_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Truck</label>
                <select value={form.truck_id} onChange={e => setForm({...form, truck_id: e.target.value})} required>
                  <option value="">Select truck...</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>{t.plate_number} - {t.model}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Driver</label>
                <select value={form.driver_id} onChange={e => setForm({...form, driver_id: e.target.value})}>
                  <option value="">Select driver...</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="btn btn-success">Create Booking</button>
          </form>
        )}

        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Location</th>
              <th>Truck</th>
              <th>Driver</th>
              <th>Dates</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No bookings yet</td></tr>
            ) : bookings.map(b => (
              <tr key={b.id}>
                <td>{b.event_name}</td>
                <td>{b.location || '-'}</td>
                <td>{b.plate_number} ({b.model})</td>
                <td>{b.driver_name || '-'}</td>
                <td>{b.start_date?.slice(0,10)} - {b.end_date?.slice(0,10)}</td>
                <td><span className={`badge ${b.status}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
