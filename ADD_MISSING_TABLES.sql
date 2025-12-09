-- Add missing tables for MenteeDashboard functionality
-- Run this in Supabase SQL Editor

-- Add roles field to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';  -- Add roles array field

-- Create submissions table
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

-- Create project_files table
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

-- Create project_team_members table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_in_project TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id),
  UNIQUE(project_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for submissions (with IF NOT EXISTS handling)
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;
CREATE POLICY "Users can view their own submissions" ON public.submissions
  FOR SELECT USING (mentee_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own submissions" ON public.submissions;
CREATE POLICY "Users can create their own submissions" ON public.submissions
  FOR INSERT WITH CHECK (mentee_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own submissions" ON public.submissions;
CREATE POLICY "Users can update their own submissions" ON public.submissions
  FOR UPDATE USING (mentee_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own submissions" ON public.submissions;
CREATE POLICY "Users can delete their own submissions" ON public.submissions
  FOR DELETE USING (mentee_id = auth.uid());

-- Mentors can view submissions for their projects
DROP POLICY IF EXISTS "Mentors can view project submissions" ON public.submissions;
CREATE POLICY "Mentors can view project submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND mentor_id = auth.uid()
    )
  );

-- Mentors can update submissions for their projects
DROP POLICY IF EXISTS "Mentors can update project submissions" ON public.submissions;
CREATE POLICY "Mentors can update project submissions" ON public.submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND mentor_id = auth.uid()
    )
  );

-- Create RLS policies for project_files (with IF NOT EXISTS handling)
DROP POLICY IF EXISTS "Users can view project files" ON public.project_files;
CREATE POLICY "Users can view project files" ON public.project_files
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND mentor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create project files" ON public.project_files;
CREATE POLICY "Users can create project files" ON public.project_files
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own project files" ON public.project_files;
CREATE POLICY "Users can update their own project files" ON public.project_files
  FOR UPDATE USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own project files" ON public.project_files;
CREATE POLICY "Users can delete their own project files" ON public.project_files
  FOR DELETE USING (uploaded_by = auth.uid());

-- Create RLS policies for project_team_members (with IF NOT EXISTS handling)
DROP POLICY IF EXISTS "Anyone can view project team members" ON public.project_team_members;
CREATE POLICY "Anyone can view project team members" ON public.project_team_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can join teams" ON public.project_team_members;
CREATE POLICY "Authenticated users can join teams" ON public.project_team_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Team members and mentors can update" ON public.project_team_members;
CREATE POLICY "Team members and mentors can update" ON public.project_team_members
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_mentee_id ON public.submissions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_submissions_stage_key ON public.submissions(stage_key);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON public.project_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_team_members_project_id ON public.project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.project_team_members(user_id);

-- Grant permissions
GRANT ALL ON public.submissions TO authenticated;
GRANT ALL ON public.project_files TO authenticated;
GRANT ALL ON public.project_team_members TO authenticated;

-- Insert some test data for development
DO $$
BEGIN
  -- Create a test project if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.projects LIMIT 1) THEN
    INSERT INTO public.projects (
      id,
      project_name,
      project_details,
      domain,
      mentor_id,
      mentor_email,
      mentees,
      assigned_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'Test Project for Dashboard',
      'This is a test project to demonstrate the mentee dashboard functionality.',
      'Web Development',
      NULL,
      'mentor@git-india.edu.in',
      ARRAY['b519abb3-842d-4b43-84e3-52a369b94a19'],
      NULL,
      NOW()
    );
  END IF;
END $$;

-- Verify tables were created
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('submissions', 'project_files', 'project_team_members')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;