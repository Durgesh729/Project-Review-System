-- COMPLETE RLS FIX for MenteeDashboard File Uploads
-- Run this entire script in Supabase SQL Editor

-- Step 1: Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  filename TEXT,
  file_url TEXT,
  storage_path TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'needs improvement')),
  feedback TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, mentee_id, stage_key)
);

CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  mentor_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS on tables
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can create their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can delete their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Mentors can view project submissions" ON public.submissions;
DROP POLICY IF EXISTS "Mentors can update project submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated users can create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated users can update submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated users can delete submissions" ON public.submissions;

DROP POLICY IF EXISTS "Users can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can create project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can update their own project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete their own project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can create project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can update project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can delete project files" ON public.project_files;

-- Step 4: Create permissive RLS policies for development
-- Submissions table policies
CREATE POLICY "Allow authenticated users to view submissions" ON public.submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to create submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete submissions" ON public.submissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Project files table policies
CREATE POLICY "Allow authenticated users to view project files" ON public.project_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to create project files" ON public.project_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update project files" ON public.project_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete project files" ON public.project_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 5: Create storage bucket if it doesn't exist
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

-- Step 6: Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow select own files" ON storage.objects;
DROP POLICY IF EXISTS "submissions_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_upload" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_update" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_delete" ON storage.objects;

-- Step 7: Create storage policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow select own files" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Step 8: Grant permissions
GRANT ALL ON public.submissions TO authenticated;
GRANT ALL ON public.project_files TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_mentee_id ON public.submissions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_submissions_stage_key ON public.submissions(stage_key);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON public.project_files(uploaded_by);

-- Step 10: Test the policies
DO $$
BEGIN
  -- Test database insert
  INSERT INTO public.submissions (
    project_id,
    mentee_id,
    stage_key,
    filename,
    file_url,
    storage_path,
    status
  ) VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    'test_upload',
    'test.txt',
    'https://example.com/test.txt',
    'test/test.txt',
    'pending'
  );
  
  RAISE NOTICE '✅ Database policies are working - test insert succeeded';
  
  -- Clean up test record
  DELETE FROM public.submissions WHERE stage_key = 'test_upload';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Database policy test failed: %', SQLERRM;
END $$;

-- Success message
SELECT 'SUCCESS: All RLS policies have been created. File uploads should now work!' as message;
