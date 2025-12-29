-- Migration: Scheduled Maintenance & Service Management
-- Run this in Supabase SQL Editor

-- Service types/templates
CREATE TABLE IF NOT EXISTS service_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  interval_km INTEGER, -- Service every X km
  interval_days INTEGER, -- Service every X days
  estimated_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL,
  
  -- Service details
  service_date DATE NOT NULL,
  description TEXT NOT NULL,
  mileage_at_service INTEGER,
  
  -- Cost tracking
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Vendor/mechanic info
  vendor_name VARCHAR(200),
  vendor_contact VARCHAR(100),
  invoice_number VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Assignment
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Next service
  next_service_km INTEGER,
  next_service_date DATE,
  
  -- Notes & documents
  notes TEXT,
  documents TEXT[], -- Array of document URLs
  
  -- Timestamps
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance schedule (upcoming/planned)
CREATE TABLE IF NOT EXISTS maintenance_schedule (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL,
  
  -- Schedule details
  due_date DATE,
  due_mileage INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'due', 'overdue', 'completed')),
  
  -- Notification
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_date TIMESTAMP,
  
  -- Link to actual maintenance record when completed
  maintenance_record_id INTEGER REFERENCES maintenance_records(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add maintenance tracking fields to trucks
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS last_service_mileage INTEGER;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS next_service_mileage INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_records_truck_id ON maintenance_records(truck_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_service_date ON maintenance_records(service_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_truck_id ON maintenance_schedule(truck_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_status ON maintenance_schedule(status);

-- Insert default service types
INSERT INTO service_types (name, description, interval_km, interval_days, estimated_cost) VALUES
  ('Oil Change', 'Engine oil and filter replacement', 5000, 90, 5000),
  ('Tire Rotation', 'Rotate tires for even wear', 10000, 180, 2000),
  ('Brake Inspection', 'Check brake pads, rotors, and fluid', 15000, 180, 8000),
  ('Full Service', 'Complete vehicle inspection and service', 20000, 365, 25000),
  ('Air Filter', 'Replace engine air filter', 15000, 365, 3000),
  ('Transmission Service', 'Transmission fluid change', 50000, 730, 15000),
  ('Coolant Flush', 'Flush and replace coolant', 40000, 730, 6000),
  ('Battery Check', 'Test and clean battery terminals', NULL, 180, 1000)
ON CONFLICT DO NOTHING;
