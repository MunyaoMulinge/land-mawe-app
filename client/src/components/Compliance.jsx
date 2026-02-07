import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function Compliance({ currentUser }) {
  const [documents, setDocuments] = useState([])
  const [documentTypes, setDocumentTypes] = useState([])
  const [trucks, setTrucks] = useState([])
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState({ expired: [], expiring_soon: [] })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState('dashboard')
  const [filter, setFilter] = useState({ truck_id: '', category: '', status: '' })
  const [renewingDoc, setRenewingDoc] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [form, setForm] = useState({
    truck_id: '',
    document_type_id: '',
    document_number: '',
    provider: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    cost: '',
    coverage_amount: '',
    coverage_type: '',
    notes: '',
    document_file: null
  })

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.truck_id) params.append('truck_id', filter.truck_id)
      if (filter.category) params.append('category', filter.category)
      if (filter.status) params.append('status', filter.status)

      const [docsRes, typesRes, statsRes, alertsRes, trucksRes] = await Promise.all([
        fetch(`${API_BASE}/truck-documents?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/document-types`),
        fetch(`${API_BASE}/compliance/stats`),
        fetch(`${API_BASE}/compliance/alerts`),
        fetch(`${API_BASE}/trucks`)
      ])

      setDocuments(await docsRes.json())
      setDocumentTypes(await typesRes.json())
      setStats(await statsRes.json())
      setAlerts(await alertsRes.json())
      setTrucks(await trucksRes.json())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate: Must have at least a file upload
    if (!form.document_file) {
      alert('Please select a document to upload');
      return;
    }
    
    setUploadingFile(true)
    try {
      let documentUrl = null
      let documentFilename = null
      let documentSize = null

      // Handle file upload if present
      if (form.document_file) {
        const formData = new FormData()
        formData.append('file', form.document_file)
        formData.append('truck_id', form.truck_id)
        formData.append('document_type', 'compliance')

        const uploadRes = await fetch(`${API_BASE}/upload-document`, {
          method: 'POST',
          headers: { 'x-user-id': currentUser?.id },
          body: formData
        })

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json()
          throw new Error(errorData.details || errorData.error || 'Failed to upload document')
        }
        
        const uploadData = await uploadRes.json()
        documentUrl = uploadData.url
        documentFilename = uploadData.filename
        documentSize = uploadData.size
      }

      const res = await fetch(`${API_BASE}/truck-documents`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({
          truck_id: form.truck_id || null,
          document_type_id: form.document_type_id || null,
          document_number: form.document_number || null,
          provider: form.provider || null,
          issue_date: form.issue_date || null,
          expiry_date: form.expiry_date || null,
          cost: form.cost ? parseFloat(form.cost) : null,
          coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
          coverage_type: form.coverage_type || null,
          notes: form.notes || null,
          document_url: documentUrl,
          document_filename: documentFilename,
          document_size: documentSize
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Document creation error:', errorData)
        throw new Error(errorData.error || 'Failed to create document')
      }
      
      resetForm()
      setShowForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleRenew = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/truck-documents/${renewingDoc.id}/renew`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({
          expiry_date: form.expiry_date,
          cost: form.cost,
          document_number: form.document_number,
          notes: form.notes
        })
      })
      if (!res.ok) throw new Error('Failed to renew document')
      
      setRenewingDoc(null)
      resetForm()
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const resetForm = () => {
    setForm({
      truck_id: '',
      document_type_id: '',
      document_number: '',
      provider: '',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      cost: '',
      coverage_amount: '',
      coverage_type: '',
      notes: '',
      document_file: null
    })
  }

  const startRenewal = (doc) => {
    setRenewingDoc(doc)
    setForm({
      ...form,
      document_number: doc.document_number,
      expiry_date: '',
      cost: doc.cost || '',
      notes: ''
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0)
  }

  const getStatusBadge = (doc) => {
    const days = doc.days_until_expiry
    if (days < 0) {
      return <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>EXPIRED</span>
    } else if (days <= 30) {
      return <span className="badge" style={{ background: '#fff3cd', color: '#856404' }}>EXPIRING SOON</span>
    } else {
      return <span className="badge" style={{ background: '#d4edda', color: '#155724' }}>ACTIVE</span>
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      insurance: '🛡️',
      license: '📜',
      inspection: '🔍',
      permit: '📋',
      other: '📄'
    }
    return icons[category] || '📄'
  }

  if (loading) return <div className="loading">Loading compliance data...</div>

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="stat-card">
            <div className="number">{stats.total}</div>
            <div className="label">Total Documents</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#28a745' }}>{stats.active}</div>
            <div className="label">Active</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#ffc107' }}>{stats.expiring_soon}</div>
            <div className="label">Expiring Soon</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#dc3545' }}>{stats.expired}</div>
            <div className="label">Expired</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: stats.mandatory_expired > 0 ? '#dc3545' : '#28a745' }}>
              {stats.mandatory_expired > 0 ? '⚠️' : '✅'}
            </div>
            <div className="label">{stats.mandatory_expired > 0 ? `${stats.mandatory_expired} Critical` : 'All Clear'}</div>
          </div>
        </div>
      )}

      {/* Critical Alerts */}
      {alerts.expired?.length > 0 && (
        <div className="card" style={{ background: '#f8d7da', borderLeft: '4px solid #dc3545', marginBottom: '1rem' }}>
          <h3 style={{ color: '#721c24', marginBottom: '0.5rem' }}>🚨 Expired Documents</h3>
          <p style={{ color: '#721c24' }}>
            {alerts.expired.length} document(s) have expired and need immediate attention!
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            {alerts.expired.slice(0, 3).map(doc => (
              <span key={doc.id} style={{ 
                display: 'inline-block', 
                background: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '4px',
                marginRight: '0.5rem',
                marginBottom: '0.25rem',
                fontSize: '0.85rem'
              }}>
                {doc.truck_plate} - {doc.document_type_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeView === 'dashboard' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`btn ${activeView === 'documents' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('documents')}
          >
            📄 All Documents
          </button>
          <button 
            className={`btn ${activeView === 'expiring' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('expiring')}
            style={alerts.expiring_soon?.length > 0 ? { background: '#ffc107', color: '#000' } : {}}
          >
            ⏰ Expiring ({alerts.expiring_soon?.length || 0})
          </button>
          <button 
            className={`btn ${activeView === 'expired' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('expired')}
            style={alerts.expired?.length > 0 ? { background: '#dc3545', color: 'white' } : {}}
          >
            🚨 Expired ({alerts.expired?.length || 0})
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>📊 Compliance Overview by Truck</h2>
          <table>
            <thead>
              <tr>
                <th>Truck</th>
                <th>Insurance</th>
                <th>Road License</th>
                <th>Inspection</th>
                <th>NTSA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map(truck => {
                const truckDocs = documents.filter(d => d.truck_id === truck.id)
                const getDocStatus = (category) => {
                  const doc = truckDocs.find(d => d.category === category)
                  if (!doc) return { status: 'missing', icon: '❌' }
                  if (doc.days_until_expiry < 0) return { status: 'expired', icon: '🔴' }
                  if (doc.days_until_expiry <= 30) return { status: 'expiring', icon: '🟡' }
                  return { status: 'active', icon: '🟢' }
                }
                
                const insurance = getDocStatus('insurance')
                const license = getDocStatus('license')
                const inspection = getDocStatus('inspection')
                
                const hasIssues = [insurance, license, inspection].some(s => s.status !== 'active')
                
                return (
                  <tr key={truck.id}>
                    <td><strong>{truck.plate_number}</strong></td>
                    <td style={{ textAlign: 'center' }}>{insurance.icon}</td>
                    <td style={{ textAlign: 'center' }}>{license.icon}</td>
                    <td style={{ textAlign: 'center' }}>{inspection.icon}</td>
                    <td style={{ textAlign: 'center' }}>{getDocStatus('license').icon}</td>
                    <td>
                      {hasIssues ? (
                        <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>Needs Attention</span>
                      ) : (
                        <span className="badge" style={{ background: '#d4edda', color: '#155724' }}>Compliant</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
            🟢 Active | 🟡 Expiring Soon | 🔴 Expired | ❌ Missing
          </div>
        </div>
      )}

      {/* Documents View */}
      {activeView === 'documents' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>📄 All Documents</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select 
                value={filter.truck_id}
                onChange={e => setFilter({...filter, truck_id: e.target.value})}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                <option value="">All Trucks</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>{t.plate_number}</option>
                ))}
              </select>
              <select 
                value={filter.category}
                onChange={e => setFilter({...filter, category: e.target.value})}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                <option value="">All Categories</option>
                <option value="insurance">Insurance</option>
                <option value="license">License</option>
                <option value="inspection">Inspection</option>
              </select>
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : '+ Add Document'}
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Add New Document</h3>
              
              {/* Quick Upload Section - Highlighted */}
              <div style={{ 
                background: '#e3f2fd', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                border: '2px dashed #2196f3'
              }}>
                <h4 style={{ marginBottom: '0.5rem', color: '#1976d2' }}>📎 Quick Upload</h4>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.75rem' }}>
                  Upload your document here. You can fill in the details below or just upload the file.
                </p>
                <input 
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setForm({...form, document_file: e.target.files[0]})}
                  style={{ 
                    padding: '0.75rem', 
                    border: '2px solid #2196f3', 
                    borderRadius: '4px', 
                    width: '100%',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                />
                {form.document_file && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    background: 'white', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {form.document_file.name.endsWith('.pdf') ? '📄' : '🖼️'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#1976d2' }}>{form.document_file.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        {(form.document_file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setForm({...form, document_file: null})}
                      style={{ 
                        background: '#f44336', 
                        color: 'white', 
                        border: 'none', 
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Optional Details Section */}
              <details open>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  background: '#f0f0f0',
                  borderRadius: '4px'
                }}>
                  📋 Document Details (Optional)
                </summary>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Truck</label>
                    <select 
                      value={form.truck_id}
                      onChange={e => setForm({...form, truck_id: e.target.value})}
                    >
                      <option value="">Select Truck (Optional)</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id}>{t.plate_number} - {t.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Document Type</label>
                    <select 
                      value={form.document_type_id}
                      onChange={e => setForm({...form, document_type_id: e.target.value})}
                    >
                      <option value="">Select Type (Optional)</option>
                      {documentTypes.map(t => (
                        <option key={t.id} value={t.id}>{getCategoryIcon(t.category)} {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input 
                      type="date"
                      value={form.expiry_date}
                      onChange={e => setForm({...form, expiry_date: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Document Number</label>
                    <input 
                      value={form.document_number}
                      onChange={e => setForm({...form, document_number: e.target.value})}
                      placeholder="e.g. POL-12345"
                    />
                  </div>
                  <div className="form-group">
                    <label>Provider/Issuer</label>
                    <input 
                      value={form.provider}
                      onChange={e => setForm({...form, provider: e.target.value})}
                      placeholder="e.g. Jubilee Insurance"
                    />
                  </div>
                  <div className="form-group">
                    <label>Issue Date</label>
                    <input 
                      type="date"
                      value={form.issue_date}
                      onChange={e => setForm({...form, issue_date: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Cost (KES)</label>
                    <input 
                      type="number"
                      value={form.cost}
                      onChange={e => setForm({...form, cost: e.target.value})}
                      placeholder="e.g. 50000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Coverage Amount (for insurance)</label>
                    <input 
                      type="number"
                      value={form.coverage_amount}
                      onChange={e => setForm({...form, coverage_amount: e.target.value})}
                      placeholder="e.g. 5000000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Coverage Type</label>
                    <select 
                      value={form.coverage_type}
                      onChange={e => setForm({...form, coverage_type: e.target.value})}
                    >
                      <option value="">Select</option>
                      <option value="comprehensive">Comprehensive</option>
                      <option value="third_party">Third Party</option>
                      <option value="third_party_fire_theft">Third Party Fire & Theft</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <input 
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    placeholder="Additional notes..."
                  />
                </div>
              </details>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  disabled={uploadingFile || !form.document_file}
                  style={{ opacity: !form.document_file ? 0.5 : 1 }}
                >
                  {uploadingFile ? '⏳ Uploading...' : '💾 Save Document'}
                </button>
                <button type="button" className="btn" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
                {!form.document_file && (
                  <span style={{ color: '#f44336', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                    ⚠️ Please select a file to upload
                  </span>
                )}
              </div>
            </form>
          )}

          <table>
            <thead>
              <tr>
                <th>Truck</th>
                <th>Document</th>
                <th>Provider</th>
                <th>Expiry</th>
                <th>Days Left</th>
                <th>Status</th>
                <th>File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} style={{ background: doc.days_until_expiry < 0 ? '#fff5f5' : doc.days_until_expiry <= 30 ? '#fffbeb' : 'white' }}>
                  <td><strong>{doc.truck_plate}</strong></td>
                  <td>{getCategoryIcon(doc.category)} {doc.document_type_name}</td>
                  <td>{doc.provider || '-'}</td>
                  <td>{new Date(doc.expiry_date).toLocaleDateString()}</td>
                  <td>
                    <strong style={{ color: doc.days_until_expiry < 0 ? '#dc3545' : doc.days_until_expiry <= 30 ? '#ffc107' : '#28a745' }}>
                      {doc.days_until_expiry < 0 ? `${Math.abs(doc.days_until_expiry)} overdue` : `${doc.days_until_expiry} days`}
                    </strong>
                  </td>
                  <td>{getStatusBadge(doc)}</td>
                  <td>
                    {doc.document_url ? (
                      <a 
                        href={doc.document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-small"
                        title="View document"
                      >
                        📄 View
                      </a>
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.85rem' }}>No file</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="btn btn-small btn-primary"
                      onClick={() => startRenewal(doc)}
                      title="Renew"
                    >
                      🔄
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expiring Soon View */}
      {activeView === 'expiring' && (
        <div className="card" style={{ borderLeft: '4px solid #ffc107' }}>
          <h2 style={{ marginBottom: '1rem', color: '#856404' }}>⏰ Expiring Within 30 Days</h2>
          {alerts.expiring_soon?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Truck</th>
                  <th>Document</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.expiring_soon.map(doc => (
                  <tr key={doc.id}>
                    <td><strong>{doc.truck_plate}</strong></td>
                    <td>{getCategoryIcon(doc.category)} {doc.document_type_name}</td>
                    <td>{new Date(doc.expiry_date).toLocaleDateString()}</td>
                    <td><strong style={{ color: '#ffc107' }}>{doc.days_until_expiry} days</strong></td>
                    <td>
                      <button 
                        className="btn btn-small btn-success"
                        onClick={() => startRenewal(doc)}
                      >
                        🔄 Renew
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#28a745' }}>
              ✅ No documents expiring soon. Great job!
            </p>
          )}
        </div>
      )}

      {/* Expired View */}
      {activeView === 'expired' && (
        <div className="card" style={{ borderLeft: '4px solid #dc3545' }}>
          <h2 style={{ marginBottom: '1rem', color: '#dc3545' }}>🚨 Expired Documents</h2>
          {alerts.expired?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Truck</th>
                  <th>Document</th>
                  <th>Expired On</th>
                  <th>Days Overdue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.expired.map(doc => (
                  <tr key={doc.id} style={{ background: '#fff5f5' }}>
                    <td><strong>{doc.truck_plate}</strong></td>
                    <td>
                      {getCategoryIcon(doc.category)} {doc.document_type_name}
                      {doc.is_mandatory && <span style={{ color: '#dc3545', marginLeft: '0.5rem' }}>⚠️ Mandatory</span>}
                    </td>
                    <td>{new Date(doc.expiry_date).toLocaleDateString()}</td>
                    <td><strong style={{ color: '#dc3545' }}>{Math.abs(doc.days_until_expiry)} days</strong></td>
                    <td>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => startRenewal(doc)}
                      >
                        🔄 Renew Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#28a745' }}>
              ✅ No expired documents. All clear!
            </p>
          )}
        </div>
      )}

      {/* Renewal Modal */}
      {renewingDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>🔄 Renew Document</h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Renewing: <strong>{renewingDoc.document_type_name}</strong> for <strong>{renewingDoc.truck_plate}</strong>
            </p>
            <form onSubmit={handleRenew}>
              <div className="form-group">
                <label>New Document Number</label>
                <input 
                  value={form.document_number}
                  onChange={e => setForm({...form, document_number: e.target.value})}
                  placeholder="Leave blank to keep same"
                />
              </div>
              <div className="form-group">
                <label>New Expiry Date *</label>
                <input 
                  type="date"
                  value={form.expiry_date}
                  onChange={e => setForm({...form, expiry_date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Renewal Cost (KES)</label>
                <input 
                  type="number"
                  value={form.cost}
                  onChange={e => setForm({...form, cost: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input 
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Any notes..."
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setRenewingDoc(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">✅ Confirm Renewal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
