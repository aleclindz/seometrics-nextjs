"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueManager = exports.AgentQueueManager = exports.QUEUE_NAMES = void 0;
const bullmq_1 = require("bullmq");
const enhanced_article_generator_1 = require("../content/enhanced-article-generator");
const ioredis_1 = __importDefault(require("ioredis"));
const supabase_js_1 = require("@supabase/supabase-js");
// Redis connection configuration
const redisConnection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
});
// Supabase client for database operations
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Define queue names
exports.QUEUE_NAMES = {
    AGENT_ACTIONS: 'agent-actions',
    CONTENT_GENERATION: 'content-generation',
    TECHNICAL_SEO: 'technical-seo',
    CMS_PUBLISHING: 'cms-publishing',
    VERIFICATION: 'verification',
    SCHEDULED_TASKS: 'scheduled-tasks'
};
class AgentQueueManager {
    constructor() {
        this.queues = new Map();
        this.workers = new Map();
        this.events = new Map();
        this.workersStarted = false;
        this.initializeQueues();
    }
    initializeQueues() {
        // Initialize all queues
        Object.values(exports.QUEUE_NAMES).forEach(queueName => {
            const queue = new bullmq_1.Queue(queueName, {
                connection: redisConnection,
                defaultJobOptions: {
                    removeOnComplete: 100, // Keep last 100 completed jobs
                    removeOnFail: 50, // Keep last 50 failed jobs
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            });
            const events = new bullmq_1.QueueEvents(queueName, {
                connection: redisConnection,
            });
            this.queues.set(queueName, queue);
            this.events.set(queueName, events);
            // Set up event listeners for logging
            this.setupEventListeners(queueName, events);
        });
        // Workers are started explicitly via startWorkers()
    }
    setupEventListeners(queueName, events) {
        events.on('completed', ({ jobId, returnvalue }) => {
            console.log(`[QUEUE:${queueName}] Job ${jobId} completed`);
        });
        events.on('failed', ({ jobId, failedReason }) => {
            console.error(`[QUEUE:${queueName}] Job ${jobId} failed: ${failedReason}`);
        });
        events.on('progress', ({ jobId, data }) => {
            console.log(`[QUEUE:${queueName}] Job ${jobId} progress: ${data}%`);
        });
    }
    initializeWorkers() {
        // Agent Actions Worker
        const agentWorker = new bullmq_1.Worker(exports.QUEUE_NAMES.AGENT_ACTIONS, async (job) => {
            return await this.processAgentAction(job);
        }, {
            connection: redisConnection,
            concurrency: 5, // Process up to 5 jobs concurrently
        });
        // Content Generation Worker
        const contentWorker = new bullmq_1.Worker(exports.QUEUE_NAMES.CONTENT_GENERATION, async (job) => {
            return await this.processContentGeneration(job);
        }, {
            connection: redisConnection,
            concurrency: 3,
        });
        // Technical SEO Worker
        const seoWorker = new bullmq_1.Worker(exports.QUEUE_NAMES.TECHNICAL_SEO, async (job) => {
            return await this.processTechnicalSEO(job);
        }, {
            connection: redisConnection,
            concurrency: 5,
        });
        // CMS Publishing Worker
        const cmsWorker = new bullmq_1.Worker(exports.QUEUE_NAMES.CMS_PUBLISHING, async (job) => {
            return await this.processCMSPublishing(job);
        }, {
            connection: redisConnection,
            concurrency: 2,
        });
        // Verification Worker
        const verificationWorker = new bullmq_1.Worker(exports.QUEUE_NAMES.VERIFICATION, async (job) => {
            return await this.processVerification(job);
        }, {
            connection: redisConnection,
            concurrency: 10,
        });
        this.workers.set(exports.QUEUE_NAMES.AGENT_ACTIONS, agentWorker);
        this.workers.set(exports.QUEUE_NAMES.CONTENT_GENERATION, contentWorker);
        this.workers.set(exports.QUEUE_NAMES.TECHNICAL_SEO, seoWorker);
        this.workers.set(exports.QUEUE_NAMES.CMS_PUBLISHING, cmsWorker);
        this.workers.set(exports.QUEUE_NAMES.VERIFICATION, verificationWorker);
    }
    // Public method to start workers explicitly (idempotent)
    startWorkers() {
        if (this.workersStarted)
            return;
        this.initializeWorkers();
        this.workersStarted = true;
        console.log('[QUEUE MANAGER] Workers started');
    }
    // Queue a new agent action
    async queueAction(actionId, userToken, actionType, payload, policy, options = {}) {
        const idempotencyKey = `${actionId}-${Date.now()}`;
        // Create run record in database
        const { data: runData, error } = await supabase
            .from('agent_runs')
            .insert({
            action_id: actionId,
            user_token: userToken,
            idempotency_key: idempotencyKey,
            policy,
            status: 'queued'
        })
            .select()
            .single();
        if (error || !runData) {
            throw new Error(`Failed to create run record: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
        // Determine which queue to use based on action type
        let queueName = exports.QUEUE_NAMES.AGENT_ACTIONS;
        if (actionType.includes('content'))
            queueName = exports.QUEUE_NAMES.CONTENT_GENERATION;
        else if (actionType.includes('seo') || actionType.includes('technical'))
            queueName = exports.QUEUE_NAMES.TECHNICAL_SEO;
        else if (actionType.includes('cms') || actionType.includes('publish'))
            queueName = exports.QUEUE_NAMES.CMS_PUBLISHING;
        else if (actionType.includes('verify'))
            queueName = exports.QUEUE_NAMES.VERIFICATION;
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not initialized`);
        }
        const jobData = {
            actionId,
            userToken,
            runId: runData.id,
            idempotencyKey,
            policy,
            payload
        };
        const job = await queue.add(`action-${actionId}`, jobData, {
            priority: options.priority || 50,
            delay: options.delay || 0,
            repeat: options.repeat,
            jobId: idempotencyKey, // Use for idempotency
        });
        // Update action status
        await this.updateActionStatus(actionId, 'queued');
        return job.id;
    }
    // Process different types of agent actions
    async processAgentAction(job) {
        const startTime = Date.now();
        const { actionId, userToken, runId, policy, payload } = job.data;
        try {
            // Update run status to running
            await this.updateRunStatus(runId, 'running', { started_at: new Date().toISOString() });
            await this.updateActionStatus(actionId, 'running');
            // Simulate action processing based on policy
            job.updateProgress(25);
            if (policy.environment === 'DRY_RUN') {
                // Simulate the action without making actual changes
                await new Promise(resolve => setTimeout(resolve, 1000));
                job.updateProgress(100);
                const result = {
                    success: true,
                    data: { message: 'Dry run completed successfully', payload },
                    stats: {
                        executionTimeMs: Date.now() - startTime,
                        pagesProcessed: 0,
                        patchesApplied: 0
                    }
                };
                await this.updateRunStatus(runId, 'succeeded', {
                    stats: result.stats,
                    output_data: result.data,
                    completed_at: new Date().toISOString(),
                    duration_ms: result.stats.executionTimeMs
                });
                await this.updateActionStatus(actionId, 'needs_verification');
                return result;
            }
            // Production execution would happen here
            job.updateProgress(50);
            // Process the actual action based on type
            const actionResult = await this.executeAction(payload);
            job.updateProgress(100);
            const result = {
                success: true,
                data: actionResult,
                stats: {
                    executionTimeMs: Date.now() - startTime,
                    pagesProcessed: actionResult.pagesProcessed || 0,
                    patchesApplied: actionResult.patchesApplied || 0
                }
            };
            await this.updateRunStatus(runId, 'succeeded', {
                stats: result.stats,
                output_data: result.data,
                completed_at: new Date().toISOString(),
                duration_ms: result.stats.executionTimeMs
            });
            await this.updateActionStatus(actionId, 'needs_verification');
            return result;
        }
        catch (error) {
            const result = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                stats: {
                    executionTimeMs: Date.now() - startTime
                }
            };
            await this.updateRunStatus(runId, 'failed', {
                error_details: result.error,
                completed_at: new Date().toISOString(),
                duration_ms: result.stats.executionTimeMs
            });
            await this.updateActionStatus(actionId, 'failed', result.error);
            throw error;
        }
    }
    async processContentGeneration(job) {
        var _a, _b, _c;
        const startTime = Date.now();
        const { userToken, payload } = job.data;
        const articleId = payload === null || payload === void 0 ? void 0 : payload.articleId;
        const explicitConversationId = payload === null || payload === void 0 ? void 0 : payload.conversationId;
        if (!articleId || !userToken) {
            throw new Error('Missing articleId or userToken');
        }
        // Load article + website
        const { data: article, error: fetchError } = await supabase
            .from('article_queue')
            .select(`
        *,
        websites:website_id (
          id,
          domain,
          website_token
        )
      `)
            .eq('id', articleId)
            .eq('user_token', userToken)
            .maybeSingle();
        if (fetchError || !article) {
            throw new Error('Article not found for content generation');
        }
        // Set status generating
        await supabase
            .from('article_queue')
            .update({ status: 'generating', updated_at: new Date().toISOString() })
            .eq('id', articleId);
        // Log start
        await supabase.from('article_generation_logs').insert({
            article_queue_id: articleId,
            step: 'content_generation',
            status: 'started',
            input_data: {
                targetKeywords: article.target_keywords || [],
                tone: 'professional',
                contentLength: 'medium',
                articleType: 'blog',
                includeImages: false,
                includeCitations: false
            }
        });
        const generator = new enhanced_article_generator_1.EnhancedArticleGenerator();
        const req = {
            title: article.title,
            keywords: article.target_keywords || [],
            websiteDomain: (_a = article.websites) === null || _a === void 0 ? void 0 : _a.domain,
            contentLength: 'medium',
            tone: 'professional',
            articleType: 'blog',
            includeCitations: true,
            referenceStyle: 'link',
            includeImages: true,
            numImages: 2,
            imageProvider: 'openai',
            imageStyle: 'clean, modern, web illustration, professional'
        };
        const result = await generator.generateComprehensiveArticle(req);
        const stripHtml = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = stripHtml(result.content).split(/\s+/).filter(Boolean).length;
        // Update queue row to generated
        await supabase
            .from('article_queue')
            .update({
            article_content: result.content,
            meta_title: result.metaTitle,
            meta_description: result.metaDescription,
            content_outline: result.contentOutline,
            word_count: wordCount,
            status: 'generated',
            updated_at: new Date().toISOString()
        })
            .eq('id', articleId);
        // Best-effort: persist extended fields if available
        try {
            await supabase
                .from('article_queue')
                .update({
                citations: result.citations || null,
                images: result.images || null,
                schema_json: result.schemaJson || null
            })
                .eq('id', articleId);
        }
        catch { }
        // Log completion
        await supabase.from('article_generation_logs').insert({
            article_queue_id: articleId,
            step: 'content_generation',
            status: 'completed',
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
            output_data: {
                wordCount,
                hasMetaTitle: !!result.metaTitle,
                hasMetaDescription: !!result.metaDescription,
                hasContentOutline: !!result.contentOutline,
                imagesCount: (result.images || []).length,
                citationsCount: (result.citations || []).length
            }
        });
        // Post a follow-up assistant message in chat: "Draft is ready"
        try {
            const websiteToken = (_b = article.websites) === null || _b === void 0 ? void 0 : _b.website_token;
            if (websiteToken) {
                let conversationId = explicitConversationId;
                let nextOrder = 1;
                if (!conversationId) {
                    // Find latest conversation for this site
                    const { data: lastMsg } = await supabase
                        .from('agent_conversations')
                        .select('conversation_id, message_order')
                        .eq('user_token', userToken)
                        .eq('website_token', websiteToken)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    conversationId = (lastMsg === null || lastMsg === void 0 ? void 0 : lastMsg.conversation_id) || crypto.randomUUID();
                    nextOrder = ((lastMsg === null || lastMsg === void 0 ? void 0 : lastMsg.message_order) || 0) + 1;
                }
                else {
                    // Compute next message_order within this conversation
                    const { data: lastInConv } = await supabase
                        .from('agent_conversations')
                        .select('message_order')
                        .eq('user_token', userToken)
                        .eq('website_token', websiteToken)
                        .eq('conversation_id', conversationId)
                        .order('message_order', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    nextOrder = ((lastInConv === null || lastInConv === void 0 ? void 0 : lastInConv.message_order) || 0) + 1;
                }
                await supabase
                    .from('agent_conversations')
                    .insert({
                    user_token: userToken,
                    website_token: websiteToken,
                    conversation_id: conversationId,
                    message_role: 'assistant',
                    message_content: `✅ Draft is ready: "${article.title}" (~${wordCount} words, ${(result.images || []).length} images, ${(result.citations || []).length} citations). You can review it in the Content tab.`,
                    message_order: nextOrder,
                    function_call: null,
                    action_card: {
                        type: 'progress',
                        data: {
                            title: 'Article Generated',
                            description: 'Draft created successfully. Images can be added later.',
                            progress: 100,
                            status: 'completed',
                            estimatedTime: 'Completed',
                            currentStep: 'Draft ready',
                            totalSteps: 2,
                            currentStepIndex: 2,
                            links: ((_c = article.websites) === null || _c === void 0 ? void 0 : _c.domain) ? [
                                { label: 'Open Content', url: `/website/${article.websites.domain}` }
                            ] : []
                        }
                    },
                    metadata: { article_id: articleId }
                });
            }
        }
        catch (e) {
            console.log('[QUEUE CONTENT] Unable to post draft-ready message:', e);
        }
        return {
            success: true,
            stats: { executionTimeMs: Date.now() - startTime }
        };
    }
    async processTechnicalSEO(job) {
        // Implement technical SEO processing logic
        const startTime = Date.now();
        // ... technical SEO implementation
        return {
            success: true,
            stats: { executionTimeMs: Date.now() - startTime }
        };
    }
    async processCMSPublishing(job) {
        // Implement CMS publishing logic
        const startTime = Date.now();
        // ... CMS publishing implementation
        return {
            success: true,
            stats: { executionTimeMs: Date.now() - startTime }
        };
    }
    async processVerification(job) {
        // Implement verification logic
        const startTime = Date.now();
        // ... verification implementation
        return {
            success: true,
            stats: { executionTimeMs: Date.now() - startTime }
        };
    }
    async executeAction(payload) {
        // Placeholder for actual action execution
        // This would call the appropriate service based on action type
        return {
            message: 'Action executed successfully',
            pagesProcessed: 1,
            patchesApplied: 0
        };
    }
    async updateActionStatus(actionId, status, errorMessage) {
        const updateData = { status, updated_at: new Date().toISOString() };
        if (status === 'running')
            updateData.started_at = new Date().toISOString();
        if (status === 'completed')
            updateData.completed_at = new Date().toISOString();
        if (status === 'failed') {
            updateData.failed_at = new Date().toISOString();
            if (errorMessage)
                updateData.error_message = errorMessage;
        }
        await supabase
            .from('agent_actions')
            .update(updateData)
            .eq('id', actionId);
    }
    async updateRunStatus(runId, status, additionalData = {}) {
        await supabase
            .from('agent_runs')
            .update({ status, ...additionalData })
            .eq('id', runId);
    }
    // Utility methods for queue management
    async getQueueStats(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue)
            throw new Error(`Queue ${queueName} not found`);
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed()
        ]);
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length
        };
    }
    async pauseQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue)
            await queue.pause();
    }
    async resumeQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue)
            await queue.resume();
    }
    async cleanQueue(queueName, olderThanMs = 24 * 60 * 60 * 1000) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return;
        await queue.clean(olderThanMs, 100, 'completed');
        await queue.clean(olderThanMs, 50, 'failed');
    }
    // Graceful shutdown
    async shutdown() {
        console.log('[QUEUE MANAGER] Shutting down gracefully...');
        // Close all workers first
        await Promise.all(Array.from(this.workers.values()).map(worker => worker.close()));
        // Close event listeners
        await Promise.all(Array.from(this.events.values()).map(events => events.close()));
        // Close queues
        await Promise.all(Array.from(this.queues.values()).map(queue => queue.close()));
        // Close Redis connection
        await redisConnection.quit();
        console.log('[QUEUE MANAGER] Shutdown complete');
    }
}
exports.AgentQueueManager = AgentQueueManager;
// Singleton instance
exports.queueManager = new AgentQueueManager();
// Graceful shutdown handling
process.on('SIGINT', async () => {
    await exports.queueManager.shutdown();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await exports.queueManager.shutdown();
    process.exit(0);
});
