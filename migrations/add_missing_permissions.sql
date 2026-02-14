-- Add missing permissions for all modules
-- This ensures all UI actions have corresponding database permissions

INSERT INTO permissions (module, action, description) VALUES
-- Fuel (create is alias for record)
('fuel', 'create', 'Create fuel records (UI action for fuel:record)'),

-- Compliance (standard CRUD + approve)
('compliance', 'create', 'Upload compliance documents'),
('compliance', 'edit', 'Edit compliance documents'),
('compliance', 'delete', 'Delete compliance documents'),
('compliance', 'approve', 'Approve compliance documents'),

-- Activity Logs (standard actions)
('activity_logs', 'view', 'View activity logs'),
('activity_logs', 'create', 'Create activity logs'),
('activity_logs', 'edit', 'Edit activity logs'),
('activity_logs', 'delete', 'Delete activity logs'),

-- Reports (standard actions)
('reports', 'view', 'View reports'),
('reports', 'create', 'Create reports'),
('reports', 'edit', 'Edit reports'),
('reports', 'delete', 'Delete reports'),

-- Dashboard (standard actions)
('dashboard', 'view', 'View dashboard'),
('dashboard', 'create', 'Create dashboard widgets'),
('dashboard', 'edit', 'Edit dashboard'),
('dashboard', 'delete', 'Delete dashboard widgets'),

-- Ensure all modules have create permission
('drivers', 'create', 'Add new drivers'),
('equipment', 'create', 'Add new equipment'),
('maintenance', 'create', 'Create maintenance records'),
('bookings', 'create', 'Create bookings'),
('trailers', 'create', 'Add new trailers'),
('trucks', 'create', 'Add new trucks'),
('job_cards', 'create', 'Create job cards'),
('invoices', 'create', 'Create invoices'),
('users', 'create', 'Create users')

ON CONFLICT (module, action) DO NOTHING;
