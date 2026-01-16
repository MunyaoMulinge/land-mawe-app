-- Migration: Add Driver Role & Link Drivers to Users
-- Run this in Supabase SQL Editor

-- Update role constraint to include 'driver'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff', 'driver'));

-- Add user_id column to drivers table to link driver accounts
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);

-- Add comments for clarity
COMMENT ON COLUMN drivers.user_id IS 'Links driver to their user account for login access';
COMMENT ON COLUMN users.role IS 'User role: admin (full access), staff (limited access), driver (driver portal only)';

