"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const eventData = await request.json();
        // Validate required fields
        const required = ['user_token', 'site_url', 'page_url', 'event_type', 'severity', 'category', 'title'];
        for (const field of required) {
            if (!eventData[field]) {
                return server_1.NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }
        console.log(`[SEO-ALERT] Received ${eventData.severity} alert: ${eventData.title}`);
        // Store the event in database
        const { data, error } = await supabase
            .from('seo_monitoring_events')
            .insert({
            user_token: eventData.user_token,
            site_url: eventData.site_url,
            page_url: eventData.page_url,
            event_type: eventData.event_type,
            severity: eventData.severity,
            category: eventData.category,
            title: eventData.title,
            description: eventData.description || '',
            old_value: eventData.old_value || null,
            new_value: eventData.new_value || null,
            auto_fixed: eventData.auto_fixed || false,
            fix_applied: eventData.fix_applied || null,
            source: eventData.source || 'unknown',
            metadata: eventData.metadata || {}
        })
            .select()
            .single();
        if (error) {
            console.error('[SEO-ALERT] Database error:', error);
            return server_1.NextResponse.json({ error: 'Failed to store alert' }, { status: 500 });
        }
        // If this is a critical issue, we might want to send notifications
        // (placeholder for future notification system)
        if (eventData.severity === 'critical') {
            console.warn(`🚨 CRITICAL SEO ALERT: ${eventData.title} on ${eventData.site_url}`);
        }
        return server_1.NextResponse.json({
            success: true,
            data: data,
            message: 'SEO alert recorded successfully'
        });
    }
    catch (error) {
        console.error('[SEO-ALERT] Error:', error);
        return server_1.NextResponse.json({ error: 'Failed to process alert' }, { status: 500 });
    }
}
// GET endpoint to retrieve alerts for a website
async function GET(request) {
    try {
        const userToken = request.nextUrl.searchParams.get('userToken');
        const siteUrl = request.nextUrl.searchParams.get('siteUrl');
        const severity = request.nextUrl.searchParams.get('severity');
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
        const resolved = request.nextUrl.searchParams.get('resolved');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
        }
        let query = supabase
            .from('seo_monitoring_events')
            .select('*')
            .eq('user_token', userToken)
            .order('detected_at', { ascending: false })
            .limit(limit);
        if (siteUrl) {
            query = query.eq('site_url', siteUrl);
        }
        if (severity) {
            query = query.eq('severity', severity);
        }
        if (resolved === 'false') {
            query = query.is('resolved_at', null);
        }
        else if (resolved === 'true') {
            query = query.not('resolved_at', 'is', null);
        }
        const { data, error } = await query;
        if (error) {
            console.error('[SEO-ALERT] Query error:', error);
            return server_1.NextResponse.json({ error: 'Failed to retrieve alerts' }, { status: 500 });
        }
        // Group by severity for summary
        const summary = {
            critical: 0,
            warning: 0,
            info: 0,
            total: data?.length || 0
        };
        data?.forEach(event => {
            if (event.severity === 'critical')
                summary.critical++;
            else if (event.severity === 'warning')
                summary.warning++;
            else
                summary.info++;
        });
        return server_1.NextResponse.json({
            success: true,
            data: data || [],
            summary,
            message: `Retrieved ${summary.total} SEO alerts`
        });
    }
    catch (error) {
        console.error('[SEO-ALERT] Error retrieving alerts:', error);
        return server_1.NextResponse.json({ error: 'Failed to retrieve alerts' }, { status: 500 });
    }
}
