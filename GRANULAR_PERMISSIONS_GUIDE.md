# Granular Permissions System - Implementation Guide

## 🎯 Overview

The granular permissions system allows fine-grained control over what each user can do within each module. Instead of just broad roles (admin, staff), you can now control specific actions like:

- James can **VIEW** trucks but not **DELETE** them
- Finance can **APPROVE** fuel records but not **CREATE** trucks
- Drivers can only **FILL CHECKLIST** on their assigned job cards

---

## 📁 Files Created/Modified

### Database Migrations
| File | Purpose |
|------|---------|
| `migrations/add_permissions_system.sql` | Creates permissions tables and default data |

### Backend
| File | Purpose |
|------|---------|
| `server/middleware/permissions.js` | Permission checking middleware |
| `server/index.js` | Added permissions API endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/hooks/usePermissions.js` | React hook for permission checking |
| `client/src/components/PermissionManager.jsx` | UI for superadmin to manage permissions |
| `client/src/App.jsx` | Wrapped with PermissionsProvider |

---

## 🔐 Permission Structure

### Format: `module:action`

**Modules:**
- `trucks` - Truck management
- `trailers` - Trailer management  
- `drivers` - Driver management
- `equipment` - Equipment inventory
- `job_cards` - Job card workflow
- `fuel` - Fuel records
- `maintenance` - Maintenance tracking
- `compliance` - Compliance documents
- `invoices` - Billing
- `bookings` - Reservations
- `users` - User management
- `activity_logs` - Audit trail
- `reports` - Reports and analytics

**Actions:**
- `view` - View records
- `create` - Add new records
- `edit` - Modify records
- `delete` - Remove records
- `approve` - Approve/reject (for workflows)

**Special Actions:**
- `fuel:record` - Record fuel purchase
- `fuel:approve` - Approve fuel record
- `job_cards:fill_checklist` - Fill checklists
- `job_cards:mark_departed` - Mark as departed
- `job_cards:mark_complete` - Mark as completed

---

## 👥 Default Role Permissions

### ⭐ Super Admin
**Has ALL permissions automatically**
- Can do everything in the system
- Can access Permission Manager

### 👑 Admin
- ✅ View, Create, Edit on all modules
- ✅ Approve workflows (job cards, fuel)
- ❌ Delete (restricted)
- ❌ Manage permissions (superadmin only)

### 💰 Finance
- ✅ View invoices, fuel, reports
- ✅ Approve fuel records
- ✅ Record invoice payments
- ❌ Edit trucks, drivers, equipment
- ❌ Create job cards

### 👤 Staff (James, Sammy)
- ✅ View all operational modules
- ✅ Create/Edit on trucks, trailers, drivers, equipment
- ✅ Create job cards, fill checklists
- ✅ Record fuel (own records)
- ❌ Approve (admin only)
- ❌ Delete
- ❌ View financial reports

### 🚗 Driver
- ✅ View assigned job cards
- ✅ Fill checklists
- ✅ Mark departed/complete
- ✅ Record fuel
- ❌ Everything else

---

## 🎨 Using Permissions in Components

### Method 1: `usePermissions` Hook

```jsx
import { usePermissions } from '../hooks/usePermissions'

function Trucks() {
  const { hasPermission } = usePermissions()
  
  return (
    <div>
      {/* Only show button if user has create permission */}
      {hasPermission('trucks', 'create') && (
        <button>Add Truck</button>
      )}
      
      {/* Show edit button conditionally */}
      {hasPermission('trucks', 'edit') && (
        <button>Edit</button>
      )}
    </div>
  )
}
```

### Method 2: `Can` Component

```jsx
import { Can } from '../hooks/usePermissions'

function Trucks() {
  return (
    <div>
      <Can module="trucks" action="create">
        <button>Add Truck</button>
      </Can>
      
      <Can module="trucks" action="edit">
        <button>Edit</button>
      </Can>
      
      {/* With fallback */}
      <Can module="trucks" action="delete" fallback={<span>Delete (Admin Only)</span>}>
        <button>Delete</button>
      </Can>
    </div>
  )
}
```

### Method 3: `CanAny` (Any of multiple permissions)

```jsx
import { CanAny } from '../hooks/usePermissions'

<CanAny permissions={[
  { module: 'trucks', action: 'edit' },
  { module: 'trucks', action: 'update_status' }
]}>
  <button>Modify Truck</button>
