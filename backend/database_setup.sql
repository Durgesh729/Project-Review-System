-- Create table for Coordinator Feedback Links
create table if not exists coordinator_feedback_links (
    id uuid default uuid_generate_v4() primary key,
    academic_year_id uuid references academic_years(id) not null,
    link text not null,
    coordinator_id uuid references users(id),
    updated_at timestamp with time zone default now(),
    unique(academic_year_id)
);

-- Enable RLS
alter table coordinator_feedback_links enable row level security;

-- Policy: Everyone can read (Mentees need to see it)
-- Policy: Everyone can read (Mentees need to see it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'coordinator_feedback_links' 
        AND policyname = 'Public read access'
    ) THEN
        create policy "Public read access" on coordinator_feedback_links
          for select using (true);
    END IF;
END $$;

-- Policy: Coordinators can insert/update/delete
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'coordinator_feedback_links' 
        AND policyname = 'Coordinator full access'
    ) THEN
        create policy "Coordinator full access" on coordinator_feedback_links
          for all using (
            auth.uid() in (
              select id from users 
              where role = 'project_coordinator' 
                 or 'project_coordinator' = any(roles)
            )
          );
    END IF;
END $$;

-- Optional: Create a view or join for easier querying if needed, but direct query is fine.

-- IMPORTANT: Enable Realtime for this table so Mentees allow notifications
-- Run this in Supabase SQL Editor:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'coordinator_feedback_links'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE coordinator_feedback_links;
    END IF;
END $$;

-- ---------------------------------------------------------
-- RPC: Update Project Status (Bypasses RLS)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_project_status(p_project_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE projects
  SET status = p_status
  WHERE id = p_project_id;
END;
$$;
