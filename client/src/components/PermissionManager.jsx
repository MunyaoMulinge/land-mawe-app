import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import AnimatedLoader from './AnimatedLoader'

const MODULES = [
  { id: 'trucks', label: '🚛 Trucks', color: '#3498db' },
  { id: 'trailers', label: '🚚 Trailers', color: '#9b59b6' },
  { id: 'drivers', label: '👤 Drivers', color: '#e67e22' },
  { id: 'equipment', label: '📦 Equipment', color: '#1abc9c' },
  { id: 'job_cards', label: '📋 Job Cards', color: '#f39c12' },
  { id: 'fuel', label: '⛽ Fuel', color: '#e74c3c' },
  { id: 'maintenance', label: '🔧 Maintenance', color: '#34495e' },
  { id: 'compliance', label: '🛡️ Compliance', color: '#16a085' },
  { id: 'invoices', label: '💰 Invoices', color: '#27ae60' },
  { id: 'bookings', label: '📅 Bookings', color: '#8e44ad' },
  { id: 'users', label: '👥 Users', color: '#c0392b' },
  { id: 'activity_logs', label: '📊 Activity Logs', color: '#7f8c8d' },
  { id: 'reports', label: '📈 Reports', color: '#2c3e50' }
]

const ACTIONS = [
  { id: 'view', label: '👁️ View', description: 'Can view records' },
  { id: 'create', label: '➕ Create', description: 'Can add new records' },
  { id: 'edit', label: '✏️ Edit', description: 'Can modify records' },
  { id: 'delete', label: '🗑️ Delete', description: 'Can delete records' },
  { id: 'approve', label: '✅ Approve', description: 'Can approve/reject' }
]

const ROLES = [
  { id: 'superadmin', label: '⭐ Super Admin', description: 'Full system access' },
  { id: 'admin', label: '👑 Admin', description: 'Most permissions, limited delete' },
  { id: 'finance', label: '💰 Finance', description: 'Invoices, fuel approval, reports' },
  { id: 'staff', label: '👤 Staff', description: 'Operations, view + create/edit' },
  { id: 'driver', label: '🚗 Driver', description: 'Driver portal only' }
]

