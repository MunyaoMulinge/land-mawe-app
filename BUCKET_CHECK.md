# Storage Bucket Check - MUST DO BEFORE UPLOAD WORKS

## ⚠️ ERROR: "Failed to upload document"

This error means the Supabase Storage bucket doesn't exist yet.

---

## ✅ SOLUTION: Create the Storage Bucket (2 minutes)

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/fipbfnjzaamjayzqvlvg
2. Click **Storage** in the left sidebar

### Step 2: Create Bucket
1. Click the green **"New bucket"** button
2. Fill in:
   - **Name**: `documents` (exactly this, lowercase)
   - **Public bucket**: ✅ **CHECK THIS BOX** (very important!)
   - **File size limit**: 10 (optional)
   - **Allowed MIME types**: Leave empty or add `application/pdf,image/jpeg,image/png`
3. Click **"Create bucket"**

### Step 3: Verify Bucket
1. You should see "documents" bucket in the list
2. Click on it to open
3. You should see an empty folder view
4. Try uploading a test file manually to verify it works

---

## 🔍 How to Check if Bucket Exists

### Option 1: Visual Check
- Go to Storage in Supabase
- Look for "documents" bucket in the list
- If you don't see it, create it!

### Option 2: Test Upload
- Try uploading a document in your app
- If you get "Bucket not found" error → Create the bucket
- If you get "Permission denied" error → Make bucket public

---

## 📋 Bucket Settings

**Correct Settings:**
```
Name: documents
Public: ✅ YES (checked)
File size limit: 10 MB
Allowed MIME types: (empty or specific types)
```

**Policies (Optional but Recommended):**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
```

---

## 🚀 After Creating Bucket

1. ✅ Bucket created and public
2. ✅ Try uploading document again in your app
3. ✅ Should work now!

---

## 🐛 Still Getting Errors?

### Error: "Bucket not found"
- **Cause**: Bucket doesn't exist or wrong name
- **Fix**: Create bucket named exactly `documents`

### Error: "Permission denied"
- **Cause**: Bucket is not public
- **Fix**: Edit bucket → Check "Public bucket"

### Error: "File too large"
- **Cause**: File > 10MB
- **Fix**: Use smaller file or increase limit

### Error: "Invalid file type"
- **Cause**: File is not PDF/JPG/PNG
- **Fix**: Use allowed file types only

---

## 📞 Quick Help

**Current Status:**
- ❌ Bucket NOT created (that's why you're getting 500 error)
- ⏳ Waiting for you to create it
- ✅ Code is ready and deployed

**What to Do:**
1. Create bucket (2 minutes)
2. Try upload again
3. Should work immediately!

---

## ✅ Checklist

- [ ] Go to Supabase Dashboard
- [ ] Click Storage
- [ ] Click "New bucket"
- [ ] Name: `documents`
- [ ] Check "Public bucket"
- [ ] Click "Create bucket"
- [ ] Try uploading document in app
- [ ] Success! 🎉
