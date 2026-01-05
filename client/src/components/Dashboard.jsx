import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { useTheme } from '../hooks/useTheme'

export default function Dashboard() {
  const { theme } = useTheme()
  const [truckStats, setTruckStats] = useState({ available: 0, booked: 0, maintenance: 0 })
  const [fuelStats, setFuelStats] = useState(null)
  const [maintenanceStats, setMaintenanceStats] = useState(null)
  const [complianceStats, setComplianceStats] = useState(null)
  const [invoiceStats, setInvoiceStats] = useState(null)
  const [jobCardStats, setJobCardStats] = useState(null)
  const [complianceAlerts, setComplianceAlerts] = useState({ expired: [], expiring_soon: [] })
  const [upcomingMaintenance, setUpcomingMaintenance] = useState({ upcoming: [], overdue: [] })
  const [recentBookings, setRecentBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const [
        trucksRes, fuelRes, maintRes, compRes, invRes, jobRes,
        alertsRes, upcomingRes, bookingsRes
      ] = await Promise.all([
        fetch(`${API_BASE}/trucks/stats`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/fuel/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/maintenance/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/compliance/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/invoices/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/job-cards/stats/summary`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/compliance/alerts`).then(r => r.json()).catch(() => ({ expired: [], expiring_soon: [] })),
        fetch(`${API_BASE}/maintenance/upcoming`).then(r => r.json()).catch(() => ({ upcoming: [], overdue: [] })),
        fetch(`${API_BASE}/bookings`).then(r => r.json()).catch(() => [])
      ])

      const statsMap = { available: 0, booked: 0, maintenance: 0 }
      trucksRes.forEach(s => { statsMap[s.status] = parseInt(s.count) })
      setTruckStats(statsMap)
      setFuelStats(fuelRes)
      setMaintenanceStats(maintRes)
      setComplianceStats(compRes)
      setInvoiceStats(invRes)
      setJobCardStats(jobRes)
      setComplianceAlerts(alertsRes)
      setUpcomingMaintenance(upcomingRes)
      setRecentBookings(bookingsRes.slice(0, 5))
      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0)
  }

  const totalFleet = truckStats.available + truckStats.booked + truckStats.maintenance
  const totalAlerts = (complianceAlerts.expired?.length || 0) + (complianceAlerts.expiring_soon?.length || 0) + (upcomingMaintenance.overdue?.length || 0)

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div>
      {/* Critical Alerts Banner */}
      {totalAlerts > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #dc3545, #c82333)', 
          color: 'white', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div>
            <strong>Attention Required!</strong>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {complianceAlerts.expired?.length > 0 && `${complianceAlerts.expired.length} expired documents • `}
              {complianceAlerts.expiring_soon?.length > 0 && `${complianceAlerts.expiring_soon.length} expiring soon • `}
              {upcomingMaintenance.overdue?.length > 0 && `${upcomingMaintenance.overdue.length} overdue maintenance`}
            </div>
          </div>
        </div>
      )}

      {/* Fleet Overview */}
      <h3 style={{ marginBottom: '0.5rem', color: theme === 'dark' ? '#fff' : '#333' }}>🚛 Fleet Overview</h3>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #28a745' }}>
          <div className="number" style={{ color: '#28a745' }}>{truckStats.available}</div>
          <div className="label">Available</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #007bff' }}>
          <div className="number" style={{ color: '#007bff' }}>{truckStats.booked}</div>
          <div className="label">On Trip</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #ffc107' }}>
          <div className="number" style={{ color: '#ffc107' }}>{truckStats.maintenance}</div>
          <div className="label">In Maintenance</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #6c757d' }}>
          <div className="number">{totalFleet}</div>
          <div className="label">Total Fleet</div>
        </div>
      </div>

      {/* Financial Overview */}
      <h3 style={{ marginBottom: '0.5rem', color: theme === 'dark' ? '#fff' : '#333' }}>💰 Financial Overview</h3>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #28a745' }}>
          <div className="number" style={{ color: '#28a745', fontSize: '1.5rem' }}>
            {formatCurrency(invoiceStats?.total_paid || 0)}
          </div>
          <div className="label">Revenue Collected</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #ffc107' }}>
          <div className="number" style={{ color: '#ffc107', fontSize: '1.5rem' }}>
            {formatCurrency(invoiceStats?.total_outstanding || 0)}
          </div>
          <div className="label">Outstanding</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc3545' }}>
          <div className="number" style={{ color: '#dc3545', fontSize: '1.5rem' }}>
            {formatCurrency(fuelStats?.total_cost || 0)}
          </div>
          <div className="label">Fuel Expenses</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #6c757d' }}>
          <div className="number" style={{ color: '#6c757d', fontSize: '1.5rem' }}>
            {formatCurrency(maintenanceStats?.total_cost || 0)}
          </div>
          <div className="label">Maintenance Cost</div>
        </div>
      </div>

      {/* Operations & Compliance Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Job Cards Status */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>📋 Job Cards Status</h3>
          {jobCardStats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e9ecef', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000' }}>{jobCardStats.draft || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#aaa' : '#666' }}>Draft</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 243, 205, 0.1)' : '#fff3cd', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#856404' }}>{jobCardStats.pending_approval || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#daa520' : '#856404' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(204, 229, 255, 0.1)' : '#cce5ff', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#66b3ff' : '#004085' }}>{jobCardStats.approved || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#66b3ff' : '#004085' }}>Approved</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(209, 236, 241, 0.1)' : '#d1ecf1', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#5bc0de' : '#0c5460' }}>{jobCardStats.departed || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#5bc0de' : '#0c5460' }}>On Trip</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(212, 237, 218, 0.1)' : '#d4edda', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#5cb85c' : '#155724' }}>{jobCardStats.completed || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#5cb85c' : '#155724' }}>Completed</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000' }}>{jobCardStats.total || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#aaa' : '#666' }}>Total</div>
              </div>
            </div>
          ) : <p style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>No job card data</p>}
        </div>

        {/* Compliance Status */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🛡️ Compliance Status</h3>
          {complianceStats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(212, 237, 218, 0.1)' : '#d4edda', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#5cb85c' : '#155724' }}>{complianceStats.active || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#5cb85c' : '#155724' }}>Active</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 243, 205, 0.1)' : '#fff3cd', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#856404' }}>{complianceStats.expiring_soon || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#daa520' : '#856404' }}>Expiring Soon</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(248, 215, 218, 0.1)' : '#f8d7da', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#e74c3c' : '#721c24' }}>{complianceStats.expired || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#e74c3c' : '#721c24' }}>Expired</div>
              </div>
            </div>
          ) : <p style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>No compliance data</p>}
          {complianceStats?.mandatory_expired > 0 && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: theme === 'dark' ? 'rgba(248, 215, 218, 0.15)' : '#f8d7da', borderRadius: '4px', color: theme === 'dark' ? '#e74c3c' : '#721c24', fontSize: '0.85rem' }}>
              ⚠️ {complianceStats.mandatory_expired} mandatory document(s) expired!
            </div>
          )}
        </div>
      </div>

      {/* Maintenance & Fuel Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Maintenance Overview */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🔧 Maintenance</h3>
          {maintenanceStats ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 243, 205, 0.1)' : '#fff3cd', borderRadius: '6px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#856404' }}>{maintenanceStats.scheduled || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#daa520' : '#856404' }}>Scheduled</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(204, 229, 255, 0.1)' : '#cce5ff', borderRadius: '6px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#66b3ff' : '#004085' }}>{maintenanceStats.in_progress || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#66b3ff' : '#004085' }}>In Progress</div>
                </div>
              </div>
              {upcomingMaintenance.overdue?.length > 0 && (
                <div style={{ padding: '0.5rem', background: theme === 'dark' ? 'rgba(248, 215, 218, 0.15)' : '#f8d7da', borderRadius: '4px', color: theme === 'dark' ? '#e74c3c' : '#721c24', fontSize: '0.85rem' }}>
                  ⚠️ {upcomingMaintenance.overdue.length} overdue maintenance task(s)
                </div>
              )}
            </>
          ) : <p style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>No maintenance data</p>}
        </div>

        {/* Fuel Summary */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>⛽ Fuel Summary</h3>
          {fuelStats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e9ecef', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000' }}>{fuelStats.total_records || 0}</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#aaa' : '#666' }}>Refills</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e9ecef', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000' }}>{(fuelStats.total_liters || 0).toLocaleString()}L</div>
                <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#aaa' : '#666' }}>Total Liters</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 243, 205, 0.1)' : '#fff3cd', borderRadius: '6px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#856404' }}>
                  Avg: {formatCurrency(fuelStats.avg_cost_per_liter || 0)}/L
                </div>
              </div>
            </div>
          ) : <p style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>No fuel data</p>}
        </div>
      </div>

      {/* Invoice Status */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>📄 Invoice Status</h3>
        {invoiceStats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e9ecef', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000' }}>{invoiceStats.draft || 0}</div>
              <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#aaa' : '#666' }}>Draft</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(204, 229, 255, 0.1)' : '#cce5ff', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#66b3ff' : '#004085' }}>{invoiceStats.sent || 0}</div>
              <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#66b3ff' : '#004085' }}>Sent</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(212, 237, 218, 0.1)' : '#d4edda', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#5cb85c' : '#155724' }}>{invoiceStats.paid || 0}</div>
              <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#5cb85c' : '#155724' }}>Paid</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(248, 215, 218, 0.1)' : '#f8d7da', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#e74c3c' : '#721c24' }}>{invoiceStats.overdue || 0}</div>
              <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#e74c3c' : '#721c24' }}>Overdue</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000' }}>{invoiceStats.total || 0}</div>
              <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#aaa' : '#666' }}>Total</div>
            </div>
          </div>
        ) : <p style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>No invoice data</p>}
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>📅 Recent Bookings</h3>
        {recentBookings.length === 0 ? (
          <p style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>No bookings yet</p>
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
              {recentBookings.map(b => (
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
