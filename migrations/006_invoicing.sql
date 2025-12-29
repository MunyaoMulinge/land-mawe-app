-- Migration: Invoice & Client Management
-- Run this in Supabase SQL Editor

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  
  -- Business details
  company_type VARCHAR(50), -- individual, company, government
  tax_pin VARCHAR(50), -- KRA PIN
  
  -- Payment terms
  payment_terms INTEGER DEFAULT 30, -- Days
  credit_limit DECIMAL(12,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Notes
  notes TEXT,
  
  -- Tracking
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Client
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Related records
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  job_card_id INTEGER REFERENCES job_cards(id) ON DELETE SET NULL,
  
  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Amounts
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 16, -- VAT percentage
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled')),
  
  -- Payment
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  payment_date DATE,
  
  -- Details
  notes TEXT,
  terms TEXT,
  
  -- Tracking
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  
  -- Optional references
  truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table (for tracking multiple payments)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYMM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 8) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '%';
  
  new_number := 'INV-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
