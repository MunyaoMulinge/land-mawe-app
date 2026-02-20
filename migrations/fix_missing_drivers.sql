-- Fix: Link existing driver profiles to existing user accounts
-- Run this in Supabase SQL Editor

-- 1. Link users to their matching driver profiles
-- Mulwa (user_id=25) → MESHACK MULWA (driver_id=26, license=DL12344)
UPDATE drivers SET user_id = 25 WHERE id = 26 AND user_id IS NULL;

-- Chirne (user_id=23) → NEHEMIAH CHIRCHIR (driver_id=27, license=PQV015)
UPDATE drivers SET user_id = 23 WHERE id = 27 AND user_id IS NULL;

-- Kirui (user_id=24) → JACKSON KURUI (driver_id=29, license=IEF156)
UPDATE drivers SET user_id = 24 WHERE id = 29 AND user_id IS NULL;

-- 2. Kimanthi (user_id=20, kimanthimusyoki2@gmail.com) has no driver profile - create one
INSERT INTO drivers (name, phone, license_number, user_id, onboarding_complete)
VALUES ('Kimanthi', '', 'PENDING-20', 20, false);

-- Create onboarding checklist for Kimanthi
INSERT INTO onboarding_checklist (driver_id)
SELECT id FROM drivers WHERE user_id = 20;

-- 3. Wanjala Mukite - has driver profiles (28, 30) but no user account
-- Leaving as-is. To give Wanjala access later, create a user with role 'driver'
-- from the Users page and then link with:
-- UPDATE drivers SET user_id = <new_user_id> WHERE id = 28;

-- 4. Clean up duplicate entries (driver 30 and 31 are duplicates)
-- Only run after confirming they're not referenced in bookings/job cards:
-- Check first:
-- SELECT * FROM bookings WHERE driver_id IN (30, 31);
-- SELECT * FROM job_cards WHERE driver_id IN (30, 31);
-- If empty, safe to delete:
-- DELETE FROM onboarding_checklist WHERE driver_id IN (30, 31);
-- DELETE FROM drivers WHERE id IN (30, 31);

-- Verify
SELECT d.id as driver_id, d.name, d.license_number, d.user_id, u.email
FROM drivers d
LEFT JOIN users u ON d.user_id = u.id
ORDER BY d.id;
