"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[MIGRATE WEBSITES] Starting website management system migration');
        // Step 1: Add missing columns if they don't exist
        console.log('[MIGRATE WEBSITES] Step 1: Adding columns if missing');
        try {
            // Try to add the columns - this will fail if they already exist, which is fine
            await supabase.rpc('exec_sql', {
                sql: `
          ALTER TABLE websites 
          ADD COLUMN IF NOT EXISTS is_managed BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS is_excluded_from_sync BOOLEAN DEFAULT false;
        `
            });
            console.log('[MIGRATE WEBSITES] Columns added successfully');
        }
        catch (error) {
            // Try alternative approach using raw SQL
            const { error: alterError } = await supabase
                .from('websites')
                .select('is_managed')
                .limit(1);
            if (alterError && alterError.message.includes('column "is_managed" does not exist')) {
                console.log('[MIGRATE WEBSITES] Columns missing, need manual migration');
                return server_1.NextResponse.json({
                    success: false,
                    error: 'Database columns missing. Manual database migration required.',
                    instructions: 'Run the following SQL in your Supabase SQL editor:\n\nALTER TABLE websites ADD COLUMN is_managed BOOLEAN DEFAULT false;\nALTER TABLE websites ADD COLUMN is_excluded_from_sync BOOLEAN DEFAULT false;\nCREATE INDEX idx_websites_managed ON websites(user_token, is_managed);\nCREATE INDEX idx_websites_excluded ON websites(user_token, is_excluded_from_sync);'
                }, { status: 500 });
            }
        }
        // Step 2: Create indexes if they don't exist
        console.log('[MIGRATE WEBSITES] Step 2: Creating indexes');
        try {
            await supabase.rpc('exec_sql', {
                sql: `
          CREATE INDEX IF NOT EXISTS idx_websites_managed ON websites(user_token, is_managed);
          CREATE INDEX IF NOT EXISTS idx_websites_excluded ON websites(user_token, is_excluded_from_sync);
        `
            });
        }
        catch (indexError) {
            console.log('[MIGRATE WEBSITES] Index creation failed (may already exist):', indexError);
        }
        // Step 3: Migrate existing data
        console.log('[MIGRATE WEBSITES] Step 3: Migrating existing website data');
        // Get all users with their current plans
        const { data: userPlans, error: plansError } = await supabase
            .from('user_plans')
            .select('user_token, plan_id, is_active')
            .eq('is_active', true);
        if (plansError) {
            console.error('[MIGRATE WEBSITES] Error fetching user plans:', plansError);
            return server_1.NextResponse.json({ error: 'Failed to fetch user plans' }, { status: 500 });
        }
        const planLimits = {
            free: 1,
            starter: 1,
            pro: 5,
            enterprise: -1
        };
        let migratedUsers = 0;
        let migratedWebsites = 0;
        // Process each user
        for (const userPlan of userPlans || []) {
            const userToken = userPlan.user_token;
            const planId = userPlan.plan_id || 'free';
            const maxSites = planLimits[planId] || 1;
            console.log(`[MIGRATE WEBSITES] Processing user ${userToken} with plan ${planId} (max ${maxSites} sites)`);
            // Get user's websites
            const { data: websites, error: websitesError } = await supabase
                .from('websites')
                .select('id, website_token, domain, created_at')
                .eq('user_token', userToken)
                .order('created_at', { ascending: true }); // Oldest first
            if (websitesError) {
                console.error(`[MIGRATE WEBSITES] Error fetching websites for user ${userToken}:`, websitesError);
                continue;
            }
            if (!websites || websites.length === 0) {
                continue;
            }
            // Determine which websites to mark as managed
            const websitesToManage = maxSites === -1 ? websites : websites.slice(0, maxSites);
            // Update websites: mark appropriate ones as managed, all as not excluded
            for (const website of websites) {
                const shouldManage = websitesToManage.some(w => w.id === website.id);
                const { error: updateError } = await supabase
                    .from('websites')
                    .update({
                    is_managed: shouldManage,
                    is_excluded_from_sync: false
                })
                    .eq('id', website.id);
                if (updateError) {
                    console.error(`[MIGRATE WEBSITES] Error updating website ${website.domain}:`, updateError);
                }
                else {
                    console.log(`[MIGRATE WEBSITES] Updated ${website.domain}: managed=${shouldManage}`);
                    migratedWebsites++;
                }
            }
            migratedUsers++;
        }
        // Also handle users without explicit plans (default to free)
        const { data: usersWithoutPlans, error: noPlanError } = await supabase
            .from('websites')
            .select('user_token')
            .not('user_token', 'in', `(${(userPlans || []).map(p => `'${p.user_token}'`).join(',') || "'none'"})`)
            .then(result => ({
            data: result.data ? Array.from(new Set(result.data.map(w => w.user_token))) : [],
            error: result.error
        }));
        if (!noPlanError && usersWithoutPlans) {
            for (const userToken of usersWithoutPlans) {
                console.log(`[MIGRATE WEBSITES] Processing user without plan: ${userToken}`);
                // Get first website only (free plan limit)
                const { data: websites, error: websitesError } = await supabase
                    .from('websites')
                    .select('id, domain, created_at')
                    .eq('user_token', userToken)
                    .order('created_at', { ascending: true })
                    .limit(1);
                if (!websitesError && websites && websites.length > 0) {
                    const { error: updateError } = await supabase
                        .from('websites')
                        .update({
                        is_managed: true,
                        is_excluded_from_sync: false
                    })
                        .eq('id', websites[0].id);
                    if (!updateError) {
                        console.log(`[MIGRATE WEBSITES] Updated ${websites[0].domain} for user without plan`);
                        migratedWebsites++;
                    }
                }
                migratedUsers++;
            }
        }
        console.log('[MIGRATE WEBSITES] Migration completed successfully');
        return server_1.NextResponse.json({
            success: true,
            message: 'Website management system migration completed',
            stats: {
                migratedUsers,
                migratedWebsites,
                totalUserPlans: userPlans?.length || 0
            }
        });
    }
    catch (error) {
        console.error('[MIGRATE WEBSITES] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error during migration' }, { status: 500 });
    }
}
