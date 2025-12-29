-- Migration: Insurance & Compliance Tracking
-- Run this in Supabase SQL Editor

-- Document types
CREATE TABLE IF NOT EXISTS document_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- insurance, license, permit, inspection, other
  description TEXT,
  validity_days INTEGER, -- Default validity period
  is_mandatory BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 30, -- Days before expiry to send reminder
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Truck documents (insurance, licenses, permits, etc.)
CREATE TABLE IF NOT EXISTS truck_documents (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  document_type_id INTEGER REFERENCES document_types(id) ON DELETE SET NULL,
  
  -- Document details
  document_number VARCHAR(100),
  provider VARCHAR(200), -- Insurance company, licensing authority
  
  -- Dates
  issue_date DATE,
  expiry_date DATE NOT NULL,
  
  -- Cost
  cost DECIMAL(10,2),
  
  -- Coverage details (for insurance)
  coverage_amount DECIMAL(12,2),
  coverage_type VARCHAR(100), -- comprehensive, third_party, etc.
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending_renewal', 'cancelled')),
  
  -- Alerts
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_date TIMESTAMP,
  
  -- Notes & attachments
  notes TEXT,
  document_url TEXT, -- Link to uploaded document
  
  -- Tracking
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver documents (licenses, certifications)
CREATE TABLE IF NOT EXISTS driver_documents (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  document_type_id INTEGER REFERENCES document_types(id) ON DELETE SET NULL,
  
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE NOT NULL,
  issuing_authority VARCHAR(200),
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending_renewal', 'suspended')),
  
  notes TEXT,
  document_url TEXT,
  
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_truck_documents_truck_id ON truck_documents(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_documents_expiry ON truck_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_truck_documents_status ON truck_documents(status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expiry ON driver_documents(expiry_date);

-- Insert default document types
INSERT INTO document_types (name, category, description, validity_days, is_mandatory, reminder_days) VALUES
  ('Motor Insurance', 'insurance', 'Comprehensive or third-party vehicle insurance', 365, TRUE, 30),
  ('Road License', 'license', 'Annual road license/tax', 365, TRUE, 30),
  ('Inspection Certificate', 'inspection', 'Vehicle inspection/fitness certificate', 365, TRUE, 30),
  ('PSV License', 'license', 'Public Service Vehicle license', 365, FALSE, 30),
  ('Goods in Transit', 'insurance', 'Insurance for goods being transported', 365, FALSE, 30),
  ('Speed Governor Certificate', 'inspection', 'Speed limiter certification', 365, TRUE, 30),
  ('Fire Extinguisher Certificate', 'inspection', 'Fire safety equipment certification', 365, FALSE, 30),
  ('NTSA Compliance', 'license', 'National Transport and Safety Authority compliance', 365, TRUE, 30),
  ('Driving License', 'license', 'Driver''s license', 1095, TRUE, 60),
  ('PSV Badge', 'license', 'PSV driver badge', 365, FALSE, 30),
  ('Medical Certificate', 'inspection', 'Driver medical fitness certificate', 730, FALSE, 30),
  ('Good Conduct', 'other', 'Certificate of good conduct', 365, FALSE, 30)
ON CONFLICT DO NOTHING;
