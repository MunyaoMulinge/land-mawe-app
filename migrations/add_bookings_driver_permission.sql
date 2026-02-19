-- Ensure bookings permissions exist
INSERT INTO permissions (module, action, description) VALUES
  ('bookings', 'view', 'View bookings'),
  ('bookings', 'create', 'Create bookings'),
  ('bookings', 'edit', 'Edit bookings'),
  ('bookings', 'delete', 'Delete bookings'),
  ('bookings', 'approve', 'Approve bookings')
ON CONFLICT (module, action) DO NOTHING;

-- Grant bookings:view to driver role
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'driver', id, true
FROM permissions
WHERE module = 'bookings' AND action = 'view'
ON CONFLICT DO NOTHING;

-- Also grant to staff, admin, finance
INSERT INTO role_permissions (role, permission_id, granted)
SELECT role, p.id, true
FROM permissions p
CROSS JOIN (VALUES ('staff'), ('admin'), ('finance')) AS roles(role)
WHERE p.module = 'bookings' AND p.action IN ('view', 'create', 'edit')
ON CONFLICT DO NOTHING;
