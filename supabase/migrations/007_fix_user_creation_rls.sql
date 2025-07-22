-- Fix RLS policies to allow users to read their own login_users records
-- This migration fixes the issue where authenticated users cannot SELECT their own records

-- The main issue: missing SELECT policy for login_users table
-- Users need to be able to read their own token from login_users

-- Add SELECT policy for users to read their own records
CREATE POLICY "Users can select own profile" ON login_users
    FOR SELECT USING (auth_user_id = auth.uid());

-- The INSERT and service role policies should already exist from migration 006
-- But let's make sure they exist with proper names

-- Ensure INSERT policy exists (allow users to create their own records)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'login_users' 
        AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON login_users
            FOR INSERT WITH CHECK (auth_user_id = auth.uid());
    END IF;
END$$;

-- Ensure service role policy exists (allow API routes to manage all records)
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