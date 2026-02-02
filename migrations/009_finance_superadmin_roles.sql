-- Migration: Add Finance & Super Admin Roles + Fuel Approval System
-- Run this in Supabase SQL Editor

-- Update role constraint to include 'finance' and 'superadmin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'finance', 'staff', 'driver'));

-- Add fuel approval fields
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for fuel approval queries
CREATE INDEX IF NOT EXISTS idx_fuel_records_approval_status ON fuel_records(approval_status);

-- Add password reset token fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Disable public signup (handled in application logic)
COMMENT ON TABLE users IS 'User accounts - signup disabled, only superadmin can create accounts';

-- Update first user to superadmin if exists
UPDATE users SET role = 'superadmin' WHERE id = (SELECT MIN(id) FROM users) AND role = 'admin';

