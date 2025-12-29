-- Migration: Fuel Management Module
-- Run this in Supabase SQL Editor

-- Fuel Records table
CREATE TABLE IF NOT EXISTS fuel_records (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  job_card_id INTEGER REFERENCES job_cards(id) ON DELETE SET NULL,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Fuel details
  fuel_date DATE NOT NULL,
  quantity_liters DECIMAL(10,2) NOT NULL,
  cost_per_liter DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  
  -- Station info
  fuel_station VARCHAR(200),
  station_location VARCHAR(200),
  receipt_number VARCHAR(100),
  
  -- Mileage at fill
  odometer_reading INTEGER,
  
  -- Fuel type
  fuel_type VARCHAR(20) DEFAULT 'diesel' CHECK (fuel_type IN ('diesel', 'petrol', 'gas')),
  
  -- Payment
  payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mpesa', 'credit', 'fuel_card')),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add current_mileage to trucks table for tracking
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS current_mileage INTEGER DEFAULT 0;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS fuel_efficiency DECIMAL(5,2); -- km per liter

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fuel_records_truck_id ON fuel_records(truck_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_fuel_date ON fuel_records(fuel_date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_job_card_id ON fuel_records(job_card_id);

-- View for fuel consumption analysis
CREATE OR REPLACE VIEW fuel_consumption_summary AS
SELECT 
  t.id as truck_id,
  t.plate_number,
  t.model,
  COUNT(f.id) as total_refills,
  COALESCE(SUM(f.quantity_liters), 0) as total_liters,
  COALESCE(SUM(f.total_cost), 0) as total_cost,
  COALESCE(AVG(f.cost_per_liter), 0) as avg_cost_per_liter,
  MAX(f.fuel_date) as last_refill_date
FROM trucks t
LEFT JOIN fuel_records f ON t.id = f.truck_id
GROUP BY t.id, t.plate_number, t.model;
