import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Manual SQL execution required',
    instructions: `
Go to your Supabase Dashboard → SQL Editor and run the following SQL:

--- STEP 1: Create excluded_domains table ---
CREATE TABLE IF NOT EXISTS excluded_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token UUID REFERENCES login_users(token) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  excluded_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_token, domain)
);

CREATE INDEX IF NOT EXISTS idx_excluded_domains_user_token ON excluded_domains(user_token);
CREATE INDEX IF NOT EXISTS idx_excluded_domains_domain ON excluded_domains(domain);

ALTER TABLE excluded_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can access own excluded domains" ON excluded_domains
FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);

--- STEP 2: Create website_switches table ---
CREATE TABLE IF NOT EXISTS website_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token UUID REFERENCES login_users(token) ON DELETE CASCADE,
  from_website_token UUID,
  to_website_token UUID REFERENCES websites(website_token) ON DELETE CASCADE,
  switched_at TIMESTAMP DEFAULT now(),
  reason VARCHAR(100) DEFAULT 'user_switch',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_switches_user_token ON website_switches(user_token);
CREATE INDEX IF NOT EXISTS idx_website_switches_switched_at ON website_switches(switched_at);
CREATE INDEX IF NOT EXISTS idx_website_switches_to_website ON website_switches(to_website_token);

ALTER TABLE website_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can access own website switches" ON website_switches
FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);

--- STEP 3: Fix plan limits (update existing data) ---
UPDATE user_plans SET sites_allowed = 0 WHERE tier = 'free';
UPDATE user_plans SET sites_allowed = 1 WHERE tier = 'starter';
UPDATE user_plans SET sites_allowed = 5 WHERE tier = 'pro';
UPDATE user_plans SET sites_allowed = -1 WHERE tier = 'enterprise';
    `,
    sql_only: `
CREATE TABLE IF NOT EXISTS excluded_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token UUID REFERENCES login_users(token) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  excluded_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_token, domain)
);

CREATE INDEX IF NOT EXISTS idx_excluded_domains_user_token ON excluded_domains(user_token);
CREATE INDEX IF NOT EXISTS idx_excluded_domains_domain ON excluded_domains(domain);
ALTER TABLE excluded_domains ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'excluded_domains' 
        AND policyname = 'Users can access own excluded domains'
    ) THEN
        CREATE POLICY "Users can access own excluded domains" ON excluded_domains FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS website_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token UUID REFERENCES login_users(token) ON DELETE CASCADE,
  from_website_token UUID,
  to_website_token UUID REFERENCES websites(website_token) ON DELETE CASCADE,
  switched_at TIMESTAMP DEFAULT now(),
  reason VARCHAR(100) DEFAULT 'user_switch',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_switches_user_token ON website_switches(user_token);
CREATE INDEX IF NOT EXISTS idx_website_switches_switched_at ON website_switches(switched_at);
CREATE INDEX IF NOT EXISTS idx_website_switches_to_website ON website_switches(to_website_token);
ALTER TABLE website_switches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'website_switches' 
        AND policyname = 'Users can access own website switches'
    ) THEN
        CREATE POLICY "Users can access own website switches" ON website_switches FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);
    END IF;
END
$$;

UPDATE user_plans SET sites_allowed = 0 WHERE tier = 'free';
UPDATE user_plans SET sites_allowed = 1 WHERE tier = 'starter';
UPDATE user_plans SET sites_allowed = 5 WHERE tier = 'pro';
UPDATE user_plans SET sites_allowed = -1 WHERE tier = 'enterprise';
    `
  });
}