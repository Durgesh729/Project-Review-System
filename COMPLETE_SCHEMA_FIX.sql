-- Complete Schema Fix for Project Management System
-- Run this in Supabase SQL Editor to add missing fields

-- Add missing fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';  -- Add roles array field

-- Add missing fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS "githubRepo" TEXT,
ADD COLUMN IF NOT EXISTS "mentorEmail" TEXT,
ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Alternative field names for compatibility
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS github_repo TEXT,
ADD COLUMN IF NOT EXISTS mentor_email TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Update existing projects to have proper timestamps
UPDATE public.projects 
SET "createdAt" = created_at 
WHERE "createdAt" IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects("createdBy");
CREATE INDEX IF NOT EXISTS idx_projects_mentor_id ON public.projects(mentor_id);
CREATE INDEX IF NOT EXISTS idx_projects_mentor_email ON public.projects("mentorEmail");
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for projects table
CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Mentees can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() = "createdBy" OR auth.uid() = created_by
  );

CREATE POLICY "Project creators can update their projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = "createdBy" OR auth.uid() = created_by
  );

CREATE POLICY "Project creators can delete their projects" ON public.projects
  FOR DELETE USING (
    auth.uid() = "createdBy" OR auth.uid() = created_by
  );

-- RLS Policies for project team members
CREATE POLICY "Anyone can view team members" ON public.project_team_members
  FOR SELECT USING (true);

CREATE POLICY "Project creators can manage team members" ON public.project_team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id 
      AND (auth.uid() = "createdBy" OR auth.uid() = created_by)
    )
  );

-- Create a view for easier project queries with joined data
CREATE OR REPLACE VIEW public.project_details AS
SELECT 
  p.*,
  creator.name as creator_name,
  creator.email as creator_email,
  mentor.name as mentor_name,
  mentor.email as mentor_email_full,
  COUNT(ptm.id) as team_count
FROM public.projects p
LEFT JOIN public.users creator ON (p."createdBy" = creator.id OR p.created_by = creator.id)
LEFT JOIN public.users mentor ON p.mentor_id = mentor.id
LEFT JOIN public.project_team_members ptm ON p.id = ptm.project_id
GROUP BY p.id, creator.id, creator.name, creator.email, mentor.id, mentor.name, mentor.email;

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.project_team_members TO authenticated;
GRANT SELECT ON public.project_details TO authenticated;

-- Insert test data if tables are empty
DO $$
BEGIN
  -- Check if we have any users, if not create test users
  IF NOT EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
    -- Create test users
    INSERT INTO public.users (id, name, email, role, "isVerified") VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Mentee', 'mentee@git-india.edu.in', 'mentee', true),
    ('22222222-2222-2222-2222-222222222222', 'Test Mentor', 'mentor@git-india.edu.in', 'mentor', true),
    ('33333333-3333-3333-3333-333333333333', 'Test HOD', 'hod@git-india.edu.in', 'hod', true)
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;

-- Verify the schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
w