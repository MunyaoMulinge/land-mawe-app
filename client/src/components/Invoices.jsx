import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { Formik, Form } from 'formik'
import { API_BASE } from '../config'
import AnimatedModal from './AnimatedModal'
import FormikField from './FormikField'
import { invoiceSchema, clientSchema, paymentSchema, quotationSchema } from '../validations/schemas'

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
  const [quotations, setQuotations] = useState([])
  const [showQuotationForm, setShowQuotationForm] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState(null)
  const [selectedQuotation, setSelectedQuotation] = useState(null)
  const [quotationStats, setQuotationStats] = useState(null)
  
  const invoiceInitialValues = {
    client_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_rate: 16,
    notes: '',
    terms: 'Payment due within 30 days',
    items: [{ description: '', quantity: 1, unit_price: '' }]
  }
  
  const clientInitialValues = {
    name: '', contact_person: '', email: '', phone: '',
    address: '', city: '', company_type: 'company',
    tax_pin: '', payment_terms: 30, credit_limit: '', notes: ''
  }
  
  const paymentInitialValues = {
    amount: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer', reference_number: '', notes: ''
  }

  const quotationInitialValues = {
    client_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })(),
    tax_rate: 16,
    notes: '',
    terms: 'This quotation is valid for 30 days from the date of issue.',
    items: [{ description: '', quantity: 1, unit_price: '' }]
  }

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.client_id) params.append('client_id', filter.client_id)
      if (filter.status) params.append('status', filter.status)

      const [invoicesRes, clientsRes, statsRes, trucksRes, quotationsRes, quoteStatsRes] = await Promise.all([
        fetch(`${API_BASE}/invoices?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/clients`),
        fetch(`${API_BASE}/invoices/stats`),
        fetch(`${API_BASE}/trucks`),
        fetch(`${API_BASE}/quotations?${params}`, { headers: { 'x-user-id': currentUser?.id } }),
        fetch(`${API_BASE}/quotations/stats`)
      ])

      setInvoices(await invoicesRes.json())
      setClients(await clientsRes.json())
      setStats(await statsRes.json())
      setTrucks(await trucksRes.json())
      setQuotations(await quotationsRes.json())
      setQuotationStats(await quoteStatsRes.json())
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
      draft: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
      sent: { bg: 'var(--accent-primary)', color: '#fff' },
      viewed: { bg: 'var(--accent-primary)', color: '#fff' },
      partial: { bg: 'var(--accent-warning)', color: '#fff' },
      paid: { bg: 'var(--accent-success)', color: '#fff' },
      overdue: { bg: 'var(--accent-danger)', color: '#fff' },
      cancelled: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
    }
    const s = styles[status] || styles.draft
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{status.toUpperCase()}</span>
  }

  const handleCreateInvoice = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify(values)
      })
      if (!res.ok) throw new Error('Failed to create invoice')
      resetForm()
      setShowInvoiceForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateClient = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify(values)
      })
      if (!res.ok) throw new Error('Failed to create client')
      resetForm()
      setShowClientForm(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecordPayment = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${showPaymentModal.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify(values)
      })
      if (!res.ok) throw new Error('Failed to record payment')
      resetForm()
      setShowPaymentModal(null)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
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

  const viewInvoiceDetails = async (invoice) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}`)
      const data = await res.json()
      setSelectedInvoice(data)
    } catch (err) {
      console.error('Error fetching invoice details:', err)
    }
  }

  // ---- Quotation handlers ----
  const handleCreateQuotation = async (values, { setSubmitting, resetForm }) => {
    try {
      const url = editingQuotation 
        ? `${API_BASE}/quotations/${editingQuotation.id}` 
        : `${API_BASE}/quotations`
      const method = editingQuotation ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify(values)
      })
      if (!res.ok) throw new Error('Failed to save quotation')
      resetForm()
      setShowQuotationForm(false)
      setEditingQuotation(null)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuotationStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      setSelectedQuotation(null)
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleConvertToInvoice = async (id) => {
    if (!confirm('Convert this quotation to an invoice? This cannot be undone.')) return
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to convert')
      }
      setSelectedQuotation(null)
      setActiveView('invoices')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteQuotation = async (id) => {
    if (!confirm('Delete this draft quotation?')) return
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const viewQuotationDetails = async (quotation) => {
    try {
      const res = await fetch(`${API_BASE}/quotations/${quotation.id}`)
      const data = await res.json()
      setSelectedQuotation(data)
    } catch (err) {
      console.error('Error fetching quotation details:', err)
    }
  }

  const startEditQuotation = async (quotation) => {
    try {
      const res = await fetch(`${API_BASE}/quotations/${quotation.id}`)
      const data = await res.json()
      setEditingQuotation(data)
      setShowQuotationForm(true)
    } catch (err) {
      alert('Error loading quotation: ' + err.message)
    }
  }

  const getEditQuotationValues = () => {
    if (!editingQuotation) return quotationInitialValues
    return {
      client_id: editingQuotation.client_id || '',
      quotation_date: editingQuotation.quotation_date?.slice(0, 10) || new Date().toISOString().split('T')[0],
      valid_until: editingQuotation.valid_until?.slice(0, 10) || '',
      tax_rate: editingQuotation.tax_rate || 16,
      notes: editingQuotation.notes || '',
      terms: editingQuotation.terms || '',
      items: editingQuotation.quotation_items?.length > 0
        ? editingQuotation.quotation_items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        : [{ description: '', quantity: 1, unit_price: '' }]
    }
  }

  const getQuotationStatusBadge = (status) => {
    const styles = {
      draft: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
      sent: { bg: 'var(--accent-primary)', color: '#fff' },
      accepted: { bg: 'var(--accent-success)', color: '#fff' },
      rejected: { bg: 'var(--accent-danger)', color: '#fff' },
      expired: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
      converted: { bg: 'var(--accent-primary)', color: '#fff' }
    }
    const s = styles[status] || styles.draft
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{status.toUpperCase()}</span>
  }

  const generateQuotationPDF = async (quotation) => {
    try {
      let q = quotation
      if (!quotation.quotation_items) {
        const res = await fetch(`${API_BASE}/quotations/${quotation.id}`)
        q = await res.json()
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      doc.setFontSize(24)
      doc.setTextColor(44, 62, 80)
      doc.text('QUOTATION', 20, 25)
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text('Land Mawe Fleet Services', pageWidth - 20, 20, { align: 'right' })
      doc.text('Nairobi, Kenya', pageWidth - 20, 26, { align: 'right' })
      
      doc.setFontSize(11)
      doc.setTextColor(44, 62, 80)
      doc.text(`Quotation #: ${q.quotation_number}`, 20, 45)
      doc.text(`Date: ${new Date(q.quotation_date).toLocaleDateString()}`, 20, 52)
      doc.text(`Valid Until: ${new Date(q.valid_until).toLocaleDateString()}`, 20, 59)
      
      const statusColors = { draft: [108,117,125], sent: [0,123,255], accepted: [40,167,69], rejected: [220,53,69], converted: [0,123,255] }
      const statusColor = statusColors[q.status] || [108,117,125]
      doc.setFillColor(...statusColor)
      doc.roundedRect(pageWidth - 55, 40, 35, 8, 2, 2, 'F')
      doc.setTextColor(255)
      doc.setFontSize(8)
      doc.text(q.status.toUpperCase(), pageWidth - 37.5, 45.5, { align: 'center' })
      
      doc.setFontSize(11)
      doc.setTextColor(44, 62, 80)
      doc.text('To:', 20, 75)
      doc.setFontSize(10)
      doc.setTextColor(60)
      doc.text(q.clients?.name || 'N/A', 20, 82)
      if (q.clients?.tax_pin) doc.text(`KRA PIN: ${q.clients.tax_pin}`, 20, 88)
      if (q.clients?.address) doc.text(q.clients.address, 20, 94)
      if (q.clients?.city) doc.text(q.clients.city, 20, 100)
      if (q.clients?.email) doc.text(q.clients.email, 20, 106)
      if (q.clients?.phone) doc.text(q.clients.phone, 20, 112)
      
      let y = 126
      doc.setFillColor(44, 62, 80)
      doc.rect(20, y, pageWidth - 40, 10, 'F')
      doc.setTextColor(255)
      doc.setFontSize(9)
      doc.text('Description', 25, y + 7)
      doc.text('Qty', 120, y + 7)
      doc.text('Unit Price', 140, y + 7)
      doc.text('Amount', 170, y + 7)
      
      y += 15
      doc.setTextColor(60)
      q.quotation_items?.forEach((item) => {
        doc.text(item.description?.substring(0, 40) || '', 25, y)
        doc.text(String(item.quantity), 120, y)
        doc.text(formatCurrency(item.unit_price).replace('KES', '').trim(), 140, y)
        doc.text(formatCurrency(item.amount).replace('KES', '').trim(), 170, y)
        y += 8
      })
      
      y += 10
      doc.setDrawColor(200)
      doc.line(130, y, pageWidth - 20, y)
      y += 8
      doc.setFontSize(10)
      doc.text('Subtotal:', 130, y)
      doc.text(formatCurrency(q.subtotal), 170, y)
      y += 7
      doc.text(`Tax (${q.tax_rate}%):`, 130, y)
      doc.text(formatCurrency(q.tax_amount), 170, y)
      y += 10
      doc.setFontSize(12)
      doc.setTextColor(44, 62, 80)
      doc.text('Total:', 130, y)
      doc.text(formatCurrency(q.total_amount), 170, y)
      
      if (q.terms || q.notes) {
        y += 20
        doc.setFontSize(9)
        doc.setTextColor(100)
        if (q.terms) doc.text(`Terms: ${q.terms}`, 20, y)
        if (q.notes) doc.text(`Notes: ${q.notes}`, 20, y + 6)
      }
      
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text('Thank you for considering our services!', pageWidth / 2, 280, { align: 'center' })
      
      doc.save(`${q.quotation_number}.pdf`)
    } catch (err) {
      console.error('Error generating quotation PDF:', err)
      alert('Failed to generate PDF')
    }
  }

  const generatePDF = async (invoice) => {
    try {
      // Fetch full invoice details if needed
      let inv = invoice
      if (!invoice.invoice_items) {
        const res = await fetch(`${API_BASE}/invoices/${invoice.id}`)
        inv = await res.json()
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Header
      doc.setFontSize(24)
      doc.setTextColor(44, 62, 80)
      doc.text('INVOICE', 20, 25)
      
      // Company Info (right side)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text('Land Mawe Fleet Services', pageWidth - 20, 20, { align: 'right' })
      doc.text('Nairobi, Kenya', pageWidth - 20, 26, { align: 'right' })
      
      // Invoice details
      doc.setFontSize(11)
      doc.setTextColor(44, 62, 80)
      doc.text(`Invoice #: ${inv.invoice_number}`, 20, 45)
      doc.text(`Date: ${new Date(inv.invoice_date).toLocaleDateString()}`, 20, 52)
      doc.text(`Due Date: ${new Date(inv.due_date).toLocaleDateString()}`, 20, 59)
      
      // Status badge
      const statusColors = { draft: [108,117,125], sent: [0,123,255], paid: [40,167,69], overdue: [220,53,69], partial: [255,193,7] }
      const statusColor = statusColors[inv.status] || [108,117,125]
      doc.setFillColor(...statusColor)
      doc.roundedRect(pageWidth - 50, 40, 30, 8, 2, 2, 'F')
      doc.setTextColor(255)
      doc.setFontSize(8)
      doc.text(inv.status.toUpperCase(), pageWidth - 35, 45.5, { align: 'center' })
      
      // Bill To
      doc.setFontSize(11)
      doc.setTextColor(44, 62, 80)
      doc.text('Bill To:', 20, 75)
      doc.setFontSize(10)
      doc.setTextColor(60)
      doc.text(inv.clients?.name || 'N/A', 20, 82)
      if (inv.clients?.tax_pin) doc.text(`KRA PIN: ${inv.clients.tax_pin}`, 20, 88)
      if (inv.clients?.address) doc.text(inv.clients.address, 20, 94)
      if (inv.clients?.city) doc.text(inv.clients.city, 20, 100)
      if (inv.clients?.email) doc.text(inv.clients.email, 20, 106)
      if (inv.clients?.phone) doc.text(inv.clients.phone, 20, 112)
      
      // Table header
      let y = 126
      doc.setFillColor(44, 62, 80)
      doc.rect(20, y, pageWidth - 40, 10, 'F')
      doc.setTextColor(255)
      doc.setFontSize(9)
      doc.text('Description', 25, y + 7)
      doc.text('Qty', 120, y + 7)
      doc.text('Unit Price', 140, y + 7)
      doc.text('Amount', 170, y + 7)
      
      // Table rows
      y += 15
      doc.setTextColor(60)
      inv.invoice_items?.forEach((item) => {
        doc.text(item.description?.substring(0, 40) || '', 25, y)
        doc.text(String(item.quantity), 120, y)
        doc.text(formatCurrency(item.unit_price).replace('KES', '').trim(), 140, y)
        doc.text(formatCurrency(item.amount).replace('KES', '').trim(), 170, y)
        y += 8
      })
      
      // Totals
      y += 10
      doc.setDrawColor(200)
      doc.line(130, y, pageWidth - 20, y)
      y += 8
      doc.setFontSize(10)
      doc.text('Subtotal:', 130, y)
      doc.text(formatCurrency(inv.subtotal), 170, y)
      y += 7
      doc.text(`Tax (${inv.tax_rate}%):`, 130, y)
      doc.text(formatCurrency(inv.tax_amount), 170, y)
      y += 10
      doc.setFontSize(12)
      doc.setTextColor(44, 62, 80)
      doc.text('Total:', 130, y)
      doc.text(formatCurrency(inv.total_amount), 170, y)
      
      if (parseFloat(inv.amount_paid) > 0) {
        y += 8
        doc.setFontSize(10)
        doc.setTextColor(40, 167, 69)
        doc.text('Paid:', 130, y)
        doc.text(formatCurrency(inv.amount_paid), 170, y)
      }
      
      if (parseFloat(inv.balance_due) > 0) {
        y += 8
        doc.setTextColor(220, 53, 69)
        doc.text('Balance Due:', 130, y)
        doc.text(formatCurrency(inv.balance_due), 170, y)
      }
      
      // Terms & Notes
      if (inv.terms || inv.notes) {
        y += 20
        doc.setFontSize(9)
        doc.setTextColor(100)
        if (inv.terms) doc.text(`Terms: ${inv.terms}`, 20, y)
        if (inv.notes) doc.text(`Notes: ${inv.notes}`, 20, y + 6)
      }
      
      // Footer
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text('Thank you for your business!', pageWidth / 2, 280, { align: 'center' })
      
      // Save
      doc.save(`${inv.invoice_number}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Failed to generate PDF')
    }
  }

  // Calculate totals for invoice form
  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => 
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0)
  }

  const calculateTax = (subtotal, taxRate) => subtotal * (parseFloat(taxRate) || 0) / 100
  const calculateTotal = (subtotal, tax) => subtotal + tax

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
            <div className="number" style={{ color: 'var(--accent-success)' }}>{formatCurrency(stats.total_paid)}</div>
            <div className="label">Total Received</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: 'var(--accent-warning)' }}>{formatCurrency(stats.total_outstanding)}</div>
            <div className="label">Outstanding</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: stats.overdue > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
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
          <button className={`btn ${activeView === 'quotations' ? 'btn-primary' : ''}`} onClick={() => setActiveView('quotations')}>
            📋 Quotations
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
            <Formik
              initialValues={invoiceInitialValues}
              validationSchema={invoiceSchema}
              validateOnChange={true}
              validateOnBlur={true}
              onSubmit={handleCreateInvoice}
            >
              {({ values, setFieldValue, isSubmitting }) => {
                const subtotal = calculateSubtotal(values.items)
                const tax = calculateTax(subtotal, values.tax_rate)
                const total = calculateTotal(subtotal, tax)
                
                return (
                  <Form style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Create New Invoice</h3>
                    <div className="form-row">
                      <FormikField
                        label="Client"
                        name="client_id"
                        type="select"
                        required
                      >
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </FormikField>
                      <FormikField
                        label="Invoice Date"
                        name="invoice_date"
                        type="date"
                        required
                      />
                      <FormikField
                        label="Due Date"
                        name="due_date"
                        type="date"
                        required
                      />
                      <FormikField
                        label="Tax Rate (%)"
                        name="tax_rate"
                        type="number"
                      />
                    </div>

                    <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Line Items</h4>
                    {values.items.map((item, index) => (
                      <div key={index} className="form-row" style={{ alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 3 }}>
                          <FormikField
                            label={index === 0 ? 'Description' : ''}
                            name={`items[${index}].description`}
                            placeholder="Service description"
                            required
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <FormikField
                            label={index === 0 ? 'Qty' : ''}
                            name={`items[${index}].quantity`}
                            type="number"
                            min="1"
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <FormikField
                            label={index === 0 ? 'Unit Price' : ''}
                            name={`items[${index}].unit_price`}
                            type="number"
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          {index === 0 && <label>Amount</label>}
                          <input 
                            value={formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))} 
                            disabled 
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                          />
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-small" 
                          onClick={() => {
                            const newItems = values.items.filter((_, i) => i !== index)
                            setFieldValue('items', newItems)
                          }} 
                          style={{ marginBottom: '1rem' }}
                          disabled={values.items.length <= 1}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      className="btn btn-small" 
                      onClick={() => setFieldValue('items', [...values.items, { description: '', quantity: 1, unit_price: '' }])} 
                      style={{ marginBottom: '1rem' }}
                    >
                      + Add Item
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div>Subtotal: <strong>{formatCurrency(subtotal)}</strong></div>
                        <div>Tax ({values.tax_rate}%): <strong>{formatCurrency(tax)}</strong></div>
                        <div style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Total: <strong>{formatCurrency(total)}</strong></div>
                      </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '1rem' }}>
                      <FormikField
                        label="Notes"
                        name="notes"
                        placeholder="Additional notes..."
                      />
                      <FormikField
                        label="Terms"
                        name="terms"
                      />
                    </div>
                    <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : '💾 Create Invoice'}
                    </button>
                  </Form>
                )
              }}
            </Formik>
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
                <tr key={inv.id} style={{ background: inv.status === 'overdue' ? 'rgba(231, 76, 60, 0.1)' : inv.status === 'paid' ? 'rgba(39, 174, 96, 0.1)' : 'transparent' }}>
                  <td><strong>{inv.invoice_number}</strong></td>
                  <td>{inv.client_name || '-'}</td>
                  <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td><strong>{formatCurrency(inv.total_amount)}</strong></td>
                  <td style={{ color: 'var(--accent-success)' }}>{formatCurrency(inv.amount_paid)}</td>
                  <td style={{ color: parseFloat(inv.balance_due) > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{formatCurrency(inv.balance_due)}</td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-small" onClick={() => viewInvoiceDetails(inv)} title="View">👁️</button>
                      <button className="btn btn-small" onClick={() => generatePDF(inv)} title="Download PDF">📥</button>
                      {inv.status === 'draft' && (
                        <button className="btn btn-small btn-primary" onClick={() => handleStatusChange(inv.id, 'sent')} title="Send">📤</button>
                      )}
                      {['sent', 'partial', 'overdue'].includes(inv.status) && (
                        <button className="btn btn-small btn-success" onClick={() => { setShowPaymentModal(inv); }} title="Record Payment">💰</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No invoices found. Create your first invoice!</p>}
        </div>
      )}

      {/* Quotations View */}
      {activeView === 'quotations' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>📋 Quotations</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => { setEditingQuotation(null); setShowQuotationForm(!showQuotationForm) }}>
                {showQuotationForm && !editingQuotation ? 'Cancel' : '+ New Quotation'}
              </button>
            </div>
          </div>

          {quotationStats && (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1rem' }}>
              <div className="stat-card">
                <div className="number">{quotationStats.total}</div>
                <div className="label">Total Quotes</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: 'var(--accent-primary)' }}>{quotationStats.sent}</div>
                <div className="label">Sent</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: 'var(--accent-success)' }}>{quotationStats.accepted}</div>
                <div className="label">Accepted</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: 'var(--accent-success)' }}>{formatCurrency(quotationStats.accepted_value)}</div>
                <div className="label">Accepted Value</div>
              </div>
            </div>
          )}

          {showQuotationForm && (
            <Formik
              initialValues={editingQuotation ? getEditQuotationValues() : quotationInitialValues}
              validationSchema={quotationSchema}
              validateOnChange={true}
              validateOnBlur={true}
              enableReinitialize={true}
              onSubmit={handleCreateQuotation}
            >
              {({ values, setFieldValue, isSubmitting }) => {
                const subtotal = calculateSubtotal(values.items)
                const tax = calculateTax(subtotal, values.tax_rate)
                const total = calculateTotal(subtotal, tax)
                return (
                  <Form style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>{editingQuotation ? `Edit Quotation: ${editingQuotation.quotation_number}` : 'Create New Quotation'}</h3>
                    <div className="form-row">
                      <FormikField label="Client" name="client_id" type="select" required>
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </FormikField>
                      <FormikField label="Quotation Date" name="quotation_date" type="date" required />
                      <FormikField label="Valid Until" name="valid_until" type="date" required />
                      <FormikField label="Tax Rate (%)" name="tax_rate" type="number" />
                    </div>

                    <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Line Items</h4>
                    {values.items.map((item, index) => (
                      <div key={index} className="form-row" style={{ alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 3 }}>
                          <FormikField label={index === 0 ? 'Description' : ''} name={`items[${index}].description`} placeholder="Service description" required />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <FormikField label={index === 0 ? 'Qty' : ''} name={`items[${index}].quantity`} type="number" min="1" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <FormikField label={index === 0 ? 'Unit Price' : ''} name={`items[${index}].unit_price`} type="number" placeholder="0.00" required />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          {index === 0 && <label>Amount</label>}
                          <input value={formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))} disabled style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        </div>
                        <button type="button" className="btn btn-small" onClick={() => setFieldValue('items', values.items.filter((_, i) => i !== index))} style={{ marginBottom: '1rem' }} disabled={values.items.length <= 1}>🗑️</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-small" onClick={() => setFieldValue('items', [...values.items, { description: '', quantity: 1, unit_price: '' }])} style={{ marginBottom: '1rem' }}>+ Add Item</button>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div>Subtotal: <strong>{formatCurrency(subtotal)}</strong></div>
                        <div>Tax ({values.tax_rate}%): <strong>{formatCurrency(tax)}</strong></div>
                        <div style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Total: <strong>{formatCurrency(total)}</strong></div>
                      </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '1rem' }}>
                      <FormikField label="Notes" name="notes" placeholder="Additional notes..." />
                      <FormikField label="Terms" name="terms" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : editingQuotation ? '💾 Update Quotation' : '💾 Create Quotation'}
                      </button>
                      {editingQuotation && (
                        <button type="button" className="btn" onClick={() => { setShowQuotationForm(false); setEditingQuotation(null) }}>Cancel Edit</button>
                      )}
                    </div>
                  </Form>
                )
              }}
            </Formik>
          )}

          <table>
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Valid Until</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id}>
                  <td><strong>{q.quotation_number}</strong></td>
                  <td>{q.client_name || '-'}</td>
                  <td>{new Date(q.quotation_date).toLocaleDateString()}</td>
                  <td>{new Date(q.valid_until).toLocaleDateString()}</td>
                  <td><strong>{formatCurrency(q.total_amount)}</strong></td>
                  <td>{getQuotationStatusBadge(q.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-small" onClick={() => viewQuotationDetails(q)} title="View">👁️</button>
                      <button className="btn btn-small" onClick={() => generateQuotationPDF(q)} title="Download PDF">📥</button>
                      {q.status === 'draft' && (
                        <>
                          <button className="btn btn-small" onClick={() => startEditQuotation(q)} title="Edit">✏️</button>
                          <button className="btn btn-small btn-primary" onClick={() => handleQuotationStatusChange(q.id, 'sent')} title="Mark Sent">📤</button>
                          <button className="btn btn-small" onClick={() => handleDeleteQuotation(q.id)} title="Delete" style={{ color: 'var(--accent-danger)' }}>🗑️</button>
                        </>
                      )}
                      {q.status === 'sent' && (
                        <>
                          <button className="btn btn-small btn-success" onClick={() => handleQuotationStatusChange(q.id, 'accepted')} title="Accept">✅</button>
                          <button className="btn btn-small" onClick={() => handleQuotationStatusChange(q.id, 'rejected')} title="Reject" style={{ color: 'var(--accent-danger)' }}>❌</button>
                        </>
                      )}
                      {q.status === 'accepted' && (
                        <button className="btn btn-small btn-primary" onClick={() => handleConvertToInvoice(q.id)} title="Convert to Invoice">🔄 Invoice</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {quotations.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No quotations found. Create your first quotation!</p>}
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
            <Formik
              initialValues={clientInitialValues}
              validationSchema={clientSchema}
              validateOnChange={true}
              validateOnBlur={true}
              onSubmit={handleCreateClient}
            >
              {({ isSubmitting }) => (
                <Form style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Add New Client</h3>
                  <div className="form-row">
                    <FormikField
                      label="Company/Client Name"
                      name="name"
                      placeholder="Client name"
                      required
                    />
                    <FormikField
                      label="Contact Person"
                      name="contact_person"
                      placeholder="Contact person"
                    />
                    <FormikField
                      label="Company Type"
                      name="company_type"
                      type="select"
                    >
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                      <option value="government">Government</option>
                    </FormikField>
                  </div>
                  <div className="form-row">
                    <FormikField
                      label="Email"
                      name="email"
                      type="email"
                      placeholder="email@example.com"
                    />
                    <FormikField
                      label="Phone"
                      name="phone"
                      placeholder="Phone number"
                      required
                    />
                    <FormikField
                      label="KRA PIN *"
                      name="tax_pin"
                      placeholder="e.g. A123456789B"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <FormikField
                      label="Address"
                      name="address"
                      placeholder="Street address"
                    />
                    <FormikField
                      label="City"
                      name="city"
                      placeholder="City"
                    />
                    <FormikField
                      label="Payment Terms (days)"
                      name="payment_terms"
                      type="number"
                    />
                  </div>
                  <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : '💾 Save Client'}
                  </button>
                </Form>
              )}
            </Formik>
          )}

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>KRA PIN</th>
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
                  <td>{client.tax_pin || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{client.company_type || '-'}</td>
                  <td>{client.payment_terms} days</td>
                  <td>
                    {client.is_active ? (
                      <span className="badge" style={{ background: 'var(--accent-success)', color: '#fff' }}>Active</span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--accent-danger)', color: '#fff' }}>Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No clients found. Add your first client!</p>}
        </div>
      )}

      {/* Payment Modal */}
      <AnimatedModal isOpen={!!showPaymentModal} onClose={() => setShowPaymentModal(null)} title="💰 Record Payment">
        {showPaymentModal && (
          <>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Invoice: <strong>{showPaymentModal.invoice_number}</strong><br />
              Balance Due: <strong style={{ color: 'var(--accent-danger)' }}>{formatCurrency(showPaymentModal.balance_due)}</strong>
            </p>
            <Formik
              initialValues={{ ...paymentInitialValues, amount: showPaymentModal.balance_due }}
              validationSchema={paymentSchema}
              validateOnChange={true}
              validateOnBlur={true}
              onSubmit={handleRecordPayment}
            >
              {({ isSubmitting }) => (
                <Form>
                  <FormikField
                    label="Amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                  />
                  <FormikField
                    label="Payment Date"
                    name="payment_date"
                    type="date"
                    required
                  />
                  <FormikField
                    label="Payment Method"
                    name="payment_method"
                    type="select"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </FormikField>
                  <FormikField
                    label="Reference Number"
                    name="reference_number"
                    placeholder="e.g. Transaction ID"
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" onClick={() => setShowPaymentModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                      {isSubmitting ? 'Recording...' : '✅ Record Payment'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </>
        )}
      </AnimatedModal>

      {/* Invoice Details Modal */}
      <AnimatedModal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)}>
        {selectedInvoice && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-primary)' }}>📄 Invoice {selectedInvoice.invoice_number}</h3>
              {getStatusBadge(selectedInvoice.status)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              <div>
                <strong>Client:</strong><br />
                {selectedInvoice.clients?.name}<br />
                {selectedInvoice.clients?.tax_pin && <><strong>KRA PIN:</strong> {selectedInvoice.clients.tax_pin}<br /></>}
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

            <div style={{ textAlign: 'right', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              <div>Subtotal: {formatCurrency(selectedInvoice.subtotal)}</div>
              <div>Tax ({selectedInvoice.tax_rate}%): {formatCurrency(selectedInvoice.tax_amount)}</div>
              <div style={{ fontSize: '1.2rem' }}><strong>Total: {formatCurrency(selectedInvoice.total_amount)}</strong></div>
              <div style={{ color: 'var(--accent-success)' }}>Paid: {formatCurrency(selectedInvoice.amount_paid)}</div>
              <div style={{ color: 'var(--accent-danger)' }}><strong>Balance: {formatCurrency(selectedInvoice.balance_due)}</strong></div>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={() => generatePDF(selectedInvoice)}>📥 Download PDF</button>
              <button className="btn" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </>
        )}
      </AnimatedModal>

      {/* Quotation Details Modal */}
      <AnimatedModal isOpen={!!selectedQuotation} onClose={() => setSelectedQuotation(null)}>
        {selectedQuotation && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-primary)' }}>📋 Quotation {selectedQuotation.quotation_number}</h3>
              {getQuotationStatusBadge(selectedQuotation.status)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              <div>
                <strong>Client:</strong><br />
                {selectedQuotation.clients?.name}<br />
                {selectedQuotation.clients?.tax_pin && <><strong>KRA PIN:</strong> {selectedQuotation.clients.tax_pin}<br /></>}
                {selectedQuotation.clients?.email}<br />
                {selectedQuotation.clients?.phone}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Quotation Date:</strong> {new Date(selectedQuotation.quotation_date).toLocaleDateString()}<br />
                <strong>Valid Until:</strong> {new Date(selectedQuotation.valid_until).toLocaleDateString()}
                {selectedQuotation.invoice_id && <><br /><strong>Invoice:</strong> Converted</>}
              </div>
            </div>

            <table style={{ marginBottom: '1rem' }}>
              <thead>
                <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {selectedQuotation.quotation_items?.map((item, i) => (
                  <tr key={i}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              <div>Subtotal: {formatCurrency(selectedQuotation.subtotal)}</div>
              <div>Tax ({selectedQuotation.tax_rate}%): {formatCurrency(selectedQuotation.tax_amount)}</div>
              <div style={{ fontSize: '1.2rem' }}><strong>Total: {formatCurrency(selectedQuotation.total_amount)}</strong></div>
            </div>

            {(selectedQuotation.terms || selectedQuotation.notes) && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.9rem' }}>
                {selectedQuotation.terms && <div><strong>Terms:</strong> {selectedQuotation.terms}</div>}
                {selectedQuotation.notes && <div><strong>Notes:</strong> {selectedQuotation.notes}</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => generateQuotationPDF(selectedQuotation)}>📥 Download PDF</button>
              {selectedQuotation.status === 'draft' && (
                <button className="btn btn-primary" onClick={() => { handleQuotationStatusChange(selectedQuotation.id, 'sent') }}>📤 Mark Sent</button>
              )}
              {selectedQuotation.status === 'sent' && (
                <>
                  <button className="btn btn-success" onClick={() => { handleQuotationStatusChange(selectedQuotation.id, 'accepted') }}>✅ Accept</button>
                  <button className="btn" style={{ color: 'var(--accent-danger)' }} onClick={() => { handleQuotationStatusChange(selectedQuotation.id, 'rejected') }}>❌ Reject</button>
                </>
              )}
              {selectedQuotation.status === 'accepted' && (
                <button className="btn btn-success" onClick={() => handleConvertToInvoice(selectedQuotation.id)}>🔄 Convert to Invoice</button>
              )}
              <button className="btn" onClick={() => setSelectedQuotation(null)}>Close</button>
            </div>
          </>
        )}
      </AnimatedModal>
    </div>
  )
}
