# Supabase Storage Setup for Document Uploads

## ⚠️ IMPORTANT: Setup Required Before Deployment

You need to create a storage bucket in Supabase before the document upload feature will work.

---

## Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `fipbfnjzaamjayzqvlvg`
3. Click on **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name**: `documents`
   - **Public bucket**: ✅ **Check this** (so documents can be viewed via URL)
   - **File size limit**: 10 MB (optional)
   - **Allowed MIME types**: Leave empty or add: `application/pdf,image/jpeg,image/png`
6. Click **"Create bucket"**

---

## Step 2: Set Storage Policies (Optional but Recommended)

By default, public buckets allow anyone to read files. You can add policies for upload restrictions:

### Policy 1: Allow Authenticated Users to Upload
```sql
-- Go to Storage > documents bucket > Policies > New Policy

-- Policy Name: Allow authenticated uploads
-- Policy Definition:
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');
```

### Policy 2: Allow Public Read Access
```sql
-- Policy Name: Allow public read
-- Policy Definition:
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
```

### Policy 3: Allow Authenticated Users to Delete Their Uploads
```sql
-- Policy Name: Allow authenticated delete
-- Policy Definition:
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

---

## Step 3: Verify Setup

After creating the bucket, test it:

1. Go to **Storage** > **documents** bucket
2. Try uploading a test file manually
3. Click on the file and copy the public URL
4. Open the URL in a new tab - you should see the file

---

## Step 4: Deploy Your Code

Now you can safely deploy:

```bash
cd server && npm install
cd ..
git add .
git commit -m "Add Supabase Storage for document uploads"
git push
vercel --prod
```

---

## How It Works:

### Upload Flow:
1. User selects file in Compliance form
2. File is sent to `/api/upload-document` endpoint
3. Server uploads file to Supabase Storage bucket `documents`
4. File is stored at path: `compliance-documents/{truck_id}/{timestamp}-{random}.{ext}`
5. Server returns public URL
6. Document record is created with the URL

### File Structure in Supabase Storage:
```
documents/
├── compliance-documents/
│   ├── 1/                    (truck_id)
│   │   ├── 1738483200000-123456789.pdf
│   │   └── 1738483300000-987654321.jpg
│   ├── 2/
│   │   └── 1738483400000-456789123.pdf
│   └── general/              (if no truck_id)
│       └── 1738483500000-789123456.png
```

### Public URLs:
Files will be accessible at:
```
https://fipbfnjzaamjayzqvlvg.supabase.co/storage/v1/object/public/documents/compliance-documents/1/1738483200000-123456789.pdf
```

---

## Benefits of Supabase Storage:

✅ **Works on Vercel** - No file system needed
✅ **Persistent** - Files don't disappear between deployments
✅ **CDN** - Fast global delivery
✅ **Scalable** - No storage limits on your server
✅ **Secure** - Built-in access control with RLS policies
✅ **Free Tier** - 1GB storage included

---

## Troubleshooting:

### Error: "Bucket not found"
- Make sure you created the bucket named exactly `documents`
- Check bucket is public

### Error: "Permission denied"
- Check storage policies are set correctly
- Make sure bucket is public or policies allow access

### Error: "File too large"
- Default limit is 10MB in code
- Check Supabase bucket settings for size limits

### Files not accessible
- Verify bucket is set to **Public**
- Check the public URL format is correct
- Try accessing the file URL directly in browser

---

## Cost Considerations:

Supabase Free Tier includes:
- **1 GB storage**
- **2 GB bandwidth per month**

For production with many documents, consider:
- Upgrading to Pro plan ($25/month) for 100GB storage
- Monitoring storage usage in Supabase dashboard

---

## Next Steps After Setup:

1. ✅ Create `documents` bucket in Supabase
2. ✅ Set bucket to Public
3. ✅ (Optional) Add storage policies
4. ✅ Run migration 011 in Supabase SQL Editor
5. ✅ Install multer: `cd server && npm install`
6. ✅ Deploy to Vercel
7. ✅ Test document upload in production

---

## Summary:

**Before you can deploy and use document uploads, you MUST:**
1. Create the `documents` storage bucket in Supabase
2. Make it public
3. Run the database migration

**Then the feature will work perfectly on Vercel!**
