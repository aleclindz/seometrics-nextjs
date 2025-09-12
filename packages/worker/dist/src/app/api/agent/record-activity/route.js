"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// POST /api/agent/record-activity - Record agent function calls for activity tracking
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, functionName, functionArgs, result, executionTimeMs, siteUrl } = body;
        if (!userToken || !functionName) {
            return server_1.NextResponse.json({
                error: 'User token and function name required'
            }, { status: 400 });
        }
        // Record the function call event
        const { error: eventError } = await supabase
            .from('agent_events')
            .insert({
            user_token: userToken,
            event_type: 'function_called',
            event_data: {
                function_name: functionName,
                arguments: functionArgs,
                result: result,
                execution_time_ms: executionTimeMs,
                site_url: siteUrl,
                success: result?.success || false
            },
            created_at: new Date().toISOString()
        });
        if (eventError) {
            console.error('[AGENT RECORD] Error recording event:', eventError);
            return server_1.NextResponse.json({
                error: 'Failed to record activity'
            }, { status: 500 });
        }
        // Also create action records for certain function types
        if (shouldCreateActionRecord(functionName)) {
            try {
                await createActionRecord(userToken, functionName, functionArgs, result, siteUrl);
            }
            catch (actionError) {
                console.error('[AGENT RECORD] Error creating action record:', actionError);
                // Don't fail the whole request if action creation fails
            }
        }
        // Create idea records for idea-related functions  
        if (shouldCreateIdeaRecord(functionName)) {
            try {
                await createIdeaRecord(userToken, functionName, functionArgs, result, siteUrl);
            }
            catch (ideaError) {
                console.error('[AGENT RECORD] Error creating idea record:', ideaError);
                // Don't fail the whole request if idea creation fails
            }
        }
        console.log(`[AGENT RECORD] Recorded function call: ${functionName} for ${userToken}`);
        return server_1.NextResponse.json({
            success: true,
            message: 'Activity recorded'
        });
    }
    catch (error) {
        console.error('[AGENT RECORD] Unexpected error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
// Determine if function should create an action record
function shouldCreateActionRecord(functionName) {
    const actionFunctions = [
        'sync_gsc_data',
        'generate_article',
        'check_seoagentjs_status',
        'get_technical_seo_status',
        'connect_cms',
        'analyze_content_gaps',
        'optimize_page_content',
        'audit_site',
        'run_action',
        'plan_crawl'
    ];
    return actionFunctions.includes(functionName);
}
// Determine if function should create an idea record  
function shouldCreateIdeaRecord(functionName) {
    const ideaFunctions = [
        'create_idea',
        'adopt_idea'
    ];
    return ideaFunctions.includes(functionName);
}
// Create action record for trackable functions
async function createActionRecord(userToken, functionName, functionArgs, result, siteUrl) {
    const actionTitle = generateActionTitle(functionName, functionArgs);
    const actionType = mapFunctionToActionType(functionName);
    const { error } = await supabase
        .from('agent_actions')
        .insert({
        user_token: userToken,
        site_url: siteUrl || functionArgs.site_url || 'unknown',
        action_type: actionType,
        title: actionTitle,
        description: `Agent executed: ${functionName}`,
        parameters: functionArgs,
        status: result?.success ? 'completed' : 'failed',
        result_data: result,
        created_at: new Date().toISOString(),
        completed_at: result?.success ? new Date().toISOString() : null
    });
    if (error) {
        throw new Error(`Failed to create action record: ${error.message}`);
    }
}
// Create idea record for idea functions
async function createIdeaRecord(userToken, functionName, functionArgs, result, siteUrl) {
    if (functionName === 'create_idea' && result?.success) {
        const { error } = await supabase
            .from('agent_ideas')
            .insert({
            user_token: userToken,
            site_url: siteUrl || functionArgs.site_url || 'unknown',
            title: functionArgs.title || 'Generated Idea',
            description: functionArgs.description || functionArgs.hypothesis || '',
            evidence: functionArgs.evidence || [],
            hypothesis: functionArgs.hypothesis || '',
            status: 'open',
            ice_score: calculateICEScore(functionArgs),
            created_at: new Date().toISOString()
        });
        if (error) {
            throw new Error(`Failed to create idea record: ${error.message}`);
        }
    }
}
// Generate readable action titles
function generateActionTitle(functionName, args) {
    const titleMap = {
        sync_gsc_data: (args) => `Sync GSC data for ${args.site_url || 'website'}`,
        generate_article: (args) => `Generate article: ${args.topic || 'SEO content'}`,
        check_seoagentjs_status: (args) => `Check SEOAgent.js status for ${args.site_url || 'website'}`,
        get_technical_seo_status: (args) => `Technical SEO check for ${args.site_url || 'website'}`,
        connect_cms: (args) => `Connect ${args.cms_type || 'CMS'} for ${args.site_url || 'website'}`,
        audit_site: (args) => `Site audit for ${args.site_url || 'website'}`,
        run_action: (args) => `Execute: ${args.action_title || 'action'}`,
        plan_crawl: (args) => `Plan crawl for ${args.site_url || 'website'}`
    };
    const generator = titleMap[functionName];
    return generator ? generator(args) : `Execute ${functionName.replace(/_/g, ' ')}`;
}
// Map function names to action types
function mapFunctionToActionType(functionName) {
    const typeMap = {
        sync_gsc_data: 'data_sync',
        generate_article: 'content_creation',
        check_seoagentjs_status: 'monitoring',
        get_technical_seo_status: 'technical_analysis',
        connect_cms: 'integration',
        analyze_content_gaps: 'content_analysis',
        optimize_page_content: 'content_optimization',
        audit_site: 'site_audit',
        run_action: 'automation',
        plan_crawl: 'crawl_planning'
    };
    return typeMap[functionName] || 'general';
}
// Calculate ICE score for ideas (Impact, Confidence, Ease)
function calculateICEScore(args) {
    // Simple scoring based on available data
    let score = 50; // Base score
    if (args.evidence?.length > 0)
        score += 20; // Has evidence
    if (args.hypothesis?.length > 100)
        score += 15; // Detailed hypothesis  
    if (args.site_url)
        score += 10; // Site-specific
    if (args.urgency === 'high')
        score += 15; // High urgency
    return Math.min(100, Math.max(0, score));
}
