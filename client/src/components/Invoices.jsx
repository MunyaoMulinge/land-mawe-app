import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function Invoices({ currentUser }) {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [trucks, setTrucks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('invoices')
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [filter, setFilter] = useState({ client_id: '', status: '' })
  
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_rate: 16,
    notes: '',
    terms: 'Payment due within 30 days',
    items: [{ description: '', quantity: 1, unit_price: '' }]
  })
  
  const [clientForm, setClientForm] = useState({
    name: '', contact_person: '', email: '', phone: '',
    address: '', city: '', company_type: 'company',
    tax_pin: '', payment_terms: 30, credit_limit: '', notes: ''
  })
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer', reference_number: '', notes: ''
  })

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.client_id) params.append('client_id', filter.client_id)
      if (filter.status) params.append('status', filter.status)

      const [invoicesRes, clientsRes, statsRes, trucksRes] = await Promise.all([
        fetch(`${API_BASE}/invoices?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/clients`),
        fetch(`${API_BASE}/invoices/stats`),
        fetch(`${API_BASE}/trucks`)
      ])

      setInvoices(await invoicesRes.json())
      setClients(await clientsRes.json())
      setStats(await statsRes.json())
      setTrucks(await trucksRes.json())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filter])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0)
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: '#e9ecef', color: '#495057' },
      sent: { bg: '#cce5ff', color: '#004085' },
      viewed: { bg: '#d1ecf1', color: '#0c5460' },
      partial: { bg: '#fff3cd', color: '#856404' },
      paid: { bg: '#d4edda', color: '#155724' },
      overdue: { bg: '#f8d7da', color: '#721c24' },
      cancelled: { bg: '#e2e3e5', color: '#383d41' }
    }
    const s = styles[status] || styles.draft
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{status.toUpperCase()}</span>
  }

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify(invoiceForm)
      })
      if (!res.ok) throw new Error('Failed to create invoice')
      resetInvoiceForm()
      setShowInvoiceForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCreateClient = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify(clientForm)
      })
      if (!res.ok) throw new Error('Failed to create client')
      resetClientForm()
      setShowClientForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/invoices/${showPaymentModal.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify(paymentForm)
      })
      if (!res.ok) throw new Error('Failed to record payment')
      setShowPaymentModal(null)
      setPaymentForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'bank_transfer', reference_number: '', notes: '' })
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const resetInvoiceForm = () => {
    setInvoiceForm({
      client_id: '', invoice_date: new Date().toISOString().split('T')[0],
      due_date: '', tax_rate: 16, notes: '', terms: 'Payment due within 30 days',
      items: [{ description: '', quantity: 1, unit_price: '' }]
    })
  }

  const resetClientForm = () => {
    setClientForm({
      name: '', contact_person: '', email: '', phone: '',
      address: '', city: '', company_type: 'company',
      tax_pin: '', payment_terms: 30, credit_limit: '', notes: ''
    })
  }

  const addInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: '', quantity: 1, unit_price: '' }]
    })
  }

  const removeInvoiceItem = (index) => {
    if (invoiceForm.items.length > 1) {
      setInvoiceForm({
        ...invoiceForm,
        items: invoiceForm.items.filter((_, i) => i !== index)
      })
    }
  }

  const updateInvoiceItem = (index, field, value) => {
    const newItems = [...invoiceForm.items]
    newItems[index][field] = value
    setInvoiceForm({ ...invoiceForm, items: newItems })
  }

  const calculateSubtotal = () => {
    return invoiceForm.items.reduce((sum, item) => 
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0)
  }

  const calculateTax = () => calculateSubtotal() * (parseFloat(invoiceForm.tax_rate) || 0) / 100
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  const viewInvoiceDetails = async (invoice) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}`)
      const data = await res.json()
      setSelectedInvoice(data)
    } catch (err) {
      console.error('Error fetching invoice details:', err)
    }
  }

  if (loading) return <div className="loading">Loading invoicing data...</div>

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card">
            <div className="number">{stats.total}</div>
            <div className="label">Total Invoices</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#28a745' }}>{formatCurrency(stats.total_paid)}</div>
            <div className="label">Total Received</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#ffc107' }}>{formatCurrency(stats.total_outstanding)}</div>
            <div className="label">Outstanding</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: stats.overdue > 0 ? '#dc3545' : '#28a745' }}>
              {stats.overdue}
            </div>
            <div className="label">Overdue</div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${activeView === 'invoices' ? 'btn-primary' : ''}`} onClick={() => setActiveView('invoices')}>
            📄 Invoices
          </button>
          <button className={`btn ${activeView === 'clients' ? 'btn-primary' : ''}`} onClick={() => setActiveView('clients')}>
            👥 Clients
          </button>
        </div>
      </div>

      {/* Invoices View */}
      {activeView === 'invoices' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>📄 Invoices</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select value={filter.client_id} onChange={e => setFilter({...filter, client_id: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px' }}>
                <option value="">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px' }}>
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>
              <button className="btn btn-primary" onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
                {showInvoiceForm ? 'Cancel' : '+ New Invoice'}
              </button>
            </div>
          </div>

          {showInvoiceForm && (
            <form onSubmit={handleCreateInvoice} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New Invoice</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Client *</label>
                  <select value={invoiceForm.client_id} onChange={e => setInvoiceForm({...invoiceForm, client_id: e.target.value})} required>
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Invoice Date *</label>
                  <input type="date" value={invoiceForm.invoice_date} onChange={e => setInvoiceForm({...invoiceForm, invoice_date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Due Date *</label>
                  <input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm({...invoiceForm, due_date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input type="number" value={invoiceForm.tax_rate} onChange={e => setInvoiceForm({...invoiceForm, tax_rate: e.target.value})} />
                </div>
              </div>

              <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Line Items</h4>
              {invoiceForm.items.map((item, index) => (
                <div key={index} className="form-row" style={{ alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 3 }}>
                    <label>Description *</label>
                    <input value={item.description} onChange={e => updateInvoiceItem(index, 'description', e.target.value)} placeholder="Service description" required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Qty</label>
                    <input type="number" value={item.quantity} onChange={e => updateInvoiceItem(index, 'quantity', e.target.value)} min="1" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Unit Price</label>
                    <input type="number" value={item.unit_price} onChange={e => updateInvoiceItem(index, 'unit_price', e.target.value)} placeholder="0.00" required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Amount</label>
                    <input value={formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))} disabled />
                  </div>
                  <button type="button" className="btn btn-small" onClick={() => removeInvoiceItem(index)} style={{ marginBottom: '1rem' }}>🗑️</button>
                </div>
              ))}
              <button type="button" className="btn btn-small" onClick={addInvoiceItem} style={{ marginBottom: '1rem' }}>+ Add Item</button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div>Subtotal: <strong>{formatCurrency(calculateSubtotal())}</strong></div>
                  <div>Tax ({invoiceForm.tax_rate}%): <strong>{formatCurrency(calculateTax())}</strong></div>
                  <div style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Total: <strong>{formatCurrency(calculateTotal())}</strong></div>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Notes</label>
                  <input value={invoiceForm.notes} onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})} placeholder="Additional notes..." />
                </div>
                <div className="form-group">
                  <label>Terms</label>
                  <input value={invoiceForm.terms} onChange={e => setInvoiceForm({...invoiceForm, terms: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-success">💾 Create Invoice</button>
            </form>
          )}

          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ background: inv.status === 'overdue' ? '#fff5f5' : inv.status === 'paid' ? '#f0fff4' : 'white' }}>
                  <td><strong>{inv.invoice_number}</strong></td>
                  <td>{inv.client_name || '-'}</td>
                  <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td><strong>{formatCurrency(inv.total_amount)}</strong></td>
                  <td style={{ color: '#28a745' }}>{formatCurrency(inv.amount_paid)}</td>
                  <td style={{ color: parseFloat(inv.balance_due) > 0 ? '#dc3545' : '#28a745' }}>{formatCurrency(inv.balance_due)}</td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-small" onClick={() => viewInvoiceDetails(inv)} title="View">👁️</button>
                      {inv.status === 'draft' && (
                        <button className="btn btn-small btn-primary" onClick={() => handleStatusChange(inv.id, 'sent')} title="Send">📤</button>
                      )}
                      {['sent', 'partial', 'overdue'].includes(inv.status) && (
                        <button className="btn btn-small btn-success" onClick={() => { setShowPaymentModal(inv); setPaymentForm({...paymentForm, amount: inv.balance_due}) }} title="Record Payment">💰</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No invoices found. Create your first invoice!</p>}
        </div>
      )}

      {/* Clients View */}
      {activeView === 'clients' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>👥 Clients</h2>
            <button className="btn btn-primary" onClick={() => setShowClientForm(!showClientForm)}>
              {showClientForm ? 'Cancel' : '+ New Client'}
            </button>
          </div>

          {showClientForm && (
            <form onSubmit={handleCreateClient} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Add New Client</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Company/Client Name *</label>
                  <input value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input value={clientForm.contact_person} onChange={e => setClientForm({...clientForm, contact_person: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Company Type</label>
                  <select value={clientForm.company_type} onChange={e => setClientForm({...clientForm, company_type: e.target.value})}>
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                    <option value="government">Government</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>KRA PIN</label>
                  <input value={clientForm.tax_pin} onChange={e => setClientForm({...clientForm, tax_pin: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <input value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input value={clientForm.city} onChange={e => setClientForm({...clientForm, city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Payment Terms (days)</label>
                  <input type="number" value={clientForm.payment_terms} onChange={e => setClientForm({...clientForm, payment_terms: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-success">💾 Save Client</button>
            </form>
          )}

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Payment Terms</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id}>
                  <td><strong>{client.name}</strong></td>
                  <td>{client.contact_person || '-'}</td>
                  <td>{client.email || '-'}</td>
                  <td>{client.phone || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{client.company_type || '-'}</td>
                  <td>{client.payment_terms} days</td>
                  <td>
                    {client.is_active ? (
                      <span className="badge" style={{ background: '#d4edda', color: '#155724' }}>Active</span>
                    ) : (
                      <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No clients found. Add your first client!</p>}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '1rem' }}>💰 Record Payment</h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Invoice: <strong>{showPaymentModal.invoice_number}</strong><br />
              Balance Due: <strong style={{ color: '#dc3545' }}>{formatCurrency(showPaymentModal.balance_due)}</strong>
            </p>
            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label>Amount *</label>
                <input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Payment Date *</label>
                <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input value={paymentForm.reference_number} onChange={e => setPaymentForm({...paymentForm, reference_number: e.target.value})} placeholder="e.g. Transaction ID" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowPaymentModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">✅ Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>📄 Invoice {selectedInvoice.invoice_number}</h3>
              {getStatusBadge(selectedInvoice.status)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <strong>Client:</strong><br />
                {selectedInvoice.clients?.name}<br />
                {selectedInvoice.clients?.email}<br />
                {selectedInvoice.clients?.phone}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Invoice Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}<br />
                <strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}
              </div>
            </div>

            <table style={{ marginBottom: '1rem' }}>
              <thead>
                <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {selectedInvoice.invoice_items?.map((item, i) => (
                  <tr key={i}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <div>Subtotal: {formatCurrency(selectedInvoice.subtotal)}</div>
              <div>Tax ({selectedInvoice.tax_rate}%): {formatCurrency(selectedInvoice.tax_amount)}</div>
              <div style={{ fontSize: '1.2rem' }}><strong>Total: {formatCurrency(selectedInvoice.total_amount)}</strong></div>
              <div style={{ color: '#28a745' }}>Paid: {formatCurrency(selectedInvoice.amount_paid)}</div>
              <div style={{ color: '#dc3545' }}><strong>Balance: {formatCurrency(selectedInvoice.balance_due)}</strong></div>
            </div>

            {selectedInvoice.payments?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Payment History:</strong>
                <table>
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
                  <tbody>
                    {selectedInvoice.payments.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td>{formatCurrency(p.amount)}</td>
                        <td>{p.payment_method}</td>
                        <td>{p.reference_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
