# Deployment Checklist - Document Upload Feature

## ✅ Pre-Deployment Steps (DO THESE FIRST!)

### 1. Setup Supabase Storage Bucket
**CRITICAL: Do this before deploying!**

1. Go to https://supabase.com/dashboard
2. Select project: `fipbfnjzaamjayzqvlvg`
3. Click **Storage** in sidebar
4. Click **"New bucket"**
5. Name: `documents`
6. ✅ Check **"Public bucket"**
7. Click **"Create bucket"**

### 2. Run Database Migration
In Supabase SQL Editor, run:
```sql
-- Copy and paste contents of migrations/011_document_upload.sql
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_filename VARCHAR(255);
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS document_size INTEGER;
ALTER TABLE truck_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### 3. Install Dependencies
```bash
cd server
npm install
cd ..
```

---

## 🚀 Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "Add document upload with Supabase Storage"
git push
```

### 2. Deploy to Vercel
```bash
vercel --prod
```

---

## ✅ Post-Deployment Testing

### 1. Test Document Upload
1. Login as admin/superadmin
2. Go to **Compliance** tab
3. Click **"All Documents"**
4. Click **"+ Add Document"**
5. Fill in details
6. Click **"Upload Document"** and select a PDF/JPG/PNG
7. Click **"💾 Save Document"**
8. Should see success and document in list

### 2. Test Document Viewing
1. Find document with uploaded file
2. Click **"📄 View"** button
3. Document should open in new tab
4. URL should be: `https://fipbfnjzaamjayzqvlvg.supabase.co/storage/v1/object/public/documents/...`

### 3. Test File Validation
1. Try uploading file > 10MB (should fail)
2. Try uploading .txt or .doc file (should fail)
3. Try uploading without file (should work - file is optional)

---

## 🐛 Troubleshooting

### "Bucket not found" error
- ❌ You didn't create the storage bucket
- ✅ Go to Supabase and create `documents` bucket

### "Permission denied" error
- ❌ Bucket is not public
- ✅ Edit bucket settings and check "Public bucket"

### "Column does not exist" error
- ❌ Migration not run
- ✅ Run migration 011 in Supabase SQL Editor

### Upload works but can't view file
- ❌ Bucket is not public
- ✅ Make bucket public in Supabase Storage settings

---

## 📊 What Changed

### Files Modified:
- ✅ `server/index.js` - Updated upload endpoint to use Supabase Storage
- ✅ `server/package.json` - Added multer dependency
- ✅ `client/src/components/Compliance.jsx` - Added file upload UI
- ✅ `migrations/011_document_upload.sql` - Added document_url columns

### New Features:
- ✅ Upload PDF, JPG, PNG files (max 10MB)
- ✅ Files stored in Supabase Storage (persistent)
- ✅ View uploaded documents via public URL
- ✅ File preview before upload
- ✅ Upload progress indicator
- ✅ Works on Vercel production

---

## 🎯 Summary

**YES, it will work on Vercel after you:**
1. ✅ Create `documents` storage bucket in Supabase (public)
2. ✅ Run migration 011
3. ✅ Install multer (`cd server && npm install`)
4. ✅ Deploy

**The feature uses Supabase Storage, not local file system, so it's production-ready for Vercel!**
