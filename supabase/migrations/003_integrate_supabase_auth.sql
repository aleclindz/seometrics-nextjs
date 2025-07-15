-- Integrate with Supabase Auth
-- This migration connects our custom user system with Supabase's built-in auth

-- Add auth_user_id column to link with auth.users
ALTER TABLE login_users 
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.login_users (email, auth_user_id, token)
  VALUES (NEW.email, NEW.id, gen_random_uuid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update the RLS policies to work with Supabase auth
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON login_users;
DROP POLICY IF EXISTS "Users can update own profile" ON login_users;
DROP POLICY IF EXISTS "Users can view own websites" ON websites;
DROP POLICY IF EXISTS "Users can insert own websites" ON websites;
DROP POLICY IF EXISTS "Users can update own websites" ON websites;
DROP POLICY IF EXISTS "Users can delete own websites" ON websites;
DROP POLICY IF EXISTS "Users can view pages of own websites" ON pages;
DROP POLICY IF EXISTS "Users can insert pages for own websites" ON pages;
DROP POLICY IF EXISTS "Users can update pages of own websites" ON pages;
DROP POLICY IF EXISTS "Users can view images of own websites" ON images;
DROP POLICY IF EXISTS "Users can insert images for own websites" ON images;
DROP POLICY IF EXISTS "Users can update images of own websites" ON images;
DROP POLICY IF EXISTS "Users can view own articles" ON articles;
DROP POLICY IF EXISTS "Users can insert own articles" ON articles;
DROP POLICY IF EXISTS "Users can update own articles" ON articles;
DROP POLICY IF EXISTS "Users can delete own articles" ON articles;
DROP POLICY IF EXISTS "Users can view own API usage" ON api_usage;
DROP POLICY IF EXISTS "Service can insert API usage" ON api_usage;

-- Create new policies that work with Supabase auth
CREATE POLICY "Users can view own profile" ON login_users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON login_users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Website policies using the updated structure
CREATE POLICY "Users can view own websites" ON websites
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own websites" ON websites
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own websites" ON websites
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own websites" ON websites
    FOR DELETE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Pages policies
CREATE POLICY "Users can view pages of own websites" ON pages
    FOR SELECT USING (
        website_token IN (
            SELECT website_token FROM websites w 
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert pages for own websites" ON pages
    FOR INSERT WITH CHECK (
        website_token IN (
            SELECT website_token FROM websites w 
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update pages of own websites" ON pages
    FOR UPDATE USING (
        website_token IN (
            SELECT website_token FROM websites w 
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Images policies
CREATE POLICY "Users can view images of own websites" ON images
    FOR SELECT USING (
        website_token IN (
            SELECT website_token FROM websites w 
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert images for own websites" ON images
    FOR INSERT WITH CHECK (
        website_token IN (
            SELECT website_token FROM websites w 
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update images of own websites" ON images
    FOR UPDATE USING (
        website_token IN (
            SELECT website_token FROM websites w 
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Articles policies
CREATE POLICY "Users can view own articles" ON articles
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own articles" ON articles
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own articles" ON articles
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own articles" ON articles
    FOR DELETE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- API usage policies
CREATE POLICY "Users can view own API usage" ON api_usage
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Service can insert API usage" ON api_usage
    FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_login_users_auth_user_id ON login_users(auth_user_id);