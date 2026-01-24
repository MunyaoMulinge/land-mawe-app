-- Migration: Enhanced Job Cards to match client form
-- Run this in Supabase SQL Editor

-- Add new columns to job_cards table
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS client_name VARCHAR(200);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS event_start_date DATE;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS event_finish_date DATE;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS branding_in_house BOOLEAN DEFAULT FALSE;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS crew TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS team_lead VARCHAR(100);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS route TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS merchandise TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS vehicle_reg VARCHAR(50);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS kilometer INTEGER;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS fuel_gauge VARCHAR(20); -- 'reserve', 'quarter', 'half', 'full'
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS current_average DECIMAL(10,2);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS checked_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS damage_report TEXT;

-- Create equipment checklist table
CREATE TABLE IF NOT EXISTS job_card_equipment (
  id SERIAL PRIMARY KEY,
  job_card_id INTEGER REFERENCES job_cards(id) ON DELETE CASCADE,
  equipment_name VARCHAR(100) NOT NULL,
  equipment_type VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  returned BOOLEAN DEFAULT FALSE,
  return_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_job_card_equipment_job_card_id ON job_card_equipment(job_card_id);

-- Add predefined equipment types
COMMENT ON TABLE job_card_equipment IS 'Equipment checklist for job cards including generators, speakers, lights, etc.';

