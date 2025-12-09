-- Add duration column to project_assignments table
ALTER TABLE public.project_assignments 
ADD COLUMN IF NOT EXISTS duration TEXT 
DEFAULT '1 Semester' 
CHECK (duration IN ('1 Semester', '2 Semesters', '3 Semesters'));

-- Update RLS policies to include duration
COMMENT ON COLUMN public.project_assignments.duration IS 'Duration of the project (1 Semester, 2 Semesters, or 3 Semesters)';

-- Update indexes if needed (no index needed for this field as it's not used in WHERE clauses)
