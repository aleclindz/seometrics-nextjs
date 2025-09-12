"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Use service role for admin operations
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const adminKey = searchParams.get('adminKey');
        const days = parseInt(searchParams.get('days') || '30');
        // Simple admin authentication - in production, use proper auth
        if (adminKey !== process.env.ADMIN_ANALYTICS_KEY) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('[ONBOARDING] Fetching analytics for last', days, 'days');
        // Get survey completion overview
        const { data: completionStats, error: completionError } = await supabase
            .from('onboarding_surveys')
            .select('survey_completed, interested_in_founder_call, accepted_pro_offer, created_at')
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
        if (completionError) {
            console.error('[ONBOARDING] Error fetching completion stats:', completionError);
            return server_1.NextResponse.json({ error: 'Failed to fetch completion stats' }, { status: 500 });
        }
        // Get building method distribution
        const { data: buildingMethods, error: buildingError } = await supabase
            .from('onboarding_surveys')
            .select('website_building_method, website_building_method_other')
            .eq('survey_completed', true)
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
        if (buildingError) {
            console.error('[ONBOARDING] Error fetching building methods:', buildingError);
            return server_1.NextResponse.json({ error: 'Failed to fetch building methods' }, { status: 500 });
        }
        // Get CMS usage distribution
        const { data: cmsUsage, error: cmsError } = await supabase
            .from('onboarding_surveys')
            .select('cms_type, cms_type_other, uses_cms')
            .eq('survey_completed', true)
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
        if (cmsError) {
            console.error('[ONBOARDING] Error fetching CMS usage:', cmsError);
            return server_1.NextResponse.json({ error: 'Failed to fetch CMS usage' }, { status: 500 });
        }
        // Get hosting provider distribution
        const { data: hostingProviders, error: hostingError } = await supabase
            .from('onboarding_surveys')
            .select('hosting_provider, hosting_provider_other')
            .eq('survey_completed', true)
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
        if (hostingError) {
            console.error('[ONBOARDING] Error fetching hosting providers:', hostingError);
            return server_1.NextResponse.json({ error: 'Failed to fetch hosting providers' }, { status: 500 });
        }
        // Get business type distribution
        const { data: businessTypes, error: businessError } = await supabase
            .from('onboarding_surveys')
            .select('business_type, website_age, monthly_visitors, seo_experience')
            .eq('survey_completed', true)
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
        if (businessError) {
            console.error('[ONBOARDING] Error fetching business types:', businessError);
            return server_1.NextResponse.json({ error: 'Failed to fetch business types' }, { status: 500 });
        }
        // Process completion statistics
        const totalSurveys = completionStats.length;
        const completedSurveys = completionStats.filter(s => s.survey_completed).length;
        const founderCallInterest = completionStats.filter(s => s.interested_in_founder_call).length;
        const proOfferAcceptance = completionStats.filter(s => s.accepted_pro_offer).length;
        const completionRate = totalSurveys > 0 ? (completedSurveys / totalSurveys * 100).toFixed(1) : '0';
        // Process building method distribution
        const buildingMethodCounts = buildingMethods.reduce((acc, survey) => {
            const method = survey.website_building_method === 'other'
                ? `other (${survey.website_building_method_other || 'unspecified'})`
                : survey.website_building_method;
            acc[method] = (acc[method] || 0) + 1;
            return acc;
        }, {});
        // Process CMS distribution
        const cmsTypeCounts = cmsUsage.reduce((acc, survey) => {
            if (!survey.uses_cms) {
                acc['none'] = (acc['none'] || 0) + 1;
            }
            else {
                const cms = survey.cms_type === 'other'
                    ? `other (${survey.cms_type_other || 'unspecified'})`
                    : survey.cms_type;
                acc[cms] = (acc[cms] || 0) + 1;
            }
            return acc;
        }, {});
        // Process hosting distribution
        const hostingCounts = hostingProviders.reduce((acc, survey) => {
            const hosting = survey.hosting_provider === 'other'
                ? `other (${survey.hosting_provider_other || 'unspecified'})`
                : survey.hosting_provider;
            acc[hosting] = (acc[hosting] || 0) + 1;
            return acc;
        }, {});
        // Process business context
        const businessTypeCounts = businessTypes.reduce((acc, survey) => {
            acc[survey.business_type] = (acc[survey.business_type] || 0) + 1;
            return acc;
        }, {});
        const websiteAgeCounts = businessTypes.reduce((acc, survey) => {
            acc[survey.website_age] = (acc[survey.website_age] || 0) + 1;
            return acc;
        }, {});
        const visitorCounts = businessTypes.reduce((acc, survey) => {
            acc[survey.monthly_visitors] = (acc[survey.monthly_visitors] || 0) + 1;
            return acc;
        }, {});
        const seoExperienceCounts = businessTypes.reduce((acc, survey) => {
            acc[survey.seo_experience] = (acc[survey.seo_experience] || 0) + 1;
            return acc;
        }, {});
        // Calculate daily completion trend
        const dailyCompletions = completionStats.reduce((acc, survey) => {
            const date = new Date(survey.created_at).toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { total: 0, completed: 0 };
            }
            acc[date].total += 1;
            if (survey.survey_completed) {
                acc[date].completed += 1;
            }
            return acc;
        }, {});
        const analytics = {
            summary: {
                totalSurveys,
                completedSurveys,
                completionRate: parseFloat(completionRate),
                founderCallInterest,
                founderCallInterestRate: totalSurveys > 0 ? (founderCallInterest / totalSurveys * 100).toFixed(1) : '0',
                proOfferAcceptance,
                proOfferAcceptanceRate: totalSurveys > 0 ? (proOfferAcceptance / totalSurveys * 100).toFixed(1) : '0'
            },
            distributions: {
                buildingMethods: buildingMethodCounts,
                cmsTypes: cmsTypeCounts,
                hostingProviders: hostingCounts,
                businessTypes: businessTypeCounts,
                websiteAges: websiteAgeCounts,
                monthlyVisitors: visitorCounts,
                seoExperience: seoExperienceCounts
            },
            trends: {
                dailyCompletions: Object.entries(dailyCompletions).map(([date, stats]) => ({
                    date,
                    total: stats.total,
                    completed: stats.completed,
                    completionRate: stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : '0'
                })).sort((a, b) => a.date.localeCompare(b.date))
            },
            insights: {
                mostPopularBuildingMethod: Object.entries(buildingMethodCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
                mostPopularCMS: Object.entries(cmsTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
                mostPopularHosting: Object.entries(hostingCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
                mostCommonBusinessType: Object.entries(businessTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'
            },
            generatedAt: new Date().toISOString(),
            periodDays: days
        };
        return server_1.NextResponse.json({
            success: true,
            analytics
        });
    }
    catch (error) {
        console.error('[ONBOARDING] Analytics error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
