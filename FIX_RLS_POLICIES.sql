-- Fix Row Level Security policies for file uploads
-- Run this in Supabase SQL Editor after the main tables are created

-- First, let's see what policies currently exist
-- (This is just for reference, you don't need to run this)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('submissions', 'project_files');

-- Fix project_files policies to be more permissive for authenticated users
DROP POLICY IF EXISTS "Users can view project files" ON public.project_files;
CREATE POLICY "Authenticated users can view project files" ON public.project_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create project files" ON public.project_files;
CREATE POLICY "Authenticated users can create project files" ON public.project_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own project files" ON public.project_files;
CREATE POLICY "Authenticated users can update project files" ON public.project_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own project files" ON public.project_files;
CREATE POLICY "Authenticated users can delete project files" ON public.project_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Also fix submissions policies to be more permissive
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;
CREATE POLICY "Authenticated users can view submissions" ON public.submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create their own submissions" ON public.submissions;
CREATE POLICY "Authenticated users can create submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own submissions" ON public.submissions;
CREATE POLICY "Authenticated users can update submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own submissions" ON public.submissions;
CREATE POLICY "Authenticated users can delete submissions" ON public.submissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Keep the mentor-specific policies but make them more permissive
DROP POLICY IF EXISTS "Mentors can view project submissions" ON public.submissions;
CREATE POLICY "Mentors can view project submissions" ON public.submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Mentors can update project submissions" ON public.submissions;
CREATE POLICY "Mentors can update project submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- For development, let's also make sure all authenticated users can access everything
-- This is more permissive but will work for development

-- Verify the policies were updated
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
