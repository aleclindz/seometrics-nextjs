-- Fix RLS policies to allow user record creation
-- This migration fixes the issue where users cannot create their own login_users records

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON login_users;

-- Create a more permissive policy that allows authenticated users to insert their own record
CREATE POLICY "Users can insert own profile" ON login_users
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Also ensure the service role can still manage all records
-- This should already exist but let's make sure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'login_users' 
        AND policyname = 'Service can manage login users'
    ) THEN
        CREATE POLICY "Service can manage login users" ON login_users
            FOR ALL USING (true);
    END IF;
END$$;

-- Insert the missing user record manually (since we know the user exists in auth)
-- This will create the record for the current user who is experiencing the issue
INSERT INTO login_users (email, auth_user_id, token)
SELECT 
    'alec@usebaxter.com',
    '442c08b0-a38f-4a6c-b48f-4375643721ae'::uuid,
    gen_random_uuid()::text
WHERE NOT EXISTS (
    SELECT 1 FROM login_users 
    WHERE auth_user_id = '442c08b0-a38f-4a6c-b48f-4375643721ae'::uuid
);

-- Also create a default user plan for this user if it doesn't exist
INSERT INTO user_plans (user_token, tier, sites_allowed, posts_allowed, status)
SELECT 
    lu.token,
    'free',
    1,
    0,
    'active'
FROM login_users lu
WHERE lu.auth_user_id = '442c08b0-a38f-4a6c-b48f-4375643721ae'::uuid
AND NOT EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.user_token = lu.token
);