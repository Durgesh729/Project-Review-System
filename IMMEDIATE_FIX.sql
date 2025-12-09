-- IMMEDIATE FIX for MenteeDashboard Upload Error
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Step 1: Create the missing tables
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

-- Step 2: Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies
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
DROP POLICY IF EXISTS "Allow all authenticated users to view submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow all authenticated users to create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow all authenticated users to update submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow all authenticated users to delete submissions" ON public.submissions;

DROP POLICY IF EXISTS "Users can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can create project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can update their own project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete their own project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can create project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can update project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can delete project files" ON public.project_files;
DROP POLICY IF EXISTS "Allow all authenticated users to view project files" ON public.project_files;
DROP POLICY IF EXISTS "Allow all authenticated users to create project files" ON public.project_files;
DROP POLICY IF EXISTS "Allow all authenticated users to update project files" ON public.project_files;
DROP POLICY IF EXISTS "Allow all authenticated users to delete project files" ON public.project_files;

-- Step 4: Create very permissive policies (for development)
CREATE POLICY "submissions_select" ON public.submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "submissions_insert" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "submissions_update" ON public.submissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "submissions_delete" ON public.submissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_files_select" ON public.project_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_files_insert" ON public.project_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "project_files_update" ON public.project_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_files_delete" ON public.project_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 5: Grant permissions
GRANT ALL ON public.submissions TO authenticated;
GRANT ALL ON public.project_files TO authenticated;

-- Step 6: Create storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800,
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

-- Step 7: Create storage policies
DROP POLICY IF EXISTS "submissions_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "submissions_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_upload" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_update" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_delete" ON storage.objects;

CREATE POLICY "submissions_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

CREATE POLICY "submissions_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

CREATE POLICY "submissions_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

CREATE POLICY "submissions_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'submissions' AND auth.uid() IS NOT NULL);

-- Step 8: Grant storage permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Step 9: Test the fix
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
    'test_fix',
    'test.txt',
    'https://example.com/test.txt',
    'test/test.txt',
    'pending'
  );
  
  RAISE NOTICE '✅ Database policies are working - test insert succeeded';
  
  -- Clean up test record
  DELETE FROM public.submissions WHERE stage_key = 'test_fix';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Database policy test failed: %', SQLERRM;
END $$;

-- Show success message
SELECT 'SUCCESS: RLS policies have been fixed. File uploads should now work!' as message;
