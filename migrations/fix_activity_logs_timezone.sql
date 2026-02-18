-- Fix existing activity logs timestamps to Kenya time (UTC+3)
-- This adds 3 hours to all existing created_at timestamps that were stored without timezone info

-- First, let's check what we're working with
SELECT 
  id, 
  action, 
  created_at,
  created_at + INTERVAL '3 hours' as kenya_time
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- Update all activity_logs to add 3 hours (Kenya timezone offset)
-- Only run this ONCE, or the timestamps will keep shifting!
UPDATE activity_logs 
SET created_at = created_at + INTERVAL '3 hours'
WHERE created_at < '2026-02-19';  -- Safety check to avoid running twice

-- Verify the update
SELECT 
  id, 
  action, 
  created_at as updated_timestamp
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 10;
