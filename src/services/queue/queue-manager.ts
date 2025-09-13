import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { EnhancedArticleGenerator, EnhancedArticleRequest } from '../content/enhanced-article-generator';
import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

// Redis connection configuration
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Supabase client for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Job data interfaces
interface AgentJobData {
  actionId: string;
  userToken: string;
  runId?: string;
  idempotencyKey: string;
  policy: {
    environment: 'DRY_RUN' | 'STAGING' | 'PRODUCTION';
    maxPages?: number;
    maxPatches?: number;
    timeoutMs?: number;
    requiresApproval?: boolean;
  };
  payload: Record<string, any>;
}

interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  stats: {
    executionTimeMs: number;
    pagesProcessed?: number;
    patchesApplied?: number;
  };
}

// Define queue names
export const QUEUE_NAMES = {
  AGENT_ACTIONS: 'agent-actions',
  CONTENT_GENERATION: 'content-generation',
  TECHNICAL_SEO: 'technical-seo',
  CMS_PUBLISHING: 'cms-publishing',
  VERIFICATION: 'verification',
  SCHEDULED_TASKS: 'scheduled-tasks'
} as const;

export class AgentQueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private events: Map<string, QueueEvents> = new Map();
  private workersStarted = false;

  constructor() {
    this.initializeQueues();
  }

  private initializeQueues() {
    // Initialize all queues
    Object.values(QUEUE_NAMES).forEach(queueName => {
      const queue = new Queue(queueName, {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50,      // Keep last 50 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      const events = new QueueEvents(queueName, {
        connection: redisConnection,
        // Reduce Redis command usage on Upstash by blocking longer between polls
        // Default is ~5s; set to 60s to cut commands ~12x for idle queues
        blockingTimeout: 300000,
      } as any);

      this.queues.set(queueName, queue);
      this.events.set(queueName, events);

      // Set up event listeners for logging
      this.setupEventListeners(queueName, events);
    });

    // Workers are started explicitly via startWorkers()
  }

  private setupEventListeners(queueName: string, events: QueueEvents) {
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

  private initializeWorkers() {
    // Agent Actions Worker
    const agentWorker = new Worker(
      QUEUE_NAMES.AGENT_ACTIONS,
      async (job: Job<AgentJobData>) => {
        return await this.processAgentAction(job);
      },
      {
        connection: redisConnection,
        concurrency: 5, // Process up to 5 jobs concurrently
      }
    );

    // Content Generation Worker
    const contentWorker = new Worker(
      QUEUE_NAMES.CONTENT_GENERATION,
      async (job: Job<AgentJobData>) => {
        return await this.processContentGeneration(job);
      },
      {
        connection: redisConnection,
        concurrency: 3,
      }
    );

    // Technical SEO Worker
    const seoWorker = new Worker(
      QUEUE_NAMES.TECHNICAL_SEO,
      async (job: Job<AgentJobData>) => {
        return await this.processTechnicalSEO(job);
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    // CMS Publishing Worker
    const cmsWorker = new Worker(
      QUEUE_NAMES.CMS_PUBLISHING,
      async (job: Job<AgentJobData>) => {
        return await this.processCMSPublishing(job);
      },
      {
        connection: redisConnection,
        concurrency: 2,
      }
    );

    // Verification Worker
    const verificationWorker = new Worker(
      QUEUE_NAMES.VERIFICATION,
      async (job: Job<AgentJobData>) => {
        return await this.processVerification(job);
      },
      {
        connection: redisConnection,
        concurrency: 10,
      }
    );

    this.workers.set(QUEUE_NAMES.AGENT_ACTIONS, agentWorker);
    this.workers.set(QUEUE_NAMES.CONTENT_GENERATION, contentWorker);
    this.workers.set(QUEUE_NAMES.TECHNICAL_SEO, seoWorker);
    this.workers.set(QUEUE_NAMES.CMS_PUBLISHING, cmsWorker);
    this.workers.set(QUEUE_NAMES.VERIFICATION, verificationWorker);
  }

  // Public method to start workers explicitly (idempotent)
  startWorkers() {
    if (this.workersStarted) return;
    this.initializeWorkers();
    this.workersStarted = true;
    console.log('[QUEUE MANAGER] Workers started');
  }

  // Queue a new agent action
  async queueAction(
    actionId: string,
    userToken: string,
    actionType: string,
    payload: Record<string, any>,
    policy: AgentJobData['policy'],
    options: {
      priority?: number;
      delay?: number;
      repeat?: any;
    } = {}
  ): Promise<string> {
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
      throw new Error(`Failed to create run record: ${error?.message}`);
    }

    // Determine which queue to use based on action type
    let queueName: string = QUEUE_NAMES.AGENT_ACTIONS;
    if (actionType.includes('content')) queueName = QUEUE_NAMES.CONTENT_GENERATION;
    else if (actionType.includes('seo') || actionType.includes('technical')) queueName = QUEUE_NAMES.TECHNICAL_SEO;
    else if (actionType.includes('cms') || actionType.includes('publish')) queueName = QUEUE_NAMES.CMS_PUBLISHING;
    else if (actionType.includes('verify')) queueName = QUEUE_NAMES.VERIFICATION;

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const jobData: AgentJobData = {
      actionId,
      userToken,
      runId: runData.id,
      idempotencyKey,
      policy,
      payload
    };

    const job = await queue.add(
      `action-${actionId}`,
      jobData,
      {
        priority: options.priority || 50,
        delay: options.delay || 0,
        repeat: options.repeat,
        jobId: idempotencyKey, // Use for idempotency
      }
    );

    // Update action status
    await this.updateActionStatus(actionId, 'queued');

    return job.id as string;
  }

  // Process different types of agent actions
  private async processAgentAction(job: Job<AgentJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { actionId, userToken, runId, policy, payload } = job.data;

    try {
      // Update run status to running
      await this.updateRunStatus(runId!, 'running', { started_at: new Date().toISOString() });
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

        await this.updateRunStatus(runId!, 'succeeded', { 
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

      await this.updateRunStatus(runId!, 'succeeded', {
        stats: result.stats,
        output_data: result.data,
        completed_at: new Date().toISOString(),
        duration_ms: result.stats.executionTimeMs
      });

      await this.updateActionStatus(actionId, 'needs_verification');

      return result;

    } catch (error) {
      const result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          executionTimeMs: Date.now() - startTime
        }
      };

      await this.updateRunStatus(runId!, 'failed', {
        error_details: result.error,
        completed_at: new Date().toISOString(),
        duration_ms: result.stats.executionTimeMs
      });

      await this.updateActionStatus(actionId, 'failed', result.error);

      throw error;
    }
  }

  private async processContentGeneration(job: Job<AgentJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { userToken, payload } = job.data as any;
    // Support both shapes: payload.{articleId,conversationId} and top-level fields
    const jd: any = job.data as any;
    const articleId = (payload?.articleId ?? jd.articleId) as number;
    const explicitConversationId = (payload?.conversationId ?? jd.conversationId) as string | undefined;
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
          cleaned_domain,
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

    const generator = new EnhancedArticleGenerator();
    const normalizeDomain = (d?: string | null): string | undefined => {
      if (!d) return undefined;
      let s = String(d).trim();
      s = s.replace(/^sc-domain:/i, '');
      s = s.replace(/^https?:\/\//i, '');
      s = s.replace(/^www\./i, '');
      // keep only hostname
      s = s.split('/')[0];
      return s || undefined;
    };
    const websiteDomain = normalizeDomain((article as any)?.websites?.cleaned_domain) 
      || normalizeDomain((article as any)?.websites?.domain);
    const req: EnhancedArticleRequest = {
      title: article.title,
      keywords: article.target_keywords || [],
      websiteDomain,
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
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
    } catch {}

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
      const websiteToken = article.websites?.website_token;
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
          conversationId = lastMsg?.conversation_id || crypto.randomUUID();
          nextOrder = (lastMsg?.message_order || 0) + 1;
        } else {
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
          nextOrder = (lastInConv?.message_order || 0) + 1;
        }

        console.log('[QUEUE CONTENT] Posting draft-ready message:', {
          userToken,
          websiteToken,
          conversationId,
          nextOrder,
          articleId,
          wordCount
        });

        const { error: insertError } = await supabase
          .from('agent_conversations')
          .insert({
            user_token: userToken,
            website_token: websiteToken,
            conversation_id: conversationId,
            message_role: 'assistant',
            message_content: `✅ Draft is ready: "${article.title}" (~${wordCount} words, ${(result.images||[]).length} images, ${(result.citations||[]).length} citations). You can review it in the Content tab.`,
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
                links: article.websites?.domain ? [
                  { label: 'Open Content', url: `/website/${article.websites.domain}` }
                ] : []
              }
            },
            metadata: { article_id: articleId }
          });

        if (insertError) {
          console.log('[QUEUE CONTENT] Draft-ready message insert failed:', insertError);
        } else {
          console.log('[QUEUE CONTENT] Draft-ready message inserted:', { conversationId, nextOrder, articleId });
        }
      }
    } catch (e) {
      console.log('[QUEUE CONTENT] Unable to post draft-ready message:', e);
    }

    return {
      success: true,
      stats: { executionTimeMs: Date.now() - startTime }
    };
  }

  private async processTechnicalSEO(job: Job<AgentJobData>): Promise<JobResult> {
    // Implement technical SEO processing logic
    const startTime = Date.now();
    // ... technical SEO implementation
    return {
      success: true,
      stats: { executionTimeMs: Date.now() - startTime }
    };
  }

  private async processCMSPublishing(job: Job<AgentJobData>): Promise<JobResult> {
    // Implement CMS publishing logic
    const startTime = Date.now();
    // ... CMS publishing implementation
    return {
      success: true,
      stats: { executionTimeMs: Date.now() - startTime }
    };
  }

  private async processVerification(job: Job<AgentJobData>): Promise<JobResult> {
    // Implement verification logic
    const startTime = Date.now();
    // ... verification implementation
    return {
      success: true,
      stats: { executionTimeMs: Date.now() - startTime }
    };
  }

  private async executeAction(payload: Record<string, any>) {
    // Placeholder for actual action execution
    // This would call the appropriate service based on action type
    return {
      message: 'Action executed successfully',
      pagesProcessed: 1,
      patchesApplied: 0
    };
  }

  private async updateActionStatus(actionId: string, status: string, errorMessage?: string) {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    
    if (status === 'running') updateData.started_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
    if (status === 'failed') {
      updateData.failed_at = new Date().toISOString();
      if (errorMessage) updateData.error_message = errorMessage;
    }

    await supabase
      .from('agent_actions')
      .update(updateData)
      .eq('id', actionId);
  }

  private async updateRunStatus(runId: string, status: string, additionalData: Record<string, any> = {}) {
    await supabase
      .from('agent_runs')
      .update({ status, ...additionalData })
      .eq('id', runId);
  }

  // Utility methods for queue management
  async getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

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

  async pauseQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) await queue.pause();
  }

  async resumeQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) await queue.resume();
  }

  async cleanQueue(queueName: string, olderThanMs: number = 24 * 60 * 60 * 1000) {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    await queue.clean(olderThanMs, 100, 'completed');
    await queue.clean(olderThanMs, 50, 'failed');
  }

  // Graceful shutdown
  async shutdown() {
    console.log('[QUEUE MANAGER] Shutting down gracefully...');
    
    // Close all workers first
    await Promise.all(
      Array.from(this.workers.values()).map(worker => worker.close())
    );

    // Close event listeners
    await Promise.all(
      Array.from(this.events.values()).map(events => events.close())
    );

    // Close queues
    await Promise.all(
      Array.from(this.queues.values()).map(queue => queue.close())
    );

    // Close Redis connection
    await redisConnection.quit();
    
    console.log('[QUEUE MANAGER] Shutdown complete');
  }
}

// Singleton instance
export const queueManager = new AgentQueueManager();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await queueManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await queueManager.shutdown();
  process.exit(0);
});
