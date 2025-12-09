-- Complete Supabase Schema for Project Management System (UPDATED)

-- Create users table with required schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'mentee',
  roles TEXT[] DEFAULT '{}',  -- Add roles array field
  "isVerified" BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT role_check CHECK (LOWER(role) IN ('pending', 'mentee', 'mentor', 'project_coordinator', 'hod'))
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  domain TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  mentor_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Create project team members table
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_in_project TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT feedback_status_check CHECK (status IN ('pending', 'in_progress', 'resolved'))
);

-- Create project assignments table for coordinators to assign projects
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  mentor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_name TEXT NOT NULL,
  mentor_email TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  UNIQUE(project_id)
);

-- Create project assignment mentees table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.project_assignment_mentees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.project_assignments(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mentee_name TEXT NOT NULL,
  mentee_email TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, mentee_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignment_mentees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "insert_own_user" ON public.users;
DROP POLICY IF EXISTS "select_own_user" ON public.users;
DROP POLICY IF EXISTS "update_own_user" ON public.users;
DROP POLICY IF EXISTS "select_projects" ON public.projects;
DROP POLICY IF EXISTS "insert_projects" ON public.projects;
DROP POLICY IF EXISTS "update_projects" ON public.projects;
DROP POLICY IF EXISTS "delete_projects" ON public.projects;
DROP POLICY IF EXISTS "select_project_team" ON public.project_team_members;
DROP POLICY IF EXISTS "insert_project_team" ON public.project_team_members;
DROP POLICY IF EXISTS "update_project_team" ON public.project_team_members;
DROP POLICY IF EXISTS "select_reviews" ON public.reviews;
DROP POLICY IF EXISTS "insert_reviews" ON public.reviews;
DROP POLICY IF EXISTS "update_reviews" ON public.reviews;
DROP POLICY IF EXISTS "select_own_feedback" ON public.feedback;
DROP POLICY IF EXISTS "insert_feedback" ON public.feedback;
DROP POLICY IF EXISTS "select_all_feedback" ON public.feedback;
DROP POLICY IF EXISTS "select_contacts" ON public.contacts;
DROP POLICY IF EXISTS "insert_contacts" ON public.contacts;
DROP POLICY IF EXISTS "select_deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "insert_deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "update_deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "delete_deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "select_assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "insert_assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "update_assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "delete_assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "select_assignment_mentees" ON public.project_assignment_mentees;
DROP POLICY IF EXISTS "insert_assignment_mentees" ON public.project_assignment_mentees;
DROP POLICY IF EXISTS "update_assignment_mentees" ON public.project_assignment_mentees;
DROP POLICY IF EXISTS "delete_assignment_mentees" ON public.project_assignment_mentees;

DROP POLICY IF EXISTS "select_assignment_mentees" ON public.project_assignment_mentees;
DROP POLICY IF EXISTS "insert_assignment_mentees" ON public.project_assignment_mentees;
DROP POLICY IF EXISTS "update_assignment_mentees" ON public.project_assignment_mentees;
DROP POLICY IF EXISTS "delete_assignment_mentees" ON public.project_assignment_mentees;

-- Users table policies (FIXED - prevent circular references)
-- First, disable RLS to fix any existing issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable with minimal policies to avoid circular references
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might cause issues
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Coordinators can view mentors and mentees" ON public.users;
DROP POLICY IF EXISTS "HOD can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can access own profile" ON public.users;

-- Create simple, working policies that don't cause circular references
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow coordinators to view mentors and mentees (simplified)
CREATE POLICY "Coordinators can view mentors and mentees" ON public.users
  FOR SELECT USING (
    role IN ('mentor', 'mentee')
  );

-- Allow HODs to view all users (simplified)
CREATE POLICY "HOD can view all users" ON public.users
  FOR SELECT USING (
    role IN ('mentor', 'mentee', 'project_coordinator', 'hod')
  );

-- Create projects table with new schema for coordinator assignments
DROP TABLE IF EXISTS public.projects CASCADE;

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  project_details TEXT,
  mentor_id UUID REFERENCES users(id),
  mentor_email TEXT,
  mentees UUID[],
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Mentors and admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Mentors and admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinator can view their assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinator can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinator can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinator can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "HOD can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Mentors can view their projects" ON public.projects;

-- Projects table policies (FIXED - prevent circular references)
-- Drop existing policies that might cause issues
DROP POLICY IF EXISTS "Coordinator can view their assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinator can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinator can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinator can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "HOD can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Mentors can view their projects" ON public.projects;

-- Create simple, working policies
CREATE POLICY "Coordinator can view their assigned projects" ON public.projects
  FOR SELECT USING (auth.uid() = assigned_by);

CREATE POLICY "Coordinator can insert projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Coordinator can update their projects" ON public.projects
  FOR UPDATE USING (auth.uid() = assigned_by);

CREATE POLICY "Coordinator can delete their projects" ON public.projects
  FOR DELETE USING (auth.uid() = assigned_by);

CREATE POLICY "HOD can view all projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Mentors can view their projects" ON public.projects
  FOR SELECT USING (auth.uid() = mentor_id);

-- Project team members policies (IMPROVED)
CREATE POLICY "Anyone can view project teams" ON public.project_team_members
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join teams" ON public.project_team_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Team members and mentors can update" ON public.project_team_members
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Reviews policies (IMPROVED)
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Reviewers can update own reviews" ON public.reviews
  FOR UPDATE USING (reviewer_id = auth.uid());

-- Feedback policies (IMPROVED)
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Project assignments policies (NEW)
CREATE POLICY "Coordinators can view all assignments" ON public.project_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Coordinators can insert assignments" ON public.project_assignments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Coordinators can update assignments" ON public.project_assignments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "HOD can view all assignments" ON public.project_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Project assignment mentees policies (NEW)
CREATE POLICY "Coordinators can view assignment mentees" ON public.project_assignment_mentees
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Coordinators can insert assignment mentees" ON public.project_assignment_mentees
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Coordinators can update assignment mentees" ON public.project_assignment_mentees
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Coordinators can delete assignment mentees" ON public.project_assignment_mentees
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- IMPROVED user creation function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role TEXT;
  user_roles TEXT[];  -- Add roles variable
BEGIN
  -- Extract name from metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Set default role or get from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'mentee');
  
  -- Set default roles array or get from metadata
  user_roles := COALESCE(NEW.raw_user_meta_data->'roles', '[]'::jsonb)::TEXT[];

  -- Insert or update user profile (handle conflicts gracefully)
  INSERT INTO public.users (id, name, email, role, roles, "isVerified")
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    user_role,
    user_roles,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, true)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    roles = EXCLUDED.roles,
    "isVerified" = EXCLUDED."isVerified",
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create triggers for user profile management
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates (for email confirmation, etc.)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_projects_mentor ON public.projects(mentor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_team_members_project ON public.project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.project_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project ON public.reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON public.project_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_mentee ON public.project_deliverables(mentee_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_stage ON public.project_deliverables(stage_name);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_mentor ON public.project_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.project_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_mentees_assignment ON public.project_assignment_mentees(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_mentees_mentee ON public.project_assignment_mentees(mentee_id);

-- Insert some test data (optional - remove if not needed)
DO $$
BEGIN
  -- Create a test HOD user if it doesn't exist
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    'hod-test-id-123',
    'hod@git-india.edu.in',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Test HOD", "role": "hod"}'::jsonb
  ) ON CONFLICT (email) DO NOTHING;

  -- Create a test mentor
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    'mentor-test-id-123',
    'mentor@git-india.edu.in',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Test Mentor", "role": "mentor"}'::jsonb
  ) ON CONFLICT (email) DO NOTHING;

  -- Create a test mentee
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    'mentee-test-id-123',
    'mentee@git-india.edu.in',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Test Mentee", "role": "mentee"}'::jsonb
  ) ON CONFLICT (email) DO NOTHING;

EXCEPTIONm
  WHEN OTHERS THEN
    RAISE LOG 'Error creating test users: %', SQLERRM;
END $$;
