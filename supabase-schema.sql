-- Land Mawe Database Schema for Supabase

-- Users table with role management
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trucks (
  id SERIAL PRIMARY KEY,
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  model VARCHAR(100) NOT NULL,
  capacity VARCHAR(50),
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  license_number VARCHAR(50) UNIQUE NOT NULL,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  license_verified BOOLEAN DEFAULT FALSE,
  medical_check BOOLEAN DEFAULT FALSE,
  safety_training BOOLEAN DEFAULT FALSE,
  vehicle_inspection BOOLEAN DEFAULT FALSE,
  insurance_verified BOOLEAN DEFAULT FALSE,
  contract_signed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  event_name VARCHAR(200) NOT NULL,
  location VARCHAR(200),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data for demo
INSERT INTO trucks (plate_number, model, capacity, status) VALUES
  ('KBZ 123A', 'Isuzu FRR', '5 tons', 'available'),
  ('KCA 456B', 'Mitsubishi Fuso', '7 tons', 'booked'),
  ('KDA 789C', 'Hino 500', '10 tons', 'available'),
  ('KBB 321D', 'Mercedes Actros', '15 tons', 'maintenance')
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO drivers (name, phone, license_number, onboarding_complete) VALUES
  ('John Kamau', '0722123456', 'DL001234', true),
  ('Peter Ochieng', '0733456789', 'DL005678', false),
  ('Mary Wanjiku', '0711789012', 'DL009012', true)
ON CONFLICT (license_number) DO NOTHING;

-- Insert sample checklist data
INSERT INTO onboarding_checklist (driver_id, license_verified, medical_check, safety_training, vehicle_inspection, insurance_verified, contract_signed) 
SELECT 1, true, true, true, true, true, true WHERE NOT EXISTS (SELECT 1 FROM onboarding_checklist WHERE driver_id = 1);

INSERT INTO onboarding_checklist (driver_id, license_verified, medical_check, safety_training, vehicle_inspection, insurance_verified, contract_signed) 
SELECT 2, true, false, false, false, false, false WHERE NOT EXISTS (SELECT 1 FROM onboarding_checklist WHERE driver_id = 2);

INSERT INTO onboarding_checklist (driver_id, license_verified, medical_check, safety_training, vehicle_inspection, insurance_verified, contract_signed) 
SELECT 3, true, true, true, true, true, true WHERE NOT EXISTS (SELECT 1 FROM onboarding_checklist WHERE driver_id = 3);

-- Sample booking
INSERT INTO bookings (truck_id, driver_id, event_name, location, start_date, end_date, status) VALUES
  (2, 1, 'Nairobi Tech Expo', 'KICC, Nairobi', '2024-01-15', '2024-01-17', 'confirmed')
ON CONFLICT DO NOTHING;