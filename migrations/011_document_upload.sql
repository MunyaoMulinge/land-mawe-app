-- Migration: Add Document Upload Support
-- Run this in Supabase SQL Editor

-- Add document_url column to store uploaded document file path/URL
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_filename VARCHAR(255);
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_size INTEGER; -- in bytes
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_truck_documents_url ON truck_documents(document_url) WHERE document_url IS NOT NULL;

-- Comment
COMMENT ON COLUMN truck_documents.document_url IS 'URL or path to uploaded document file (PDF, image, etc.)';
COMMENT ON COLUMN truck_documents.document_filename IS 'Original filename of uploaded document';
COMMENT ON COLUMN truck_documents.document_size IS 'File size in bytes';
