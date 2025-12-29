-- Migration: Job Cards & Pre-Departure Checklist
-- Run this in Supabase SQL Editor

-- Job Cards table
CREATE TABLE IF NOT EXISTS job_cards (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Job details
  job_number VARCHAR(50) UNIQUE NOT NULL,
  departure_date DATE NOT NULL,
  destination VARCHAR(200),
  purpose VARCHAR(500),
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'departed', 'completed', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  departed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Notes
  notes TEXT,
  return_notes TEXT
);

-- Pre-departure checklist items
CREATE TABLE IF NOT EXISTS job_card_checklist (
  id SERIAL PRIMARY KEY,
  job_card_id INTEGER REFERENCES job_cards(id) ON DELETE CASCADE,
  
  -- Equipment checks
  screens_count INTEGER DEFAULT 0,
  screens_condition VARCHAR(20) DEFAULT 'not_checked' CHECK (screens_condition IN ('not_checked', 'good', 'damaged', 'missing')),
  speakers_count INTEGER DEFAULT 0,
  speakers_condition VARCHAR(20) DEFAULT 'not_checked' CHECK (speakers_condition IN ('not_checked', 'good', 'damaged', 'missing')),
  
  -- Tools & Accessories
  tools_present BOOLEAN DEFAULT FALSE,
  tools_list TEXT,
  accessories_present BOOLEAN DEFAULT FALSE,
  accessories_list TEXT,
  
  -- Safety Equipment
  fire_extinguisher BOOLEAN DEFAULT FALSE,
  first_aid_kit BOOLEAN DEFAULT FALSE,
  warning_triangles BOOLEAN DEFAULT FALSE,
  reflective_jacket BOOLEAN DEFAULT FALSE,
  spare_wheel BOOLEAN DEFAULT FALSE,
  jack_and_tools BOOLEAN DEFAULT FALSE,
  
  -- Vehicle Condition
  tires_condition VARCHAR(20) DEFAULT 'not_checked' CHECK (tires_condition IN ('not_checked', 'good', 'fair', 'poor')),
  lights_working BOOLEAN DEFAULT FALSE,
  brakes_condition VARCHAR(20) DEFAULT 'not_checked' CHECK (brakes_condition IN ('not_checked', 'good', 'fair', 'poor')),
  oil_level VARCHAR(20) DEFAULT 'not_checked' CHECK (oil_level IN ('not_checked', 'full', 'low', 'critical')),
  fuel_level VARCHAR(20) DEFAULT 'not_checked' CHECK (fuel_level IN ('not_checked', 'full', 'half', 'quarter', 'empty')),
  coolant_level VARCHAR(20) DEFAULT 'not_checked' CHECK (coolant_level IN ('not_checked', 'full', 'low', 'critical')),
  
  -- Mileage
  departure_mileage INTEGER,
  return_mileage INTEGER,
  
  -- Inspection details
  inspected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  inspected_at TIMESTAMP,
  inspection_notes TEXT,
  
  -- Return inspection
  return_inspected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  return_inspected_at TIMESTAMP,
  return_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_cards_truck_id ON job_cards(truck_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_driver_id ON job_cards(driver_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_departure_date ON job_cards(departure_date);
CREATE INDEX IF NOT EXISTS idx_job_card_checklist_job_card_id ON job_card_checklist(job_card_id);

-- Function to generate job number
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.job_number := 'JC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate job number (drop if exists first)
DROP TRIGGER IF EXISTS set_job_number ON job_cards;
CREATE TRIGGER set_job_number
  BEFORE INSERT ON job_cards
  FOR EACH ROW
  WHEN (NEW.job_number IS NULL OR NEW.job_number = '')
  EXECUTE FUNCTION generate_job_number();
