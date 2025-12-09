-- CREATE STORAGE BUCKET AND FIX VIEW FUNCTIONALITY
-- Run this in Supabase SQL Editor

-- Step 1: Create the submissions storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/x-msvideo',
    'text/plain',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow select own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "submissions_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_delete_policy" ON storage.objects;

-- Step 3: Create comprehensive storage policies
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to view files
CREATE POLICY "Allow select own files" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Additional permissive policies for development
CREATE POLICY "submissions_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

CREATE POLICY "submissions_select_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

CREATE POLICY "submissions_update_policy" ON storage.objects
  FOR UPDATE USING (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

CREATE POLICY "submissions_delete_policy" ON storage.objects
  FOR DELETE USING (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

-- Step 4: Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Step 5: Test the bucket creation
DO $$
BEGIN
  -- Check if bucket exists
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'submissions') THEN
    RAISE NOTICE '✅ Submissions bucket exists and is ready';
  ELSE
    RAISE NOTICE '❌ Submissions bucket creation failed';
  END IF;
END $$;

-- Step 6: Show bucket information
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  created_at
FROM storage.buckets 
WHERE id = 'submissions';

-- Step 7: Show storage policies
SELECT 
  policyname, 
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;
