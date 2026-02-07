-- Storage Policies for Documents Bucket
-- Run this in Supabase SQL Editor

-- Policy 1: Allow anyone to upload to documents bucket
CREATE POLICY "Allow public uploads to documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Policy 2: Allow anyone to read from documents bucket
CREATE POLICY "Allow public reads from documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy 3: Allow anyone to update files in documents bucket
CREATE POLICY "Allow public updates to documents"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'documents');

-- Policy 4: Allow anyone to delete from documents bucket
CREATE POLICY "Allow public deletes from documents"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'documents');
