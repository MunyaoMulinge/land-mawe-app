-- Trailers Module Migration
-- This adds trailer management capability to the system

-- Create trailers table
CREATE TABLE IF NOT EXISTS trailers (
  id SERIAL PRIMARY KEY,
  trailer_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('flatbed', 'enclosed', 'refrigerated', 'tanker', 'lowboy', 'car_carrier', 'other')),
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  capacity_kg INTEGER, -- Weight capacity in kg
  capacity_volume VARCHAR(50), -- Volume capacity (e.g., "40ft", "20cbm")
  chassis_number VARCHAR(100) UNIQUE,
  registration_number VARCHAR(50),
  current_truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  current_mileage INTEGER DEFAULT 0,
  last_service_date DATE,
  last_service_mileage INTEGER,
  next_service_date DATE,
  next_service_mileage INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trailer maintenance records (separate from truck maintenance)
CREATE TABLE IF NOT EXISTS trailer_maintenance (
  id SERIAL PRIMARY KEY,
  trailer_id INTEGER REFERENCES trailers(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  mileage_at_service INTEGER,
  cost DECIMAL(10,2),
  vendor_name VARCHAR(200),
  vendor_contact VARCHAR(100),
  invoice_number VARCHAR(100),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  next_service_date DATE,
  next_service_mileage INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trailer assignment history (track which truck had which trailer when)
CREATE TABLE IF NOT EXISTS trailer_assignments (
  id SERIAL PRIMARY KEY,
  trailer_id INTEGER REFERENCES trailers(id) ON DELETE CASCADE,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  unassigned_date TIMESTAMP,
  unassigned_by INTEGER REFERENCES users(id),
  notes TEXT
);

-- Add trailer_id to job_cards (optional link)
ALTER TABLE job_cards 
ADD COLUMN IF NOT EXISTS trailer_id INTEGER REFERENCES trailers(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trailers_status ON trailers(status);
CREATE INDEX IF NOT EXISTS idx_trailers_truck ON trailers(current_truck_id);
CREATE INDEX IF NOT EXISTS idx_trailers_type ON trailers(type);
CREATE INDEX IF NOT EXISTS idx_trailer_maintenance_trailer ON trailer_maintenance(trailer_id);
CREATE INDEX IF NOT EXISTS idx_trailer_assignments_trailer ON trailer_assignments(trailer_id);
CREATE INDEX IF NOT EXISTS idx_trailer_assignments_truck ON trailer_assignments(truck_id);

-- Comments for documentation
COMMENT ON TABLE trailers IS 'Stores all trailer information including assignment to trucks';
COMMENT ON TABLE trailer_maintenance IS 'Maintenance records specific to trailers';
COMMENT ON TABLE trailer_assignments IS 'Historical record of trailer assignments to trucks';
