-- Add GPS tracking columns to fuel_records table
-- This helps prevent fraud by capturing the driver's location

ALTER TABLE fuel_records
ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100),
ADD COLUMN IF NOT EXISTS gps_accuracy INTEGER,
ADD COLUMN IF NOT EXISTS gps_timestamp TIMESTAMP;

-- Add index for faster queries on GPS data
CREATE INDEX IF NOT EXISTS idx_fuel_gps ON fuel_records(gps_coordinates) WHERE gps_coordinates IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN fuel_records.gps_coordinates IS 'Latitude,Longitude captured from driver device';
COMMENT ON COLUMN fuel_records.gps_accuracy IS 'GPS accuracy in meters (lower is better)';
COMMENT ON COLUMN fuel_records.gps_timestamp IS 'When the GPS location was captured';
