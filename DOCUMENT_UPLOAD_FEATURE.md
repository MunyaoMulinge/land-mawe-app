# Document Upload Feature - Compliance Module

## Overview
Added document upload functionality to the Compliance module, allowing users to upload PDF, JPG, and PNG files for insurance documents, licenses, inspections, and permits.

---

## Changes Made:

### 1. Database Migration (`migrations/011_document_upload.sql`)
Added columns to `truck_documents` table:
- `document_url` (TEXT) - Stores file path/URL
- `document_filename` (VARCHAR 255) - Original filename
- `document_size` (INTEGER) - File size in bytes
- `uploaded_at` (TIMESTAMP) - Upload timestamp

**Action Required**: Run this migration in Supabase SQL Editor

---

### 2. Server Side (`server/index.js`)

#### New Upload Endpoint: `POST /api/upload-document`
- Accepts multipart/form-data with file upload
- Validates file types (PDF, JPG, PNG only)
- Max file size: 10MB
- Stores files in `uploads/documents/` directory
- Returns file URL, filename, and size

#### Updated Endpoint: `POST /api/truck-documents`
- Now accepts `document_url`, `document_filename`, `document_size` fields
- Stores file metadata in database

#### Static File Serving
- Added `app.use('/uploads', express.static('uploads'))` to serve uploaded files

#### Dependencies
- Added `multer` package for file upload handling

**Action Required**: Run `npm install` in server directory

---

### 3. Client Side (`client/src/components/Compliance.jsx`)

#### New Features:
1. **File Upload Input**
   - Added file input field in document form
   - Accepts PDF, JPG, PNG files
   - Shows file preview (name and size)

2. **Upload Progress**
   - Shows "⏳ Uploading..." during file upload
   - Disables submit button while uploading

3. **View Document Link**
   - Added "File" column to documents table
   - Shows "📄 View" button for documents with files
   - Opens document in new tab

4. **Two-Step Upload Process**
   - First uploads file to `/api/upload-document`
   - Then creates document record with file metadata

#### State Changes:
- Added `uploadingFile` state for upload progress
- Added `document_file` to form state

---

## User Experience:

### Adding a Document with File:
1. Click "+ Add Document"
2. Fill in document details
3. Click "Upload Document" and select file
4. See file preview with name and size
5. Click "💾 Save Document"
6. System uploads file first, then saves document

### Viewing Uploaded Documents:
1. Go to "All Documents" view
2. See "File" column with "📄 View" button
3. Click to open document in new tab

---

## File Storage:

Files are stored in: `server/uploads/documents/`
- Filename format: `{timestamp}-{random}-{originalname}`
- Example: `1738483200000-123456789-insurance-policy.pdf`

---

## Security Considerations:

1. **File Type Validation**: Only PDF, JPG, PNG allowed
2. **File Size Limit**: 10MB maximum
3. **User Authentication**: Requires `x-user-id` header
4. **Unique Filenames**: Prevents overwrites with timestamp + random suffix

---

## Testing Checklist:

- [ ] Run migration 011 in Supabase
- [ ] Run `npm install` in server directory
- [ ] Test uploading PDF file
- [ ] Test uploading JPG/PNG file
- [ ] Test file size limit (try >10MB)
- [ ] Test invalid file type (try .txt or .doc)
- [ ] Test viewing uploaded document
- [ ] Test creating document without file (optional)
- [ ] Verify files are stored in `uploads/documents/`
- [ ] Verify file URLs work in production

---

## Deployment Notes:

### Vercel Deployment:
⚠️ **Important**: Vercel's serverless functions are read-only. File uploads won't persist between deployments.

**Recommended Solutions**:
1. **Use Supabase Storage** (Recommended)
   - Replace file system storage with Supabase Storage API
   - Files persist across deployments
   - Built-in CDN and access control

2. **Use AWS S3 or Cloudinary**
   - External storage service
   - More reliable for production

3. **Keep Current Approach for Development Only**
   - Works fine locally
   - Not suitable for production on Vercel

### For Production (Supabase Storage):
Would need to update upload endpoint to use:
```javascript
const { data, error } = await supabase.storage
  .from('compliance-documents')
  .upload(`${truck_id}/${filename}`, file)
```

---

## Next Steps:

1. Run migration in Supabase
2. Install multer: `cd server && npm install`
3. Test locally
4. Consider migrating to Supabase Storage for production
5. Deploy and test

**Deploy Command**:
```bash
cd server && npm install
cd ..
git add .
git commit -m "Add document upload feature to compliance module"
git push
vercel --prod
```
