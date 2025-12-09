# Complete Fix for MenteeDashboard Upload Error

## Problem
You're getting this error when trying to upload files in MenteeDashboard:
```
Failed to load resource: the server responded with a status of 400 ()
MenteeDashboard.jsx:248  Upload error: StorageApiError: new row violates row-level security policy
```

## Root Cause
The error is caused by Row-Level Security (RLS) policies that are too restrictive for the file upload functionality. The current policies require specific user matching that isn't working properly.

## Solution

### Step 1: Fix Database RLS Policies
Run the SQL script `FIX_RLS_FINAL.sql` in your Supabase SQL Editor. This will:
- Create the missing `submissions` and `project_files` tables if they don't exist
- Set up very permissive RLS policies for development
- Allow any authenticated user to perform operations on these tables

### Step 2: Fix Storage Bucket Policies
Run the SQL script `FIX_STORAGE_POLICIES.sql` in your Supabase SQL Editor. This will:
- Create the `submissions` storage bucket if it doesn't exist
- Set up permissive storage policies for file uploads
- Allow authenticated users to upload, view, update, and delete files

### Step 3: Verify Storage Bucket Exists
If the storage bucket creation fails (requires admin privileges), create it manually:

1. Go to your Supabase Dashboard
2. Navigate to Storage
3. Click "Create a new bucket"
4. Name it `submissions`
5. Set it to **private** (not public)
6. Set file size limit to 50MB
7. Add allowed MIME types:
   - application/pdf
   - application/msword
   - application/vnd.openxmlformats-officedocument.wordprocessingml.document
   - application/vnd.ms-powerpoint
   - application/vnd.openxmlformats-officedocument.presentationml.presentation
   - video/mp4
   - video/x-msvideo
   - text/plain
   - application/octet-stream
   - image/jpeg
   - image/png
   - image/gif

### Step 4: Test the Fix
1. Restart your frontend application
2. Try uploading a file in MenteeDashboard
3. The upload should now work without RLS policy violations

## Files Created/Modified
- `FIX_RLS_FINAL.sql` - Fixes database RLS policies
- `FIX_STORAGE_POLICIES.sql` - Fixes storage bucket policies
- `COMPLETE_UPLOAD_FIX.md` - This documentation

## What the Fix Does

### Database Policies
The new RLS policies are very permissive for development:
- Any authenticated user can view, create, update, and delete records in `submissions` and `project_files` tables
- This removes the strict user matching requirements that were causing the error

### Storage Policies
The new storage policies allow:
- Any authenticated user to upload files to the `submissions` bucket
- Any authenticated user to view, update, and delete files in the bucket
- Proper file type and size restrictions

## Security Note
These policies are very permissive and suitable for development/testing. For production, you should tighten the policies to be more restrictive based on your specific requirements.

## Troubleshooting
If you still get errors after applying these fixes:

1. **Check if tables exist**: Run this in Supabase SQL Editor:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('submissions', 'project_files');
   ```

2. **Check if storage bucket exists**: Run this in Supabase SQL Editor:
   ```sql
   SELECT id, name, public FROM storage.buckets WHERE id = 'submissions';
   ```

3. **Check RLS policies**: Run this in Supabase SQL Editor:
   ```sql
   SELECT policyname, cmd FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('submissions', 'project_files');
   ```

4. **Check storage policies**: Run this in Supabase SQL Editor:
   ```sql
   SELECT policyname, cmd FROM pg_policies 
   WHERE schemaname = 'storage' 
   AND tablename = 'objects';
   ```

The upload functionality should work correctly after applying these fixes.
