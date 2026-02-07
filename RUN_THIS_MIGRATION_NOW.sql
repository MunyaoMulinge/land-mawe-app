-- ============================================
-- MIGRATION 011: Document Upload Support
-- RUN THIS IN SUPABASE SQL EDITOR NOW!
-- ============================================

-- Add document upload columns
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_filename VARCHAR(255);
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_size INTEGER;
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Make fields optional for quick document upload
ALTER TABLE truck_documents ALTER COLUMN expiry_date DROP NOT NULL;
ALTER TABLE truck_documents ALTER COLUMN truck_id DROP NOT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_truck_documents_url ON truck_documents(document_url) WHERE document_url IS NOT NULL;

-- Add comments
COMMENT ON COLUMN truck_documents.document_url IS 'URL or path to uploaded document file (PDF, image, etc.)';
COMMENT ON COLUMN truck_documents.document_filename IS 'Original filename of uploaded document';
COMMENT ON COLUMN truck_documents.document_size IS 'File size in bytes';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'truck_documents' 
AND column_name IN ('document_url', 'document_filename', 'document_size', 'uploaded_at', 'expiry_date', 'truck_id')
ORDER BY column_name;
