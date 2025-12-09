-- Verify that the roles column exists in the users table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name = 'roles';

-- Check if there are any users with roles data
SELECT 
  id, 
  email, 
  role, 
  roles
FROM public.users
WHERE array_length(roles, 1) > 0
LIMIT 5;

-- Check the structure of the users table
\d public.users;