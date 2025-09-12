"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class WorkflowEngine {
    // Predefined workflow templates for common SEO scenarios
    static WORKFLOW_TEMPLATES = [
        {
            id: 'new_site_seo_setup',
            name: 'New Site SEO Setup',
            description: 'Complete SEO setup for a new website',
            category: 'setup',
            triggers: ['new site', 'seo setup', 'initial optimization'],
            estimatedDuration: 45,
            riskLevel: 'low',
            actions: [
                {
                    id: 'crawl_site',
                    actionType: 'technical_seo_crawl',
                    title: 'Initial site crawl and analysis',
                    description: 'Comprehensive crawl to identify all pages and technical issues',
                    payload: { crawl_type: 'full', max_pages: 100 },
                    policy: { environment: 'PRODUCTION', respectRobots: true },
                    order: 1,
                    parallelizable: false,
                    estimatedDuration: 15
                },
                {
                    id: 'install_seoagent',
                    actionType: 'seoagent_installation',
                    title: 'Install SEOAgent.js tracking',
                    description: 'Set up automatic meta and alt tag generation',
                    payload: { generate_snippet: true, enable_automation: true },
                    policy: { environment: 'PRODUCTION' },
                    order: 2,
                    parallelizable: true,
                    estimatedDuration: 5
                },
                {
                    id: 'generate_sitemap',
                    actionType: 'sitemap_generation',
                    title: 'Generate and submit sitemap',
                    description: 'Create XML sitemap and submit to Google Search Console',
                    payload: { include_images: true, submit_to_gsc: true },
                    policy: { environment: 'PRODUCTION' },
                    order: 3,
                    dependsOn: ['crawl_site'],
                    parallelizable: true,
                    estimatedDuration: 10
                },
                {
                    id: 'fix_technical_issues',
                    actionType: 'technical_seo_fix',
                    title: 'Fix critical technical SEO issues',
                    description: 'Auto-fix issues found during crawl',
                    payload: { fix_types: ['schema_markup', 'canonical_tags', 'meta_tags'] },
                    policy: { environment: 'DRY_RUN', requiresApproval: true },
                    order: 4,
                    dependsOn: ['crawl_site'],
                    parallelizable: false,
                    estimatedDuration: 15
                }
            ],
            dependencies: [
                {
                    type: 'integration',
                    requirement: 'google_search_console',
                    description: 'Google Search Console connection for sitemap submission',
                    optional: true
                },
                {
                    type: 'permission',
                    requirement: 'website_management',
                    description: 'Website must be marked as managed',
                    optional: false
                }
            ]
        },
        {
            id: 'content_optimization_workflow',
            name: 'Content SEO Optimization',
            description: 'Optimize existing content for better search performance',
            category: 'content',
            triggers: ['content optimization', 'improve rankings', 'page optimization'],
            estimatedDuration: 30,
            riskLevel: 'medium',
            actions: [
                {
                    id: 'analyze_content_gaps',
                    actionType: 'content_analysis',
                    title: 'Analyze content performance and gaps',
                    description: 'Identify underperforming content and optimization opportunities',
                    payload: { include_competitors: true, min_impressions: 100 },
                    policy: { environment: 'PRODUCTION' },
                    order: 1,
                    parallelizable: false,
                    estimatedDuration: 10
                },
                {
                    id: 'optimize_meta_tags',
                    actionType: 'technical_seo_fix',
                    title: 'Optimize meta titles and descriptions',
                    description: 'Update meta tags based on performance data',
                    payload: { fix_types: ['meta_tags'], focus_low_ctr: true },
                    policy: { environment: 'DRY_RUN', requiresApproval: true },
                    order: 2,
                    dependsOn: ['analyze_content_gaps'],
                    parallelizable: false,
                    estimatedDuration: 15
                },
                {
                    id: 'generate_related_content',
                    actionType: 'content_generation',
                    title: 'Generate supporting content',
                    description: 'Create content for identified gaps',
                    payload: { content_type: 'supporting_articles', max_articles: 3 },
                    policy: { environment: 'DRY_RUN', requiresApproval: true },
                    order: 3,
                    dependsOn: ['analyze_content_gaps'],
                    parallelizable: true,
                    estimatedDuration: 20
                }
            ],
            dependencies: [
                {
                    type: 'integration',
                    requirement: 'google_search_console',
                    description: 'GSC data needed for performance analysis',
                    optional: false
                },
                {
                    type: 'data',
                    requirement: 'search_performance_data',
                    description: 'At least 3 months of search performance data',
                    optional: false
                }
            ]
        },
        {
            id: 'technical_seo_audit_fix',
            name: 'Technical SEO Audit & Fix',
            description: 'Comprehensive technical SEO audit with automated fixes',
            category: 'technical',
            triggers: ['technical audit', 'seo issues', 'site health'],
            estimatedDuration: 60,
            riskLevel: 'high',
            actions: [
                {
                    id: 'comprehensive_crawl',
                    actionType: 'technical_seo_crawl',
                    title: 'Deep technical SEO crawl',
                    description: 'Comprehensive site crawl with technical analysis',
                    payload: { crawl_type: 'technical_seo', max_pages: 500, crawl_depth: 5 },
                    policy: { environment: 'PRODUCTION', respectRobots: true },
                    order: 1,
                    parallelizable: false,
                    estimatedDuration: 20
                },
                {
                    id: 'analyze_core_vitals',
                    actionType: 'performance_analysis',
                    title: 'Core Web Vitals analysis',
                    description: 'Analyze page speed and core web vitals',
                    payload: { check_mobile: true, include_recommendations: true },
                    policy: { environment: 'PRODUCTION' },
                    order: 2,
                    dependsOn: ['comprehensive_crawl'],
                    parallelizable: true,
                    estimatedDuration: 15
                },
                {
                    id: 'fix_critical_issues',
                    actionType: 'technical_seo_fix',
                    title: 'Fix critical technical issues',
                    description: 'Automatically fix high-priority technical issues',
                    payload: { fix_types: ['schema_markup', 'canonical_tags', 'robots_issues'], priority: 'critical' },
                    policy: { environment: 'STAGING', requiresApproval: true, maxPages: 50 },
                    order: 3,
                    dependsOn: ['comprehensive_crawl'],
                    parallelizable: false,
                    estimatedDuration: 25
                },
                {
                    id: 'update_sitemaps',
                    actionType: 'sitemap_management',
                    title: 'Update and optimize sitemaps',
                    description: 'Regenerate sitemaps and submit to search engines',
                    payload: { update_existing: true, submit_to_gsc: true },
                    policy: { environment: 'PRODUCTION' },
                    order: 4,
                    dependsOn: ['fix_critical_issues'],
                    parallelizable: true,
                    estimatedDuration: 10
                }
            ],
            dependencies: [
                {
                    type: 'permission',
                    requirement: 'technical_modifications',
                    description: 'Permission to make technical changes to the website',
                    optional: false
                },
                {
                    type: 'integration',
                    requirement: 'google_search_console',
                    description: 'GSC integration for sitemap submission',
                    optional: true
                }
            ]
        }
    ];
    /**
     * Analyze an idea and suggest the best workflow template
     */
    static suggestWorkflow(ideaTitle, ideaHypothesis, evidence) {
        const searchText = `${ideaTitle} ${ideaHypothesis || ''}`.toLowerCase();
        // Score each template based on trigger keyword matches
        const scores = this.WORKFLOW_TEMPLATES.map(template => {
            let score = 0;
            template.triggers.forEach(trigger => {
                if (searchText.includes(trigger.toLowerCase())) {
                    score += 1;
                }
            });
            // Boost score based on evidence
            if (evidence) {
                if (evidence.site_age === 'new' && template.category === 'setup')
                    score += 2;
                if (evidence.has_technical_issues && template.category === 'technical')
                    score += 2;
                if (evidence.content_performance === 'poor' && template.category === 'content')
                    score += 2;
            }
            return { template, score };
        });
        // Return the highest scoring template (minimum score of 1)
        const best = scores.reduce((max, current) => current.score > max.score ? current : max);
        return best.score > 0 ? best.template : null;
    }
    /**
     * Create an execution plan for a workflow template
     */
    static async createExecutionPlan(ideaId, workflowTemplate, userToken, siteUrl) {
        console.log(`[WORKFLOW] Creating execution plan for idea ${ideaId} using template ${workflowTemplate.name}`);
        // Check dependencies
        const missingDependencies = await this.checkDependencies(workflowTemplate.dependencies, userToken, siteUrl);
        // Build dependency graph and execution order
        const executionOrder = this.buildExecutionOrder(workflowTemplate.actions);
        // Identify blocked actions
        const blockedActions = [];
        const readyActions = [];
        workflowTemplate.actions.forEach(action => {
            const missingForAction = missingDependencies.filter(dep => this.actionRequiresDependency(action, dep.requirement));
            if (missingForAction.length > 0) {
                blockedActions.push({
                    actionId: action.id,
                    reason: 'Missing dependencies',
                    missingDependencies: missingForAction.map(d => d.requirement)
                });
            }
            else {
                // Check if dependencies within workflow are satisfied
                const workflowDepsReady = action.dependsOn?.every(depId => readyActions.includes(depId) || executionOrder[0].includes(depId)) ?? true;
                if (workflowDepsReady) {
                    readyActions.push(action.id);
                }
                else {
                    blockedActions.push({
                        actionId: action.id,
                        reason: 'Workflow dependencies not ready',
                        missingDependencies: action.dependsOn || []
                    });
                }
            }
        });
        // Generate warnings
        const warnings = [];
        if (blockedActions.length > 0) {
            warnings.push(`${blockedActions.length} actions are blocked due to missing dependencies`);
        }
        if (workflowTemplate.riskLevel === 'high') {
            warnings.push('This is a high-risk workflow that requires careful monitoring');
        }
        // Calculate total duration (accounting for parallelization)
        const totalDuration = executionOrder.reduce((sum, batch) => {
            const batchDuration = Math.max(...batch.map(actionId => {
                const action = workflowTemplate.actions.find(a => a.id === actionId);
                return action?.estimatedDuration || 10;
            }));
            return sum + batchDuration;
        }, 0);
        return {
            ideaId,
            workflowTemplate,
            executionOrder,
            totalEstimatedDuration: totalDuration,
            readyActions,
            blockedActions,
            warnings
        };
    }
    /**
     * Execute a workflow plan by creating and queuing actions
     */
    static async executeWorkflowPlan(plan, userToken, siteUrl) {
        console.log(`[WORKFLOW] Executing workflow plan for idea ${plan.ideaId}`);
        const createdActions = [];
        try {
            // Create actions for each step in the workflow
            for (const action of plan.workflowTemplate.actions) {
                // Skip blocked actions
                if (plan.blockedActions.some(blocked => blocked.actionId === action.id)) {
                    console.log(`[WORKFLOW] Skipping blocked action: ${action.id}`);
                    continue;
                }
                // Create the action in database
                const { data: createdAction, error } = await supabase
                    .from('agent_actions')
                    .insert({
                    idea_id: plan.ideaId,
                    user_token: userToken,
                    site_url: siteUrl,
                    action_type: action.actionType,
                    title: action.title,
                    description: action.description,
                    payload: action.payload,
                    policy: {
                        ...action.policy,
                        workflow_order: action.order,
                        workflow_dependencies: action.dependsOn || [],
                        estimated_duration: action.estimatedDuration
                    },
                    priority_score: this.calculatePriorityScore(action, plan.workflowTemplate.riskLevel),
                    status: 'proposed'
                })
                    .select()
                    .single();
                if (error) {
                    console.error(`[WORKFLOW] Failed to create action ${action.id}:`, error);
                    continue;
                }
                createdActions.push(createdAction.id);
                console.log(`[WORKFLOW] Created action ${createdAction.id}: ${action.title}`);
            }
            // Update idea status to adopted
            await supabase
                .from('agent_ideas')
                .update({
                status: 'adopted',
                adopted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
                .eq('id', plan.ideaId);
            const message = `Workflow "${plan.workflowTemplate.name}" created with ${createdActions.length} actions. ` +
                `Estimated completion: ${plan.totalEstimatedDuration} minutes. ` +
                (plan.warnings.length > 0 ? `Warnings: ${plan.warnings.join(', ')}` : '');
            return {
                actionIds: createdActions,
                message
            };
        }
        catch (error) {
            console.error('[WORKFLOW] Execution error:', error);
            throw new Error(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get workflow templates by category or search
     */
    static getWorkflowTemplates(category, searchTerm) {
        let templates = this.WORKFLOW_TEMPLATES;
        if (category) {
            templates = templates.filter(t => t.category === category);
        }
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            templates = templates.filter(t => t.name.toLowerCase().includes(search) ||
                t.description.toLowerCase().includes(search) ||
                t.triggers.some(trigger => trigger.includes(search)));
        }
        return templates;
    }
    /**
     * Private helper methods
     */
    static async checkDependencies(dependencies, userToken, siteUrl) {
        const missing = [];
        for (const dependency of dependencies) {
            const satisfied = await this.isDependencySatisfied(dependency, userToken, siteUrl);
            if (!satisfied) {
                missing.push(dependency);
            }
        }
        return missing;
    }
    static async isDependencySatisfied(dependency, userToken, siteUrl) {
        try {
            switch (dependency.type) {
                case 'integration':
                    return await this.checkIntegrationDependency(dependency.requirement, userToken, siteUrl);
                case 'permission':
                    return await this.checkPermissionDependency(dependency.requirement, userToken, siteUrl);
                case 'data':
                    return await this.checkDataDependency(dependency.requirement, userToken, siteUrl);
                default:
                    return true;
            }
        }
        catch (error) {
            console.error(`[WORKFLOW] Dependency check error for ${dependency.requirement}:`, error);
            return dependency.optional;
        }
    }
    static async checkIntegrationDependency(requirement, userToken, siteUrl) {
        switch (requirement) {
            case 'google_search_console':
                const { data: gscData } = await supabase
                    .from('gsc_properties')
                    .select('id')
                    .eq('user_token', userToken)
                    .eq('site_url', siteUrl)
                    .eq('is_active', true)
                    .limit(1);
                return !!(gscData && gscData.length > 0);
            default:
                return false;
        }
    }
    static async checkPermissionDependency(requirement, userToken, siteUrl) {
        switch (requirement) {
            case 'website_management':
                const { data: website } = await supabase
                    .from('websites')
                    .select('is_managed')
                    .eq('user_token', userToken)
                    .ilike('domain', `%${siteUrl.replace(/^https?:\/\//, '')}%`)
                    .single();
                return website?.is_managed || false;
            case 'technical_modifications':
                // For now, same as website_management, but could be more granular
                return this.checkPermissionDependency('website_management', userToken, siteUrl);
            default:
                return false;
        }
    }
    static async checkDataDependency(requirement, userToken, siteUrl) {
        switch (requirement) {
            case 'search_performance_data':
                const { data: perfData } = await supabase
                    .from('gsc_performance_data')
                    .select('id')
                    .eq('user_token', userToken)
                    .gte('date_start', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // 90 days ago
                    .limit(1);
                return !!(perfData && perfData.length > 0);
            default:
                return false;
        }
    }
    static buildExecutionOrder(actions) {
        const sorted = actions.sort((a, b) => a.order - b.order);
        const batches = [];
        // Group actions that can run in parallel
        let currentBatch = [];
        let currentOrder = sorted[0]?.order || 1;
        for (const action of sorted) {
            if (action.order === currentOrder && action.parallelizable) {
                currentBatch.push(action.id);
            }
            else {
                if (currentBatch.length > 0) {
                    batches.push(currentBatch);
                }
                currentBatch = [action.id];
                currentOrder = action.order;
            }
        }
        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }
        return batches;
    }
    static actionRequiresDependency(action, requirement) {
        // Simple mapping - in a real system this would be more sophisticated
        const actionDependencyMap = {
            'sitemap_generation': ['google_search_console'],
            'technical_seo_fix': ['website_management'],
            'content_analysis': ['google_search_console', 'search_performance_data']
        };
        return actionDependencyMap[action.actionType]?.includes(requirement) || false;
    }
    static calculatePriorityScore(action, workflowRisk) {
        let score = 50; // Base priority
        // Lower order = higher priority
        score += (10 - action.order) * 5;
        // Higher risk workflows get higher priority
        if (workflowRisk === 'high')
            score += 10;
        else if (workflowRisk === 'medium')
            score += 5;
        // Shorter duration gets slight priority boost
        if (action.estimatedDuration < 10)
            score += 5;
        return Math.min(100, Math.max(1, score));
    }
}
exports.WorkflowEngine = WorkflowEngine;
