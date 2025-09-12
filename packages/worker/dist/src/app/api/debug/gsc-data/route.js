"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'userToken required' }, { status: 400 });
        }
        // Check GSC connections
        const { data: connections, error: connectionsError } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', userToken);
        // Check GSC properties  
        const { data: properties, error: propertiesError } = await supabase
            .from('gsc_properties')
            .select('*')
            .eq('user_token', userToken);
        // Check GSC performance data
        const { data: performance, error: performanceError } = await supabase
            .from('gsc_performance_data')
            .select('*')
            .eq('user_token', userToken)
            .limit(5);
        // Check URL inspections
        const { data: inspections, error: inspectionsError } = await supabase
            .from('url_inspections')
            .select('*')
            .eq('user_token', userToken)
            .limit(5);
        return server_1.NextResponse.json({
            success: true,
            data: {
                connections: connections || [],
                properties: properties || [],
                performance: performance || [],
                inspections: inspections || [],
                errors: {
                    connectionsError: connectionsError?.message,
                    propertiesError: propertiesError?.message,
                    performanceError: performanceError?.message,
                    inspectionsError: inspectionsError?.message
                }
            }
        });
    }
    catch (error) {
        console.error('[DEBUG GSC DATA] Error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch GSC debug data' }, { status: 500 });
    }
}
