-- Granular Permissions System Migration
-- This adds fine-grained permission control

-- Permissions table - defines all possible permissions
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  module VARCHAR(50) NOT NULL, -- trucks, drivers, job_cards, etc.
  action VARCHAR(50) NOT NULL, -- view, create, edit, delete, approve
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module, action)
);

-- Role permissions - maps roles to permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_id)
);

-- User-specific permissions - overrides role permissions (optional)
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission_id)
);

-- Insert default permissions
INSERT INTO permissions (module, action, description) VALUES
-- Trucks
('trucks', 'view', 'View trucks list and details'),
('trucks', 'create', 'Add new trucks'),
('trucks', 'edit', 'Edit truck information'),
('trucks', 'delete', 'Delete trucks'),
('trucks', 'view_mileage', 'View truck mileage reports'),
('trucks', 'update_status', 'Change truck status'),

-- Trailers
('trailers', 'view', 'View trailers list and details'),
('trailers', 'create', 'Add new trailers'),
('trailers', 'edit', 'Edit trailer information'),
('trailers', 'delete', 'Delete trailers'),
('trailers', 'assign', 'Assign trailers to trucks'),
('trailers', 'view_maintenance', 'View trailer maintenance history'),

-- Drivers
('drivers', 'view', 'View drivers list and details'),
('drivers', 'create', 'Add new drivers'),
('drivers', 'edit', 'Edit driver information'),
('drivers', 'delete', 'Delete drivers'),
('drivers', 'manage_onboarding', 'Manage driver onboarding checklist'),
('drivers', 'create_account', 'Create driver login accounts'),

-- Equipment
('equipment', 'view', 'View equipment inventory'),
('equipment', 'create', 'Add new equipment'),
('equipment', 'edit', 'Edit equipment details'),
('equipment', 'delete', 'Delete equipment'),
('equipment', 'view_condition', 'View equipment condition reports'),

-- Job Cards
('job_cards', 'view', 'View job cards'),
('job_cards', 'create', 'Create job cards'),
('job_cards', 'edit', 'Edit job cards'),
('job_cards', 'delete', 'Delete job cards'),
('job_cards', 'approve', 'Approve job cards'),
('job_cards', 'fill_checklist', 'Fill job card checklists'),
('job_cards', 'mark_departed', 'Mark job cards as departed'),
('job_cards', 'mark_complete', 'Mark job cards as completed'),
('job_cards', 'view_all', 'View all job cards (not just assigned)'),

-- Fuel
('fuel', 'view', 'View fuel records'),
('fuel', 'record', 'Record fuel purchases'),
('fuel', 'edit', 'Edit fuel records'),
('fuel', 'delete', 'Delete fuel records'),
('fuel', 'approve', 'Approve fuel records'),
('fuel', 'view_analytics', 'View fuel analytics and reports'),
('fuel', 'view_all', 'View all fuel records (not just own)'),

-- Maintenance
('maintenance', 'view', 'View maintenance records'),
('maintenance', 'create', 'Create maintenance records'),
('maintenance', 'edit', 'Edit maintenance records'),
('maintenance', 'complete', 'Mark maintenance as completed'),
('maintenance', 'schedule', 'Schedule future maintenance'),

-- Compliance
('compliance', 'view', 'View compliance documents'),
('compliance', 'upload', 'Upload compliance documents'),
('compliance', 'edit', 'Edit compliance documents'),
('compliance', 'delete', 'Delete compliance documents'),
('compliance', 'view_alerts', 'View compliance alerts'),

-- Invoices
('invoices', 'view', 'View invoices'),
('invoices', 'create', 'Create invoices'),
('invoices', 'edit', 'Edit invoices'),
('invoices', 'delete', 'Delete invoices'),
('invoices', 'record_payment', 'Record invoice payments'),
('invoices', 'generate_pdf', 'Generate invoice PDFs'),
('invoices', 'view_financials', 'View financial reports'),

-- Bookings
('bookings', 'view', 'View bookings'),
('bookings', 'create', 'Create bookings'),
('bookings', 'edit', 'Edit bookings'),
('bookings', 'cancel', 'Cancel bookings'),

-- Users
('users', 'view', 'View users'),
('users', 'create', 'Create users'),
('users', 'edit', 'Edit users'),
('users', 'delete', 'Delete users'),
('users', 'manage_permissions', 'Manage user permissions'),

-- Activity Logs
('activity_logs', 'view', 'View activity logs'),
('activity_logs', 'view_all', 'View all activity logs'),

-- Reports
('reports', 'view', 'View reports'),
('reports', 'view_trucks', 'View truck reports'),
('reports', 'view_drivers', 'View driver reports'),
('reports', 'view_financial', 'View financial reports'),
('reports', 'export', 'Export reports to Excel/PDF')
ON CONFLICT (module, action) DO NOTHING;

-- Insert role permissions for SUPERADMIN (all permissions)
INSERT INTO role_permissions (role, permission_id)
SELECT 'superadmin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Insert role permissions for ADMIN (most permissions, no delete)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
WHERE action NOT IN ('delete')
ON CONFLICT DO NOTHING;

-- Insert role permissions for FINANCE
INSERT INTO role_permissions (role, permission_id)
SELECT 'finance', id FROM permissions
WHERE module IN ('invoices', 'fuel', 'reports', 'activity_logs')
   OR (module = 'dashboard' AND action = 'view')
   OR (module = 'job_cards' AND action IN ('view', 'view_all'))
   OR (module = 'trucks' AND action = 'view')
ON CONFLICT DO NOTHING;

-- Insert role permissions for STAFF
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions
WHERE 
  -- View permissions
  action = 'view'
  -- Operational permissions
  OR (module = 'trucks' AND action IN ('edit', 'update_status'))
  OR (module = 'trailers' AND action IN ('edit', 'assign'))
  OR (module = 'drivers' AND action IN ('edit', 'manage_onboarding'))
  OR (module = 'equipment' AND action IN ('create', 'edit'))
  OR (module = 'job_cards' AND action IN ('create', 'edit', 'fill_checklist', 'mark_departed'))
  OR (module = 'fuel' AND action IN ('record', 'view'))
  OR (module = 'maintenance' AND action IN ('create', 'edit', 'complete'))
  OR (module = 'bookings' AND action IN ('create', 'edit', 'cancel'))
ON CONFLICT DO NOTHING;

-- Insert role permissions for DRIVER
INSERT INTO role_permissions (role, permission_id)
SELECT 'driver', id FROM permissions
WHERE 
  (module = 'job_cards' AND action IN ('view', 'fill_checklist', 'mark_departed'))
  OR (module = 'fuel' AND action = 'record')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- Add function to check permission
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id INTEGER,
  p_module VARCHAR,
  p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO v_role FROM users WHERE id = p_user_id;
  
  -- Check role permissions
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = v_role
    AND rp.granted = true
    AND p.module = p_module
    AND p.action = p_action
  ) INTO v_has_permission;
  
  -- Check user-specific override (if exists)
  IF EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
    AND p.module = p_module
    AND p.action = p_action
  ) THEN
    SELECT granted INTO v_has_permission
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
    AND p.module = p_module
    AND p.action = p_action
    LIMIT 1;
  END IF;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;
