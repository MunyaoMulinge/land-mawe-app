-- Add fuel:create permission (for PermissionManager UI compatibility)
-- The existing fuel:record is for recording fuel purchases
-- fuel:create is needed for the granular permission system UI

INSERT INTO permissions (module, action, description) VALUES
('fuel', 'create', 'Create fuel records (UI action for fuel:record)')
ON CONFLICT (module, action) DO NOTHING;

-- Also add any other missing standard actions that the UI expects
INSERT INTO permissions (module, action, description) VALUES
('drivers', 'create', 'Add new drivers'),
('equipment', 'create', 'Add new equipment'),
('maintenance', 'create', 'Create maintenance records'),
('compliance', 'create', 'Upload compliance documents'),
('activity_logs', 'view', 'View activity logs')
ON CONFLICT (module, action) DO NOTHING;