export default function PermissionManager({ currentUser }) {
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState({})
  const [selectedRole, setSelectedRole] = useState('staff')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      // Fetch all permissions
      const res = await fetch(`${API_BASE}/permissions`, {
        headers: { 'x-user-id': currentUser?.id }
      })
      const data = await res.json()
      setPermissions(data.permissions)

      // Fetch role permissions
      const roleRes = await fetch(`${API_BASE}/permissions/roles`, {
        headers: { 'x-user-id': currentUser?.id }
      })
      const roleData = await roleRes.json()
      
      // Convert to lookup object
      const lookup = {}
      roleData.forEach(rp => {
        if (!lookup[rp.role]) lookup[rp.role] = new Set()
        lookup[rp.role].add(`${rp.permissions.module}:${rp.permissions.action}`)
      })
      setRolePermissions(lookup)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching permissions:', err)
      setLoading(false)
    }
  }

  // Map UI actions to database actions
  const actionToDbAction = {
    'fuel:create': 'fuel:record' // UI shows 'create', DB stores 'record'
  }

  const togglePermission = async (role, module, action, granted, showMsg = true) => {
    setSaving(true)
    try {
      // Convert UI action to database action if needed
      const permissionKey = `${module}:${action}`
      const dbAction = actionToDbAction[permissionKey] 
        ? actionToDbAction[permissionKey].split(':')[1] 
        : action
      
      const res = await fetch(`${API_BASE}/permissions/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({ role, module, action: dbAction, granted })
      })

      if (!res.ok) throw new Error('Failed to update permission')

      // Update local state (use original key for UI consistency)
      const key = permissionKey
      setRolePermissions(prev => {
        const updated = { ...prev }
        if (!updated[role]) updated[role] = new Set()
        if (granted) {
          updated[role].add(key)
        } else {
          updated[role].delete(key)
        }
        return updated
      })

      if (showMsg) {
        setMessage('Permission updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      if (showMsg) {
        setMessage('Error: ' + err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  // Permission aliases for backwards compatibility
  const permissionAliases = {
    'fuel:create': ['fuel:record'] // fuel:create is equivalent to fuel:record
  }

  const hasPermission = (role, module, action) => {
    if (role === 'superadmin') return true
    const key = `${module}:${action}`
    
    // Check exact permission
    if (rolePermissions[role]?.has(key)) return true
    
    // Check aliases
    const aliases = permissionAliases[key] || []
    return aliases.some(alias => rolePermissions[role]?.has(alias))
  }

  const applyTemplate = async (template) => {
    setSaving(true)
    setMessage(`Applying ${template} template...`)
    
    const templates = {
      admin: ['view', 'create', 'edit', 'approve'],
      staff: ['view', 'create', 'edit'],
      finance: ['view', 'approve'],
      driver: ['view']
    }

    const allowedActions = templates[template] || ['view']
    const updates = []

    // Collect all updates first
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        const shouldGrant = allowedActions.includes(action.id)
        const key = `${module.id}:${action.id}`
        
        // Update local state immediately (optimistic)
        setRolePermissions(prev => {
          const updated = { ...prev }
          if (!updated[selectedRole]) updated[selectedRole] = new Set()
          if (shouldGrant) {
            updated[selectedRole].add(key)
          } else {
            updated[selectedRole].delete(key)
          }
          return updated
        })
        
        // Queue API call
        updates.push({ module: module.id, action: action.id, granted: shouldGrant })
      }
    }

    // Batch API calls with Promise.all
    try {
      await Promise.all(
        updates.map(({ module, action, granted }) => {
          // Convert UI action to database action if needed
          const permissionKey = `${module}:${action}`
          const dbAction = actionToDbAction[permissionKey] 
            ? actionToDbAction[permissionKey].split(':')[1] 
            : action
          
          return fetch(`${API_BASE}/permissions/roles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser?.id
            },
            body: JSON.stringify({ role: selectedRole, module, action: dbAction, granted })
          })
        })
      )
      
      setMessage(`✅ ${template.charAt(0).toUpperCase() + template.slice(1)} template applied!`)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Error applying template: ' + err.message)
      // Refresh to get actual state from server
      fetchPermissions()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AnimatedLoader message="Loading permissions..." />

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="card">
        <h2>⛔ Access Denied</h2>
        <p>Only Super Administrators can manage permissions.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>🔐 Permission Manager</h2>
        
        {message && (
          <div style={{ 
            padding: '0.75rem', 
            background: message.includes('Error') ? '#f8d7da' : '#d4edda',
            color: message.includes('Error') ? '#721c24' : '#155724',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}>
            {message}
          </div>
        )}

        {/* Role Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Select Role to Configure:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`btn ${selectedRole === role.id ? 'btn-primary' : ''}`}
                disabled={role.id === 'superadmin'}
                title={role.id === 'superadmin' ? 'Super Admin has all permissions automatically' : role.description}
              >
                {role.label}
              </button>
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {ROLES.find(r => r.id === selectedRole)?.description}
          </p>
        </div>

        {/* Quick Templates */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Quick Templates:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => applyTemplate('admin')} className="btn btn-small">
              👑 Admin (View + Create + Edit + Approve)
            </button>
            <button onClick={() => applyTemplate('staff')} className="btn btn-small">
              👤 Staff (View + Create + Edit)
            </button>
            <button onClick={() => applyTemplate('finance')} className="btn btn-small">
              💰 Finance (View + Approve)
            </button>
            <button onClick={() => applyTemplate('driver')} className="btn btn-small">
              🚗 Driver (View Only)
            </button>
          </div>
        </div>

        {/* Permission Matrix */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: '150px' }}>Module</th>
                {ACTIONS.map(action => (
                  <th key={action.id} style={{ textAlign: 'center', minWidth: '80px' }}>
                    <div>{action.label}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                      {action.description}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(module => (
                <tr key={module.id}>
                  <td style={{ 
                    fontWeight: 500, 
                    borderLeft: `4px solid ${module.color}`,
                    paddingLeft: '0.75rem'
                  }}>
                    {module.label}
                  </td>
                  {ACTIONS.map(action => {
                    const isGranted = hasPermission(selectedRole, module.id, action.id)
                    const isSuperAdmin = selectedRole === 'superadmin'
                    
                    return (
                      <td key={action.id} style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => togglePermission(selectedRole, module.id, action.id, !isGranted)}
                          disabled={saving || isSuperAdmin}
                          style={{
                            width: '40px',
                            height: '40px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isSuperAdmin ? 'default' : 'pointer',
                            background: isGranted ? '#28a745' : '#dc3545',
                            color: 'white',
                            fontSize: '1.2rem',
                            opacity: saving ? 0.6 : 1
                          }}
                          title={isGranted ? 'Click to revoke' : 'Click to grant'}
                        >
                          {isGranted ? '✓' : '✗'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong>Legend:</strong>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span><span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span> = Granted</span>
            <span><span style={{ color: '#dc3545', fontWeight: 'bold' }}>✗</span> = Denied</span>
            <span>⭐ Super Admin = All permissions (auto)</span>
          </div>
        </div>
      </div>

      {/* Special Permissions Note */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>📝 Special Permissions</h3>
        <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <li><strong>fuel.record:</strong> Can record fuel purchases (drivers + staff)</li>
          <li><strong>fuel.approve:</strong> Can approve fuel records (finance only)</li>
          <li><strong>job_cards.fill_checklist:</strong> Can fill departure/return checklists</li>
          <li><strong>job_cards.mark_departed:</strong> Can mark job as departed</li>
          <li><strong>drivers.create_account:</strong> Can create driver login accounts</li>
          <li><strong>reports.export:</strong> Can export data to Excel/PDF</li>
        </ul>
      </div>
    </div>
  )
}
