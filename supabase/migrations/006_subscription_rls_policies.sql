-- Add Row Level Security policies for subscription system tables
-- This migration adds RLS policies for user_plans and usage_tracking tables

-- Enable RLS on subscription tables
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;

-- User Plans policies
CREATE POLICY "Users can view own plan" ON user_plans
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own plan" ON user_plans
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own plan" ON user_plans
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Allow service role to insert/update user plans (for Stripe webhooks)
CREATE POLICY "Service can manage user plans" ON user_plans
    FOR ALL USING (true);

-- Usage Tracking policies
CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own usage" ON usage_tracking
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own usage" ON usage_tracking
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Allow service role to insert/update usage tracking (for Edge Functions)
CREATE POLICY "Service can manage usage tracking" ON usage_tracking
    FOR ALL USING (true);

-- Article Versions policies
CREATE POLICY "Users can view own article versions" ON article_versions
    FOR SELECT USING (
        article_id IN (
            SELECT a.id FROM articles a
            JOIN login_users u ON a.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own article versions" ON article_versions
    FOR INSERT WITH CHECK (
        article_id IN (
            SELECT a.id FROM articles a
            JOIN login_users u ON a.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Allow service role to manage article versions
CREATE POLICY "Service can manage article versions" ON article_versions
    FOR ALL USING (true);

-- Add missing policy for login_users insert (for new user creation)
CREATE POLICY "Users can insert own profile" ON login_users
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Allow service role to manage login_users (for user creation triggers)
CREATE POLICY "Service can manage login users" ON login_users
    FOR ALL USING (true);