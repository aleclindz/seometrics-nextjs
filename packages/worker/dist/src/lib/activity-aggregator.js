"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityAggregator = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = __importDefault(require("crypto"));
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class ActivityAggregator {
    userToken;
    siteUrl;
    sinceDate;
    constructor(userToken, siteUrl, sinceDays = 7) {
        this.userToken = userToken;
        this.siteUrl = siteUrl;
        this.sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    }
    async aggregateAllActivity() {
        const activities = [];
        // Collect activities from all sources
        const [schemaActivities, sitemapActivities, robotsActivities, urlInspectionActivities, technicalFixActivities] = await Promise.all([
            this.getSchemaGenerationActivities(),
            this.getSitemapActivities(),
            this.getRobotsAnalysisActivities(),
            this.getUrlInspectionActivities(),
            this.getTechnicalFixActivities()
        ]);
        activities.push(...schemaActivities, ...sitemapActivities, ...robotsActivities, ...urlInspectionActivities, ...technicalFixActivities);
        // Sort by timestamp descending (most recent first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Calculate period boundaries
        const periodEnd = new Date().toISOString();
        const periodStart = this.sinceDate.toISOString();
        // Generate hash for change detection
        const hash = this.generateActivityHash(activities);
        return {
            activities,
            periodStart,
            periodEnd,
            totalCount: activities.length,
            hash
        };
    }
    async getSchemaGenerationActivities() {
        try {
            const { data: schemaGenerations, error } = await supabase
                .from('schema_generations')
                .select('*')
                .eq('website_token', this.siteUrl.replace('https://', '').replace('http://', ''))
                .gte('generated_at', this.sinceDate.toISOString())
                .order('generated_at', { ascending: false })
                .limit(50);
            if (error) {
                console.error('Error fetching schema generations:', error);
                return [];
            }
            return (schemaGenerations || []).map(sg => ({
                timestamp: sg.generated_at,
                action: `Added ${Array.isArray(sg.schema_types) ? sg.schema_types.join(', ') : 'schema'} markup`,
                type: 'schema_generation',
                page: sg.page_url,
                details: {
                    schemaTypes: sg.schema_types,
                    schemasGenerated: sg.schemas_generated,
                    pageTitle: sg.page_title
                },
                status: 'success',
                impact: 'medium'
            }));
        }
        catch (error) {
            console.error('Error in getSchemaGenerationActivities:', error);
            return [];
        }
    }
    async getSitemapActivities() {
        try {
            const { data: sitemaps, error } = await supabase
                .from('sitemap_submissions')
                .select('*')
                .eq('user_token', this.userToken)
                .eq('site_url', this.siteUrl)
                .gte('created_at', this.sinceDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) {
                console.error('Error fetching sitemap submissions:', error);
                return [];
            }
            return (sitemaps || []).map(sitemap => ({
                timestamp: sitemap.created_at,
                action: sitemap.status === 'submitted'
                    ? `Generated and submitted sitemap to Google Search Console`
                    : `Generated sitemap`,
                type: 'sitemap_submission',
                details: {
                    status: sitemap.status,
                    sitemapUrl: sitemap.sitemap_url,
                    submittedAt: sitemap.submitted_at,
                    submissionMethod: sitemap.submission_method
                },
                status: 'success',
                impact: 'high'
            }));
        }
        catch (error) {
            console.error('Error in getSitemapActivities:', error);
            return [];
        }
    }
    async getRobotsAnalysisActivities() {
        try {
            const { data: robotsAnalyses, error } = await supabase
                .from('robots_analyses')
                .select('*')
                .eq('user_token', this.userToken)
                .eq('site_url', this.siteUrl)
                .gte('analyzed_at', this.sinceDate.toISOString())
                .order('analyzed_at', { ascending: false })
                .limit(10);
            if (error) {
                // If table doesn't exist yet, just return empty array
                if (error.code === '42P01') {
                    console.log('robots_analyses table not found, skipping robots analysis activities');
                    return [];
                }
                console.error('Error fetching robots analyses:', error);
                return [];
            }
            return (robotsAnalyses || []).map(robots => {
                const issuesCount = Array.isArray(robots.issues) ? robots.issues.length : 0;
                const suggestionsCount = Array.isArray(robots.suggestions) ? robots.suggestions.length : 0;
                let action = 'Analyzed robots.txt file';
                if (issuesCount > 0) {
                    action += ` and found ${issuesCount} issue${issuesCount > 1 ? 's' : ''} to fix`;
                }
                else if (robots.exists && robots.accessible) {
                    action += ' - everything looks good!';
                }
                else if (!robots.exists) {
                    action += ' - file not found, created recommendations';
                }
                return {
                    timestamp: robots.analyzed_at,
                    action,
                    type: 'robots_analysis',
                    details: {
                        exists: robots.exists,
                        accessible: robots.accessible,
                        size: robots.size,
                        issuesCount,
                        suggestionsCount,
                        issues: robots.issues,
                        suggestions: robots.suggestions
                    },
                    status: issuesCount > 0 ? 'warning' : 'success',
                    impact: issuesCount > 0 ? 'medium' : 'low'
                };
            });
        }
        catch (error) {
            console.error('Error in getRobotsAnalysisActivities:', error);
            return [];
        }
    }
    async getUrlInspectionActivities() {
        try {
            const { data: inspections, error } = await supabase
                .from('url_inspections')
                .select('*')
                .eq('user_token', this.userToken)
                .ilike('site_url', `%${this.siteUrl.replace('https://', '').replace('http://', '').replace('www.', '')}%`)
                .gte('inspected_at', this.sinceDate.toISOString())
                .order('inspected_at', { ascending: false })
                .limit(20);
            if (error) {
                console.error('Error fetching URL inspections:', error);
                return [];
            }
            // Group inspections by inspection batch (same timestamp)
            const inspectionGroups = new Map();
            (inspections || []).forEach(inspection => {
                const key = inspection.inspected_at;
                if (!inspectionGroups.has(key)) {
                    inspectionGroups.set(key, []);
                }
                inspectionGroups.get(key).push(inspection);
            });
            const activities = [];
            inspectionGroups.forEach((group, timestamp) => {
                const totalPages = group.length;
                const indexablePages = group.filter(i => i.can_be_indexed).length;
                const mobileFriendly = group.filter(i => i.mobile_usable).length;
                const withSchema = group.filter(i => i.rich_results_items > 0).length;
                const issues = group.filter(i => !i.can_be_indexed || !i.mobile_usable).length;
                let action = `Analyzed ${totalPages} page${totalPages > 1 ? 's' : ''} with Google Search Console`;
                if (issues > 0) {
                    action += ` and found ${issues} issue${issues > 1 ? 's' : ''} to address`;
                }
                activities.push({
                    timestamp,
                    action,
                    type: 'url_inspection',
                    details: {
                        totalPages,
                        indexablePages,
                        mobileFriendly,
                        withSchema,
                        issues
                    },
                    status: issues > 0 ? 'warning' : 'success',
                    impact: issues > 0 ? 'high' : 'medium'
                });
            });
            return activities;
        }
        catch (error) {
            console.error('Error in getUrlInspectionActivities:', error);
            return [];
        }
    }
    async getTechnicalFixActivities() {
        try {
            // Get technical fixes from audit_issues that were resolved
            const { data: auditIssues, error } = await supabase
                .from('audit_issues')
                .select('*')
                .eq('user_token', this.userToken)
                .eq('status', 'resolved')
                .gte('updated_at', this.sinceDate.toISOString())
                .order('updated_at', { ascending: false })
                .limit(20);
            if (error) {
                console.error('Error fetching technical fixes:', error);
                return [];
            }
            return (auditIssues || []).map(issue => ({
                timestamp: issue.updated_at,
                action: `Fixed ${issue.issue_type.replace(/_/g, ' ').toLowerCase()} issue`,
                type: 'technical_fix',
                page: issue.page_url,
                details: {
                    issueType: issue.issue_type,
                    description: issue.description,
                    severity: issue.severity,
                    fixMethod: issue.fix_method
                },
                status: 'success',
                impact: issue.severity === 'critical' ? 'high' :
                    issue.severity === 'warning' ? 'medium' : 'low'
            }));
        }
        catch (error) {
            console.error('Error in getTechnicalFixActivities:', error);
            return [];
        }
    }
    generateActivityHash(activities) {
        // Create a hash based on activity content for change detection
        const hashData = activities.map(activity => ({
            timestamp: activity.timestamp,
            action: activity.action,
            type: activity.type,
            status: activity.status
        }));
        return crypto_1.default
            .createHash('md5')
            .update(JSON.stringify(hashData))
            .digest('hex');
    }
    static async getCachedSummary(userToken, siteUrl) {
        try {
            const { data: summary, error } = await supabase
                .from('activity_summaries')
                .select('*')
                .eq('user_token', userToken)
                .eq('site_url', siteUrl)
                .gt('expires_at', new Date().toISOString())
                .single();
            if (error || !summary) {
                return null;
            }
            return summary;
        }
        catch (error) {
            console.error('Error getting cached summary:', error);
            return null;
        }
    }
    static async saveSummary(userToken, siteUrl, summaryText, aggregatedActivity, userId) {
        try {
            await supabase
                .from('activity_summaries')
                .upsert({
                user_id: userId,
                user_token: userToken,
                site_url: siteUrl,
                summary_text: summaryText,
                activity_period_start: aggregatedActivity.periodStart,
                activity_period_end: aggregatedActivity.periodEnd,
                activity_hash: aggregatedActivity.hash,
                activity_count: aggregatedActivity.totalCount,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }, {
                onConflict: 'user_token,site_url'
            });
        }
        catch (error) {
            console.error('Error saving activity summary:', error);
            throw error;
        }
    }
}
exports.ActivityAggregator = ActivityAggregator;
