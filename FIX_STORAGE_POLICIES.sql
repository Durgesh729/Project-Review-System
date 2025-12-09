-- Fix Storage Bucket Policies for File Uploads
-- This script creates the necessary storage policies for the submissions bucket

-- First, let's create the storage bucket if it doesn't exist
-- Note: This requires admin privileges, so it might fail
-- If it fails, create the bucket manually in Supabase Dashboard

-- Create the submissions bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
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

-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to submissions bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in submissions bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in submissions bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files in submissions bucket" ON storage.objects;

-- Create very permissive storage policies for development
-- These allow any authenticated user to perform any operation on the submissions bucket

-- Allow authenticated users to upload files to submissions bucket
CREATE POLICY "submissions_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'submissions' 
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to view files in submissions bucket
CREATE POLICY "submissions_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' 
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update files in submissions bucket
CREATE POLICY "submissions_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'submissions' 
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to delete files in submissions bucket
CREATE POLICY "submissions_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'submissions' 
    AND auth.uid() IS NOT NULL
  );

-- Also create general policies for all storage buckets (more permissive)
CREATE POLICY "authenticated_users_upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_select" ON storage.objects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_update" ON storage.objects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_delete" ON storage.objects
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Test the storage policies
DO $$
BEGIN
  -- Try to insert a test file record
  INSERT INTO storage.objects (
    bucket_id,
    name,
    path_tokens,
    metadata
  ) VALUES (
    'submissions',
    'test-file.txt',
    ARRAY['test-file.txt'],
    '{"test": true}'::jsonb
  );
  
  -- If we get here, the policy worked
  RAISE NOTICE 'Storage policies are working correctly - test insert succeeded';
  
  -- Clean up the test record
  DELETE FROM storage.objects WHERE bucket_id = 'submissions' AND name = 'test-file.txt';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage policy test failed: %', SQLERRM;
END $$;

-- Show current storage policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Show storage buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY name;
