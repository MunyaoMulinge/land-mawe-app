-- Migration: Equipment Management Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  location VARCHAR(200),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);

COMMENT ON TABLE equipment IS 'Equipment inventory management';

