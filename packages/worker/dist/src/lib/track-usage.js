"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackUsage = trackUsage;
exports.getUserUsage = getUserUsage;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function trackUsage(userToken, resourceType, siteId) {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        console.log(`[TRACK USAGE] Tracking ${resourceType} usage for user:`, userToken, 'month:', currentMonth);
        // Check if record exists
        const { data: existing } = await supabase
            .from('usage_tracking')
            .select('id, count')
            .eq('user_token', userToken)
            .eq('resource_type', resourceType)
            .eq('month_year', currentMonth)
            .eq('site_id', siteId || null)
            .single();
        if (existing) {
            // Update existing record
            const { error } = await supabase
                .from('usage_tracking')
                .update({ count: existing.count + 1 })
                .eq('id', existing.id);
            if (error) {
                console.error('[TRACK USAGE] Error updating usage:', error);
                return false;
            }
            console.log(`[TRACK USAGE] Updated ${resourceType} count to:`, existing.count + 1);
        }
        else {
            // Create new record
            const { error } = await supabase
                .from('usage_tracking')
                .insert({
                user_token: userToken,
                site_id: siteId || null,
                resource_type: resourceType,
                month_year: currentMonth,
                count: 1
            });
            if (error) {
                console.error('[TRACK USAGE] Error creating usage record:', error);
                return false;
            }
            console.log(`[TRACK USAGE] Created new ${resourceType} usage record`);
        }
        return true;
    }
    catch (error) {
        console.error('[TRACK USAGE] Unexpected error:', error);
        return false;
    }
}
async function getUserUsage(userToken) {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: usage } = await supabase
            .from('usage_tracking')
            .select('resource_type, count')
            .eq('user_token', userToken)
            .eq('month_year', currentMonth);
        const usageByType = usage?.reduce((acc, item) => {
            acc[item.resource_type] = (acc[item.resource_type] || 0) + item.count;
            return acc;
        }, {}) || {};
        return {
            articles: usageByType.article || 0,
            sites: usageByType.site || 0,
            month: currentMonth
        };
    }
    catch (error) {
        console.error('[GET USAGE] Error fetching usage:', error);
        return null;
    }
}
