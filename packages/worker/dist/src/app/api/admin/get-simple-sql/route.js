"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET() {
    return server_1.NextResponse.json({
        success: true,
        message: 'Run this SQL in your Supabase SQL Editor (step by step)',
        step1: `
-- STEP 1: Create excluded_domains table
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
    `,
        step2: `
-- STEP 2: Create RLS policy for excluded_domains (run separately)
DROP POLICY IF EXISTS "Users can access own excluded domains" ON excluded_domains;
CREATE POLICY "Users can access own excluded domains" ON excluded_domains 
FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);
    `,
        step3: `
-- STEP 3: Create website_switches table
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
    `,
        step4: `
-- STEP 4: Create RLS policy for website_switches (run separately)
DROP POLICY IF EXISTS "Users can access own website switches" ON website_switches;
CREATE POLICY "Users can access own website switches" ON website_switches 
FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);
    `,
        step5: `
-- STEP 5: Fix plan limits (update existing data)
UPDATE user_plans SET sites_allowed = 0 WHERE tier = 'free';
UPDATE user_plans SET sites_allowed = 1 WHERE tier = 'starter';
UPDATE user_plans SET sites_allowed = 5 WHERE tier = 'pro';
UPDATE user_plans SET sites_allowed = -1 WHERE tier = 'enterprise';
    `
    });
}
