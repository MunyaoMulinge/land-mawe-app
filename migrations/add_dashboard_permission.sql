-- Add dashboard view permission
INSERT INTO permissions (module, action, description) VALUES
('dashboard', 'view', 'View dashboard and analytics')
ON CONFLICT (module, action) DO NOTHING;

-- Grant dashboard view to all default roles
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'superadmin', id, true FROM permissions WHERE module = 'dashboard' AND action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'admin', id, true FROM permissions WHERE module = 'dashboard' AND action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'finance', id, true FROM permissions WHERE module = 'dashboard' AND action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'staff', id, true FROM permissions WHERE module = 'dashboard' AND action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'driver', id, true FROM permissions WHERE module = 'dashboard' AND action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;
