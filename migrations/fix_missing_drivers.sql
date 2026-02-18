-- Fix: Create driver records for existing driver users who don't have driver records
-- This creates placeholder driver records that admin can update later

INSERT INTO drivers (name, phone, license_number, user_id)
SELECT 
  u.name,
  u.phone,
  'PENDING', -- Placeholder - admin should update with actual license
  u.id
FROM users u
LEFT JOIN drivers d ON d.user_id = u.id
WHERE u.role = 'driver' 
AND d.id IS NULL
ON CONFLICT DO NOTHING
RETURNING id, name;

-- Create onboarding checklists for the newly created drivers
INSERT INTO onboarding_checklist (driver_id)
SELECT d.id
FROM drivers d
LEFT JOIN onboarding_checklist oc ON oc.driver_id = d.id
WHERE oc.id IS NULL
AND d.license_number = 'PENDING';
