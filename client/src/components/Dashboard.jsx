import { useState, useEffect } from 'react'

import { API_BASE } from '../config'
const API = API_BASE

export default function Dashboard() {
  const [stats, setStats] = useState({ available: 0, booked: 0, maintenance: 0 })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/trucks/stats`).then(r => r.json()),
      fetch(`${API}/bookings`).then(r => r.json())
    ]).then(([statsData, bookingsData]) => {
      const statsMap = { available: 0, booked: 0, maintenance: 0 }
      statsData.forEach(s => { statsMap[s.status] = parseInt(s.count) })
      setStats(statsMap)
      setBookings(bookingsData.slice(0, 5))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card available">
          <div className="number">{stats.available}</div>
          <div className="label">Available Trucks</div>
        </div>
        <div className="stat-card booked">
          <div className="number">{stats.booked}</div>
          <div className="label">Booked Trucks</div>
        </div>
        <div className="stat-card maintenance">
          <div className="number">{stats.maintenance}</div>
          <div className="label">In Maintenance</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.available + stats.booked + stats.maintenance}</div>
          <div className="label">Total Fleet</div>
        </div>
      </div>

      <div className="card">
        <h2>Recent Bookings</h2>
        {bookings.length === 0 ? (
          <p>No bookings yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Truck</th>
                <th>Driver</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>{b.event_name}</td>
                  <td>{b.plate_number} ({b.model})</td>
                  <td>{b.driver_name || '-'}</td>
                  <td>{b.start_date?.slice(0,10)} - {b.end_date?.slice(0,10)}</td>
                  <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
