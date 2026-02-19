-- Add "Other" service type (only if it doesn't exist)
INSERT INTO service_types (name, description, interval_km, interval_days, estimated_cost)
SELECT 'Other', 'Custom/other maintenance service', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM service_types WHERE name = 'Other');
