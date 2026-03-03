-- Migration: Quotations Module
-- Run this in Supabase SQL Editor

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Client
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Related records
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Dates
  quotation_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  -- Amounts
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 16,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Status: draft, sent, accepted, rejected, expired, converted
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  
  -- If converted to invoice
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Details
  notes TEXT,
  terms TEXT,
  
  -- Tracking
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP,
  accepted_at TIMESTAMP,
  converted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotation line items
CREATE TABLE IF NOT EXISTS quotation_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  
  truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- Permissions
INSERT INTO permissions (module, action, description) VALUES
('quotations', 'view', 'View quotations'),
('quotations', 'create', 'Create quotations'),
('quotations', 'edit', 'Edit quotations'),
('quotations', 'delete', 'Delete quotations'),
('quotations', 'convert', 'Convert quotation to invoice')
ON CONFLICT (module, action) DO NOTHING;

-- Grant quotation permissions to finance role
INSERT INTO role_permissions (role, permission_id)
SELECT 'finance', id FROM permissions WHERE module = 'quotations'
ON CONFLICT DO NOTHING;

-- Grant quotation permissions to admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE module = 'quotations'
ON CONFLICT DO NOTHING;

-- Grant quotation permissions to superadmin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'superadmin', id FROM permissions WHERE module = 'quotations'
ON CONFLICT DO NOTHING;

-- Grant view to staff
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions WHERE module = 'quotations' AND action = 'view'
ON CONFLICT DO NOTHING;