</CanAny>
```

---

## 🛡️ Protecting API Endpoints

### Simple Permission Check
```javascript
import { requirePermission } from './middleware/permissions.js'

// Only users with trucks:create can access
app.post('/api/trucks', 
  requirePermission('trucks', 'create'),
  async (req, res) => {
    // Create truck logic
  }
)
```

### Any Permission (OR)
```javascript
import { requireAnyPermission } from './middleware/permissions.js'

// User needs trucks:edit OR trucks:update_status
app.patch('/api/trucks/:id', 
  requireAnyPermission([
    { module: 'trucks', action: 'edit' },
    { module: 'trucks', action: 'update_status' }
  ]),
  async (req, res) => {
    // Update truck logic
  }
)
```

### All Permissions (AND)
```javascript
import { requireAllPermissions } from './middleware/permissions.js'

// User needs BOTH permissions
app.post('/api/important-action',
  requireAllPermissions([
    { module: 'trucks', action: 'edit' },
    { module: 'activity_logs', action: 'view' }
  ]),
  async (req, res) => {
    // Protected logic
  }
)
```

---

## 🎛️ Permission Manager UI

### Access
- Only **Super Admin** can access
- Navigate to: **🔐 Permissions** in the sidebar

### Features
1. **Role Selector** - Choose which role to configure
2. **Permission Matrix** - Grid showing all modules × actions
3. **Quick Templates**:
   - 👑 Admin (View + Create + Edit + Approve)
   - 👤 Staff (View + Create + Edit)
   - 💰 Finance (View + Approve)
   - 🚗 Driver (View Only)
4. **Individual Toggle** - Click ✓/✗ to grant/revoke specific permissions

### Visual Indicators
- 🟢 **Green ✓** = Permission Granted
- 🔴 **Red ✗** = Permission Denied
- ⚫ **Disabled** = Super Admin (all permissions automatic)

---

## 🔧 Setup Instructions

### Step 1: Run Migration
```bash
# In Supabase SQL Editor, run:
migrations/add_permissions_system.sql
```

### Step 2: Restart Server
The middleware will automatically cache permissions.

### Step 3: Access Permission Manager
1. Log in as **Super Admin**
2. Go to **🔐 Permissions** in sidebar
3. Configure permissions for each role

---

## 📊 Example Scenarios

### Scenario 1: James (Operations)
**Requirements:**
- Can add trucks, trailers, drivers
- Can create job cards
- Cannot approve fuel (finance does that)
- Cannot delete anything

**Configuration:**
- Role: `staff`
- Permissions: `trucks:create,edit`, `trailers:create,edit`, `drivers:create,edit`, `job_cards:create`, `fuel:record`

### Scenario 2: Finance Team
**Requirements:**
- Can view all fuel records
- Can approve/reject fuel
- Can create invoices
- Cannot modify trucks

**Configuration:**
- Role: `finance`
- Permissions: `fuel:view,approve`, `invoices:create,view`, `reports:view`

### Scenario 3: Driver
**Requirements:**
- Can view assigned job cards
- Can fill checklists
- Can record fuel
- Cannot access admin modules

**Configuration:**
- Role: `driver`
- Permissions: `job_cards:view,fill_checklist,mark_departed`, `fuel:record`

---

## 🔄 Caching

Permissions are cached for **5 minutes** to reduce database queries.

**When cache clears:**
- Server restart
- Permission change via Permission Manager
- Manual call to `clearPermissionCache()`

---

## 🚀 Benefits

1. **Fine-grained Control** - Exact control over who can do what
2. **Easy Management** - Visual UI for superadmin
3. **Flexible** - Override permissions per user if needed
4. **Secure** - Backend validation on every request
5. **Fast** - Cached permissions for performance

---

## 📝 Next Steps

1. ✅ Run the migration
2. ✅ Assign users to appropriate roles
3. ✅ Fine-tune permissions using the Permission Manager
4. ✅ Train team on their specific access levels
5. ✅ Add more specific permissions as needed

---

## 🆘 Troubleshooting

**User can't see a button:**
- Check their role
- Check role permissions in Permission Manager
- Clear browser cache

**Permission changes not taking effect:**
- Wait 5 minutes (cache TTL)
- Restart server to clear cache

**"Permission denied" error on API:**
- Check backend endpoint has correct middleware
- Verify user has permission in database

---

**The granular permissions system is now fully implemented and ready for Moses to configure!** 🎉
