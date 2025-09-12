"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[ADMIN] Creating website_switches table...');
        // Check if website_switches table exists
        const { error: createTableError } = await supabase
            .from('website_switches')
            .select('id')
            .limit(1);
        // If table doesn't exist, provide SQL for manual creation
        if (createTableError && createTableError.code === 'PGRST116') {
            console.log('[ADMIN] website_switches table does not exist, providing SQL for manual creation...');
            return server_1.NextResponse.json({
                success: false,
                error: 'Table creation requires manual SQL execution',
                sql: `
-- Run this SQL in your Supabase SQL Editor:

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
        `
            });
        }
        if (createTableError) {
            console.error('[ADMIN] Failed to create website_switches table:', createTableError);
            return server_1.NextResponse.json({ error: 'Failed to create website_switches table', details: createTableError }, { status: 500 });
        }
        console.log('[ADMIN] website_switches table created successfully');
        return server_1.NextResponse.json({
            success: true,
            message: 'website_switches table created successfully'
        });
    }
    catch (error) {
        console.error('[ADMIN] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
