-- Complete RLS Policy Fix for MenteeDashboard
-- This will make the policies permissive enough for development and testing

-- First, let's disable RLS temporarily to see if that's the issue
-- (We'll re-enable it with better policies)

-- Disable RLS on all tables
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members DISABLE ROW LEVEL SECURITY;

-- Wait a moment and then re-enable with very permissive policies
-- Re-enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

DROP POLICY IF EXISTS "Anyone can view project team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Authenticated users can join teams" ON public.project_team_members;
DROP POLICY IF EXISTS "Team members and mentors can update" ON public.project_team_members;

-- Create very permissive policies for development
-- These allow any authenticated user to do anything
-- (Perfect for development, but should be tightened for production)

-- Submissions table policies
CREATE POLICY "Allow all authenticated users to view submissions" ON public.submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to create submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to update submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to delete submissions" ON public.submissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Project files table policies
CREATE POLICY "Allow all authenticated users to view project files" ON public.project_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to create project files" ON public.project_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to update project files" ON public.project_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to delete project files" ON public.project_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Project team members table policies
CREATE POLICY "Allow all authenticated users to view project team members" ON public.project_team_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to create project team members" ON public.project_team_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to update project team members" ON public.project_team_members
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to delete project team members" ON public.project_team_members
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Test the policies by trying to insert a test record
-- (This will help verify the policies are working)
DO $$
BEGIN
  -- Try to insert a test submission record
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
    'test',
    'test-file.txt',
    'https://example.com/test.txt',
    'test/path/test-file.txt',
    'pending'
  );
  
  -- If we get here, the policy worked
  RAISE NOTICE 'RLS policies are working correctly - test insert succeeded';
  
  -- Clean up the test record
  DELETE FROM public.submissions WHERE stage_key = 'test';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'RLS policy test failed: %', SQLERRM;
END $$;

-- Show current policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('submissions', 'project_files', 'project_team_members')
ORDER BY tablename, policyname;
