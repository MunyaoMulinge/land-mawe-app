-- Drop Trailers Module
-- Removes all trailer-related tables and references

-- Remove trailer_id from job_cards
ALTER TABLE job_cards DROP COLUMN IF EXISTS trailer_id;

-- Remove trailer permissions
DELETE FROM role_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE module = 'trailers'
);
DELETE FROM user_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE module = 'trailers'
);
DELETE FROM permissions WHERE module = 'trailers';

-- Drop trailer tables (order matters due to foreign keys)
DROP TABLE IF EXISTS trailer_assignments;
DROP TABLE IF EXISTS trailer_maintenance;
DROP TABLE IF EXISTS trailers;
