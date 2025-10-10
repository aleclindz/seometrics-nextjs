import { z } from 'zod';

/**
 * Function Schemas with Zod Validation
 * 
 * This file contains:
 * - OpenAI function schemas for tool calling
 * - Zod schemas for argument validation
 * - Schema registry for dynamic tool exposure
 */

// Custom URL validation that accepts domains with or without protocol
const flexibleUrlSchema = z.string().transform((val, ctx) => {
  // Handle domain without protocol or special GSC formats
  if (val.startsWith('sc-domain:')) {
    return val; // Keep GSC domain format as is
  }
  
  // If it's just a domain, add https://
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    return `https://${val}`;
  }
  
  // Validate as URL
  try {
    new URL(val);
    return val;
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must be a valid URL or domain'
    });
    return z.NEVER;
  }
});

// Zod validation schemas
export const ConnectGSCSchema = z.object({
  site_url: flexibleUrlSchema
});

export const SyncGSCDataSchema = z.object({
  site_url: flexibleUrlSchema
});

export const GenerateArticleSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  target_keywords: z.array(z.string()).optional(),
  content_type: z.enum(['blog_post', 'landing_page', 'guide']).default('blog_post'),
  word_count: z.number().min(300).max(5000).default(1500),
  site_url: flexibleUrlSchema.optional()
});

export const CreateIdeaSchema = z.object({
  site_url: flexibleUrlSchema,
  title: z.string().min(1, 'Title is required'),
  hypothesis: z.string().min(10, 'Hypothesis must be at least 10 characters'),
  evidence: z.record(z.any()).default({}),
  ice_score: z.number().min(1).max(100).default(70)
});

export const GetSiteStatusSchema = z.object({
  site_url: flexibleUrlSchema
});

export const AuditSiteSchema = z.object({
  site_url: flexibleUrlSchema,
  include_gsc_data: z.boolean().default(true),
  audit_type: z.enum(['technical', 'content', 'performance', 'full']).default('full')
});

export const AutonomousTopicSelectionSchema = z.object({
  site_url: flexibleUrlSchema.optional(),
  analysis_type: z.enum(['comprehensive', 'quick']).optional().default('comprehensive'),
  focus_area: z.string().optional()
});

export const BulkArticleIdeasSchema = z.object({
  site_url: flexibleUrlSchema.optional(),
  period: z.enum(['week', 'month']).optional().default('week'),
  count: z.number().int().min(1).max(50).optional(),
  add_to_queue: z.boolean().optional().default(false),
  website_token: z.string().optional()
});

export const QueueManagementSchema = z.object({
  site_url: flexibleUrlSchema.optional(),
  website_token: z.string().optional(),
  action: z.enum(['view', 'analyze', 'status']).optional().default('view'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  status_filter: z.enum(['draft', 'pending', 'generating', 'completed']).optional()
});

export const AddToQueueSchema = z.object({
  topic: z.string().min(1),
  site_url: flexibleUrlSchema.optional(),
  website_token: z.string().optional(),
  priority: z.number().int().min(1).max(10).optional().default(1),
  scheduled_date: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  format: z.enum(['listicle', 'how-to', 'guide', 'faq', 'comparison', 'update', 'case-study', 'beginner-guide']).optional(),
  authority_level: z.enum(['foundation', 'intermediate', 'advanced']).optional().default('foundation'),
  word_count: z.number().int().min(500).max(5000).optional().default(1500)
});

export const RemoveFromQueueSchema = z.object({
  identifier: z.union([z.string(), z.number()]),
  site_url: flexibleUrlSchema.optional(),
  website_token: z.string().optional()
});

export const ReorderQueueSchema = z.object({
  strategy: z.enum(['priority', 'date', 'format', 'authority', 'traffic']).optional(),
  custom_order: z.array(z.object({
    id: z.number().int(),
    position: z.number().int()
  })).optional(),
  site_url: flexibleUrlSchema.optional(),
  website_token: z.string().optional()
});

export const StrategyInitializeSchema = z.object({
  site_url: flexibleUrlSchema,
  brand: z.string().min(1, 'Brand name is required'),
  geo_focus: z.array(z.string()).min(1, 'At least one geographic region is required'),
  seed_topics: z.array(z.string()).min(1, 'At least 1 seed topic is required').max(10, 'Maximum 10 seed topics'),
  seed_urls: z.array(z.string()).optional(),
  raw_owner_context: z.string().optional(),
  max_clusters: z.number().int().optional().default(12),
  min_clusters: z.number().int().optional().default(3),
  include_local_slices: z.boolean().optional().default(false)
});

// Type inference from Zod schemas
export type ConnectGSCArgs = z.infer<typeof ConnectGSCSchema>;
export type SyncGSCDataArgs = z.infer<typeof SyncGSCDataSchema>;
export type GenerateArticleArgs = z.infer<typeof GenerateArticleSchema>;
export type CreateIdeaArgs = z.infer<typeof CreateIdeaSchema>;
export type GetSiteStatusArgs = z.infer<typeof GetSiteStatusSchema>;
export type AuditSiteArgs = z.infer<typeof AuditSiteSchema>;
export type AutonomousTopicSelectionArgs = z.infer<typeof AutonomousTopicSelectionSchema>;
export type BulkArticleIdeasArgs = z.infer<typeof BulkArticleIdeasSchema>;
export type QueueManagementArgs = z.infer<typeof QueueManagementSchema>;
export type AddToQueueArgs = z.infer<typeof AddToQueueSchema>;
export type RemoveFromQueueArgs = z.infer<typeof RemoveFromQueueSchema>;
export type ReorderQueueArgs = z.infer<typeof ReorderQueueSchema>;
export type StrategyInitializeArgs = z.infer<typeof StrategyInitializeSchema>;

// Function schema registry with validation
export interface FunctionDefinition {
  schema: any; // OpenAI function schema
  validator: z.ZodSchema; // Zod validation schema
  category: 'setup' | 'optimization' | 'content' | 'monitoring' | 'analytics' | 'seo' | 'cms' | 'verification';
  requiresSetup: boolean;
}

export const FUNCTION_REGISTRY: Record<string, FunctionDefinition> = {
  // Agent capability functions
  'GSC_sync_data': {
    schema: {
      name: 'GSC_sync_data',
      description: 'Sync Google Search Console data',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL to sync GSC data for' },
          date_range: { type: 'string', description: 'Date range for data sync (e.g., "30d", "3m")', default: '30d' }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: flexibleUrlSchema,
      date_range: z.string().optional().default('30d')
    }),
    category: 'analytics',
    requiresSetup: true
  },

  // ===== Keyword Strategy functions =====
  'KEYWORDS_get_strategy': {
    schema: {
      name: 'KEYWORDS_get_strategy',
      description: 'Get the current keyword strategy (tracked keywords and clusters) for a website',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional; primary site used if omitted)' }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional()
    }),
    category: 'content',
    requiresSetup: false
  },

  'KEYWORDS_add_keywords': {
    schema: {
      name: 'KEYWORDS_add_keywords',
      description: 'Add keywords to the strategy (tracked keywords) with optional types and clusters. Use this to save keywords for tracking, performance monitoring, and content planning.',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional; primary site used if omitted)' },
          keywords: {
            type: 'array',
            description: 'Keywords to add to strategy. At least one keyword is required.',
            items: {
              type: 'object',
              properties: {
                keyword: { type: 'string', description: 'Keyword phrase' },
                keyword_type: { type: 'string', enum: ['primary', 'secondary', 'long_tail'], default: 'long_tail' },
                topic_cluster: { type: 'string', description: 'Optional topic cluster name' }
              },
              required: ['keyword']
            }
          }
        },
        required: ['keywords'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional(),
      keywords: z.array(z.object({
        keyword: z.string().min(1, 'Keyword phrase cannot be empty'),
        keyword_type: z.enum(['primary', 'secondary', 'long_tail']).optional().default('long_tail'),
        topic_cluster: z.string().optional()
      })).min(1, 'At least one keyword is required to add to strategy')
    }),
    category: 'content',
    requiresSetup: false
  },

  'KEYWORDS_brainstorm': {
    schema: {
      name: 'KEYWORDS_brainstorm',
      description: 'Brainstorm long-tail keyword ideas for a website',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional; primary site used if omitted)' },
          base_keywords: { type: 'array', items: { type: 'string' }, description: 'Seed keywords to guide brainstorming' },
          topic_focus: { type: 'string', description: 'Optional topic/theme to focus keyword ideas' },
          generate_count: { type: 'integer', description: 'How many keywords to generate', default: 10 },
          avoid_duplicates: { type: 'boolean', description: 'Avoid duplicates from tracked keywords', default: true }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional(),
      base_keywords: z.array(z.string()).optional().default([]),
      topic_focus: z.string().optional(),
      generate_count: z.number().int().optional().default(10),
      avoid_duplicates: z.boolean().optional().default(true)
    }),
    category: 'content',
    requiresSetup: false
  },
  'KEYWORDS_brainstorm_auto': {
    schema: {
      name: 'KEYWORDS_brainstorm_auto',
      description: 'Automatically brainstorm keyword ideas for a website using existing GSC data when available, or by quickly crawling the homepage to infer seed topics. No seeds required.',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL or domain (optional; primary site used if omitted)' },
          generate_count: { type: 'integer', description: 'How many keywords to generate', default: 15 },
          avoid_duplicates: { type: 'boolean', description: 'Avoid duplicates from tracked keywords', default: true }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional(),
      generate_count: z.number().int().optional().default(15),
      avoid_duplicates: z.boolean().optional().default(true)
    }),
    category: 'content',
    requiresSetup: false
  },

  'STRATEGY_initialize': {
    schema: {
      name: 'STRATEGY_initialize',
      description: 'Initialize SEO content strategy by running Master Discovery. Creates 3-12 topic clusters with pillar and supporting articles (3 for small businesses, 5+ for larger sites). Requires site URL, brand, geographic focus, and seed topics.',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL or domain' },
          brand: { type: 'string', description: 'Brand name' },
          geo_focus: { type: 'array', items: { type: 'string' }, description: 'Geographic regions to target (e.g., ["United States", "Miami"])' },
          seed_topics: { type: 'array', items: { type: 'string' }, description: 'Seed topics for strategy (1-10 topics)' },
          seed_urls: { type: 'array', items: { type: 'string' }, description: 'Optional URLs to scrape for content analysis' },
          raw_owner_context: { type: 'string', description: 'Optional: Business description, target audience, unique value prop' },
          max_clusters: { type: 'integer', description: 'Maximum clusters to create', default: 12 },
          min_clusters: { type: 'integer', description: 'Minimum clusters to create', default: 3 },
          include_local_slices: { type: 'boolean', description: 'Include geo-specific article variations', default: false }
        },
        required: ['site_url', 'brand', 'geo_focus', 'seed_topics'],
        additionalProperties: false
      }
    },
    validator: StrategyInitializeSchema,
    category: 'content',
    requiresSetup: false
  },

  'CONTENT_optimize_existing': {
    schema: {
      name: 'CONTENT_optimize_existing',
      description: 'Optimize existing page content for better SEO performance',
      parameters: {
        type: 'object',
        properties: {
          page_url: { type: 'string', description: 'URL of the page to optimize' },
          target_keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to optimize for' }
        },
        required: ['page_url', 'target_keywords'],
        additionalProperties: false
      }
    },
    validator: z.object({
      page_url: flexibleUrlSchema,
      target_keywords: z.array(z.string())
    }),
    category: 'content',
    requiresSetup: false
  },

  'SEO_apply_fixes': {
    schema: {
      name: 'SEO_apply_fixes',
      description: 'Apply automated technical SEO fixes to a website',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL to apply fixes to' },
          fix_types: { type: 'array', items: { type: 'string' }, description: 'Types of fixes to apply' }
        },
        required: ['site_url', 'fix_types'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: flexibleUrlSchema,
      fix_types: z.array(z.string())
    }),
    category: 'seo',
    requiresSetup: false
  },

  'SEO_analyze_technical': {
    schema: {
      name: 'SEO_analyze_technical',
      description: 'Analyze technical SEO issues on a website',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL to analyze' },
          check_mobile: { type: 'boolean', description: 'Include mobile-specific checks', default: true }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: flexibleUrlSchema,
      check_mobile: z.boolean().optional().default(true)
    }),
    category: 'seo',
    requiresSetup: false
  },

  'SEO_crawl_website': {
    schema: {
      name: 'SEO_crawl_website',
      description: 'Crawl website for comprehensive technical SEO analysis',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL to crawl' },
          max_pages: { type: 'integer', description: 'Maximum pages to crawl', default: 50 },
          crawl_depth: { type: 'integer', description: 'Maximum crawl depth', default: 3 }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: flexibleUrlSchema,
      max_pages: z.number().int().min(1).max(1000).optional().default(50),
      crawl_depth: z.number().int().min(1).max(10).optional().default(3)
    }),
    category: 'seo',
    requiresSetup: false
  },

  'SEO_get_crawl_results': {
    schema: {
      name: 'SEO_get_crawl_results',
      description: 'Fetch results for a previously started site crawl (Firecrawl-backed) and summarize basic technical SEO signals',
      parameters: {
        type: 'object',
        properties: {
          job_id: { type: 'string', description: 'ID of the crawl job to fetch' }
        },
        required: ['job_id'],
        additionalProperties: false
      }
    },
    validator: z.object({
      job_id: z.string().min(1)
    }),
    category: 'seo',
    requiresSetup: false
  },

  'SITEMAP_generate_submit': {
    schema: {
      name: 'SITEMAP_generate_submit',
      description: 'Generate and submit sitemap to search engines',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL to generate sitemap for' },
          submit_to_gsc: { type: 'boolean', description: 'Submit to Google Search Console', default: true }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: flexibleUrlSchema,
      submit_to_gsc: z.boolean().optional().default(true)
    }),
    category: 'seo',
    requiresSetup: false
  },

  'CMS_strapi_publish': {
    schema: {
      name: 'CMS_strapi_publish',
      description: 'Publish content to Strapi CMS',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'object', description: 'Content to publish' },
          publish: { type: 'boolean', description: 'Publish immediately or save as draft', default: true }
        },
        required: ['content'],
        additionalProperties: false
      }
    },
    validator: z.object({
      content: z.object({}).passthrough(),
      publish: z.boolean().optional().default(true)
    }),
    category: 'cms',
    requiresSetup: true
  },

  'VERIFY_check_changes': {
    schema: {
      name: 'VERIFY_check_changes',
      description: 'Verify that applied changes are working correctly',
      parameters: {
        type: 'object',
        properties: {
          target_url: { type: 'string', description: 'URL to verify changes on' },
          expected_changes: { type: 'array', items: { type: 'string' }, description: 'List of expected changes to verify' }
        },
        required: ['target_url', 'expected_changes'],
        additionalProperties: false
      }
    },
    validator: z.object({
      target_url: flexibleUrlSchema,
      expected_changes: z.array(z.string())
    }),
    category: 'verification',
    requiresSetup: false
  },

  'CMS_wordpress_publish': {
    schema: {
      name: 'CMS_wordpress_publish',
      description: 'Publish content to WordPress',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'object', description: 'Content to publish' },
          publish: { type: 'boolean', description: 'Publish immediately or save as draft', default: true }
        },
        required: ['content'],
        additionalProperties: false
      }
    },
    validator: z.object({
      content: z.object({}).passthrough(),
      publish: z.boolean().optional().default(true)
    }),
    category: 'cms',
    requiresSetup: true
  },

  'CONTENT_generate_article': {
    schema: {
      name: 'CONTENT_generate_article',
      description: 'Generate SEO-optimized article content using intelligent suggestions from website data',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional, will use primary website if not provided)' },
          specific_topic: { type: 'string', description: 'Specific article topic (optional, will suggest based on keyword opportunities if not provided)' },
          use_suggestion: { type: 'integer', description: 'Use a specific suggested topic by index (optional)' },
          article_type: { type: 'string', enum: ['how_to', 'listicle', 'guide', 'faq', 'comparison', 'evergreen', 'blog'], description: 'Type of article to generate' },
          tone: { type: 'string', enum: ['professional', 'casual', 'technical'], description: 'Writing tone', default: 'professional' }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional(),
      specific_topic: z.string().optional(),
      use_suggestion: z.number().int().optional(),
      article_type: z.enum(['how_to', 'listicle', 'guide', 'faq', 'comparison', 'evergreen', 'blog']).optional().default('blog'),
      tone: z.enum(['professional', 'casual', 'technical']).optional().default('professional')
    }),
    category: 'content',
    requiresSetup: false
  },

  'CONTENT_generate_and_publish': {
    schema: {
      name: 'CONTENT_generate_and_publish',
      description: 'Generate a researched, SVS-optimized article and publish it to the connected CMS (Strapi supported)',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (domain) to target' },
          title: { type: 'string', description: 'Article title' },
          target_keywords: { type: 'array', items: { type: 'string' }, description: 'Target keywords' },
          article_type: { type: 'string', enum: ['how_to', 'listicle', 'guide', 'faq', 'comparison', 'evergreen', 'blog'], default: 'blog' },
          tone: { type: 'string', enum: ['professional', 'casual', 'technical'], default: 'professional' },
          publish: { type: 'boolean', description: 'Publish immediately (true) or save draft (false)', default: true },
          include_citations: { type: 'boolean', default: true },
          image_provider: { type: 'string', enum: ['openai', 'stability', 'unsplash'], default: 'openai' },
          num_images: { type: 'integer', default: 2 }
        },
        required: ['site_url', 'title'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string(),
      title: z.string().min(5),
      target_keywords: z.array(z.string()).optional().default([]),
      article_type: z.enum(['how_to', 'listicle', 'guide', 'faq', 'comparison', 'evergreen', 'blog']).optional().default('blog'),
      tone: z.enum(['professional', 'casual', 'technical']).optional().default('professional'),
      publish: z.boolean().optional().default(true),
      include_citations: z.boolean().optional().default(true),
      image_provider: z.enum(['openai', 'stability', 'unsplash']).optional().default('openai'),
      num_images: z.number().int().optional().default(2)
    }),
    category: 'content',
    requiresSetup: false
  },

  'CONTENT_suggest_ideas': {
    schema: {
      name: 'CONTENT_suggest_ideas',
      description: 'Get intelligent content suggestions based on website keyword performance and opportunities',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional, will use primary website if not provided)' },
          max_suggestions: { type: 'integer', description: 'Maximum number of suggestions to return', default: 5 }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional(),
      max_suggestions: z.number().int().min(1).max(10).optional().default(5)
    }),
    category: 'content',
    requiresSetup: false
  },

  'CONTENT_get_context': {
    schema: {
      name: 'CONTENT_get_context',
      description: 'Get comprehensive content context including CMS info, keywords, and opportunities for a website',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional, will use primary website if not provided)' }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional()
    }),
    category: 'content',
    requiresSetup: false
  },

  // Legacy functions for backwards compatibility
  connect_gsc: {
    schema: {
      name: 'connect_gsc',
      description: 'Connect Google Search Console for a website to enable performance tracking',
      parameters: {
        type: 'object',
        properties: {
          site_url: { 
            type: 'string', 
            description: 'Website URL to connect to Google Search Console',
            format: 'uri'
          }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: ConnectGSCSchema,
    category: 'setup',
    requiresSetup: false
  },

  sync_gsc_data: {
    schema: {
      name: 'sync_gsc_data',
      description: 'Sync performance data from Google Search Console for analysis',
      parameters: {
        type: 'object',
        properties: {
          site_url: { 
            type: 'string', 
            description: 'Website to sync GSC data for',
            format: 'uri'
          }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: SyncGSCDataSchema,
    category: 'monitoring',
    requiresSetup: true
  },

  generate_article: {
    schema: {
      name: 'generate_article',
      description: 'Generate SEO-optimized article content using intelligent keyword analysis from website data',
      parameters: {
        type: 'object',
        properties: {
          site_url: {
            type: 'string',
            description: 'Website URL (optional, will use primary website if not provided)'
          },
          specific_topic: { 
            type: 'string', 
            description: 'Specific article topic (optional, will suggest based on keyword opportunities if not provided)'
          },
          article_type: {
            type: 'string',
            enum: ['how_to', 'listicle', 'guide', 'faq', 'comparison', 'evergreen', 'blog'],
            description: 'Type of article to generate',
            default: 'blog'
          },
          tone: {
            type: 'string',
            enum: ['professional', 'casual', 'technical'],
            description: 'Writing tone',
            default: 'professional'
          }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional(),
      specific_topic: z.string().optional(),
      article_type: z.enum(['how_to', 'listicle', 'guide', 'faq', 'comparison', 'evergreen', 'blog']).optional().default('blog'),
      tone: z.enum(['professional', 'casual', 'technical']).optional().default('professional')
    }),
    category: 'content',
    requiresSetup: false
  },

  create_idea: {
    schema: {
      name: 'create_idea',
      description: 'Create a new SEO improvement idea from evidence and hypothesis',
      parameters: {
        type: 'object',
        properties: {
          site_url: {
            type: 'string',
            description: 'Website URL this idea applies to',
            format: 'uri'
          },
          title: {
            type: 'string',
            description: 'Clear, concise title for the idea'
          },
          hypothesis: {
            type: 'string',
            description: 'The hypothesis or reasoning behind this idea'
          },
          evidence: {
            type: 'object',
            description: 'Supporting evidence, data, or context for the idea'
          },
          ice_score: {
            type: 'integer',
            description: 'Impact/Confidence/Ease score (1-100) for prioritization',
            minimum: 1,
            maximum: 100,
            default: 70
          }
        },
        required: ['site_url', 'title', 'hypothesis'],
        additionalProperties: false
      }
    },
    validator: CreateIdeaSchema,
    category: 'optimization',
    requiresSetup: false
  },

  get_site_status: {
    schema: {
      name: 'get_site_status',
      description: 'Get comprehensive status overview of a website including all integrations',
      parameters: {
        type: 'object',
        properties: {
          site_url: { 
            type: 'string', 
            description: 'Website URL to check status for',
            format: 'uri'
          }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: GetSiteStatusSchema,
    category: 'monitoring',
    requiresSetup: false
  },

  audit_site: {
    schema: {
      name: 'audit_site',
      description: 'Perform comprehensive SEO audit using GSC data and website analysis',
      parameters: {
        type: 'object',
        properties: {
          site_url: { 
            type: 'string', 
            description: 'Website URL to audit',
            format: 'uri'
          },
          include_gsc_data: {
            type: 'boolean',
            description: 'Include Google Search Console performance data',
            default: true
          },
          audit_type: {
            type: 'string',
            enum: ['technical', 'content', 'performance', 'full'],
            description: 'Type of audit to perform',
            default: 'full'
          }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: AuditSiteSchema,
    category: 'monitoring',
    requiresSetup: true
  },

  // ===== Autonomous Content Strategy Functions =====
  'CONTENT_analyze_gsc_topics': {
    schema: {
      name: 'CONTENT_analyze_gsc_topics',
      description: 'Analyze Google Search Console data using an investor approach to identify the best blog post topics to write next. Finds underperforming assets (high impressions, low CTR) and low-hanging fruit (page 1 but not #1).',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional; uses primary site if omitted)' },
          analysis_type: {
            type: 'string',
            enum: ['comprehensive', 'quick'],
            description: 'Type of analysis - comprehensive for deep dive, quick for fast recommendations',
            default: 'comprehensive'
          },
          focus_area: { type: 'string', description: 'Optional focus area to filter topics (e.g., "SEO", "marketing")' }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: AutonomousTopicSelectionSchema,
    category: 'content',
    requiresSetup: true
  },

  'CONTENT_generate_bulk_ideas': {
    schema: {
      name: 'CONTENT_generate_bulk_ideas',
      description: 'Generate bulk article ideas for content planning. Creates multiple topic suggestions with variety in formats (listicles, how-tos, guides, FAQs) and authority levels. Can optionally add directly to content generation queue for automated publishing.',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional; uses primary site if omitted)' },
          period: {
            type: 'string',
            enum: ['week', 'month'],
            description: 'Time period for content planning',
            default: 'week'
          },
          count: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Number of article ideas to generate (default: 7 for week, 30 for month)'
          },
          add_to_queue: {
            type: 'boolean',
            description: 'Whether to automatically add ideas to content generation queue',
            default: false
          },
          website_token: { type: 'string', description: 'Website token for queue management (optional)' }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: BulkArticleIdeasSchema,
    category: 'content',
    requiresSetup: true
  },

  'CONTENT_manage_queue': {
    schema: {
      name: 'CONTENT_manage_queue',
      description: 'View and analyze the content generation queue. Shows upcoming articles with their metadata, priorities, and schedules. Can filter by status or analyze queue statistics.',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL (optional; uses primary site if omitted)' },
          website_token: { type: 'string', description: 'Website token for specific site' },
          action: {
            type: 'string',
            enum: ['view', 'analyze', 'status'],
            description: 'Type of queue operation',
            default: 'view'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: 'Maximum number of queue items to show',
            default: 20
          },
          status_filter: {
            type: 'string',
            enum: ['draft', 'pending', 'generating', 'completed'],
            description: 'Filter queue by status'
          }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: QueueManagementSchema,
    category: 'content',
    requiresSetup: true
  },

  'CONTENT_add_to_queue': {
    schema: {
      name: 'CONTENT_add_to_queue',
      description: 'Add a specific topic to the content generation queue with custom settings. Allows specifying priority, format, keywords, and scheduling.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Article topic or title' },
          site_url: { type: 'string', description: 'Website URL (optional; uses primary site if omitted)' },
          website_token: { type: 'string', description: 'Website token for specific site' },
          priority: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'Priority level (1 = highest priority)',
            default: 1
          },
          scheduled_date: { type: 'string', description: 'ISO date string for when to publish (optional)' },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target keywords for SEO optimization'
          },
          format: {
            type: 'string',
            enum: ['listicle', 'how-to', 'guide', 'faq', 'comparison', 'update', 'case-study', 'beginner-guide'],
            description: 'Specific article format'
          },
          authority_level: {
            type: 'string',
            enum: ['foundation', 'intermediate', 'advanced'],
            description: 'Content authority level for strategic progression',
            default: 'foundation'
          },
          word_count: {
            type: 'integer',
            minimum: 500,
            maximum: 5000,
            description: 'Target word count',
            default: 1500
          }
        },
        required: ['topic'],
        additionalProperties: false
      }
    },
    validator: AddToQueueSchema,
    category: 'content',
    requiresSetup: true
  },

  'CONTENT_remove_from_queue': {
    schema: {
      name: 'CONTENT_remove_from_queue',
      description: 'Remove articles from the content generation queue. Can remove by article ID, position number, or topic title/keyword match.',
      parameters: {
        type: 'object',
        properties: {
          identifier: {
            oneOf: [
              { type: 'string', description: 'Article title or keyword to search for' },
              { type: 'integer', description: 'Article ID or position number in queue' }
            ],
            description: 'Article identifier - can be ID, position (1-based), or title/keyword'
          },
          site_url: { type: 'string', description: 'Website URL (optional; uses primary site if omitted)' },
          website_token: { type: 'string', description: 'Website token for specific site' }
        },
        required: ['identifier'],
        additionalProperties: false
      }
    },
    validator: RemoveFromQueueSchema,
    category: 'content',
    requiresSetup: true
  },

  'CONTENT_reorder_queue': {
    schema: {
      name: 'CONTENT_reorder_queue',
      description: 'Reorder the content generation queue using different strategies or custom ordering. Helps optimize content scheduling for maximum impact.',
      parameters: {
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['priority', 'date', 'format', 'authority', 'traffic'],
            description: 'Reordering strategy - priority: by priority level, date: by schedule, traffic: by potential, authority: foundation->advanced, format: by article type'
          },
          custom_order: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', description: 'Article queue ID' },
                position: { type: 'integer', description: 'New position (1-based)' }
              },
              required: ['id', 'position']
            },
            description: 'Custom ordering with specific ID->position mappings'
          },
          site_url: { type: 'string', description: 'Website URL (optional; uses primary site if omitted)' },
          website_token: { type: 'string', description: 'Website token for specific site' }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: ReorderQueueSchema,
    category: 'content',
    requiresSetup: true
  },

  // ===== Intelligent Agent Strategy Functions =====
  'WEBSITE_crawl_and_analyze': {
    schema: {
      name: 'WEBSITE_crawl_and_analyze',
      description: 'Intelligently crawl and analyze a website to extract business model, target audience, services, industry, and SEO context for strategy development',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL to analyze' },
          max_pages: { type: 'integer', description: 'Maximum pages to crawl and analyze', default: 5 }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: flexibleUrlSchema,
      max_pages: z.number().int().min(1).max(10).optional().default(5)
    }),
    category: 'seo',
    requiresSetup: false
  },

  'COMPETITOR_research_and_crawl': {
    schema: {
      name: 'COMPETITOR_research_and_crawl',
      description: 'Analyze competitor websites to identify positioning strategies, content gaps, keyword opportunities, and competitive advantages',
      parameters: {
        type: 'object',
        properties: {
          competitor_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of competitor website URLs to analyze'
          },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific areas to focus analysis on (e.g. "pricing", "content strategy")',
            default: []
          },
          user_business_context: { type: 'string', description: 'Brief description of user&apos;s business for context' }
        },
        required: ['competitor_urls'],
        additionalProperties: false
      }
    },
    validator: z.object({
      competitor_urls: z.array(z.string().url()),
      focus_areas: z.array(z.string()).optional().default([]),
      user_business_context: z.string().optional()
    }),
    category: 'seo',
    requiresSetup: false
  },

  'KEYWORDS_brainstorm_strategy': {
    schema: {
      name: 'KEYWORDS_brainstorm_strategy',
      description: 'Generate comprehensive keyword strategy based on business analysis and competitor research, including primary, long-tail, secondary, and content keywords. Prefer KEYWORDS_brainstorm or KEYWORDS_brainstorm_auto when business_analysis is not already available to avoid extra steps.',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL or domain to infer context if analysis is missing' },
          business_analysis: {
            type: 'object',
            description: 'Business analysis data from website crawling'
          },
          competitor_data: {
            type: 'object',
            description: 'Competitor research insights'
          },
          target_keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific keywords user wants to target',
            default: []
          },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific focus areas for keyword strategy',
            default: []
          },
          keyword_count: { type: 'integer', description: 'Total number of keywords to generate', default: 50 }
        },
        required: [],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: z.string().optional(),
      business_analysis: z.object({}).passthrough().optional(),
      competitor_data: z.object({}).passthrough().optional(),
      target_keywords: z.array(z.string()).optional().default([]),
      focus_areas: z.array(z.string()).optional().default([]),
      keyword_count: z.number().int().min(10).max(100).optional().default(50)
    }),
    category: 'content',
    requiresSetup: false
  },

  'TOPICS_create_clusters': {
    schema: {
      name: 'TOPICS_create_clusters',
      description: 'Organize keywords from strategy into semantic topic clusters for content planning and pillar page development. IMPORTANT: Requires at least 3 keywords in the strategy to create effective clusters. If keyword_strategy is not available, call KEYWORDS_get_strategy first.',
      parameters: {
        type: 'object',
        properties: {
          keyword_strategy: {
            type: 'object',
            description: 'Keyword strategy data with categorized keywords. If not available, fetch it first using KEYWORDS_get_strategy.'
          },
          user_token: { type: 'string', description: 'User authentication token' },
          site_url: { type: 'string', description: 'Website URL for cluster association' },
          cluster_count: { type: 'integer', description: 'Number of topic clusters to create (3-15). Topic clusters need at least 3 keywords to establish semantic relationships.', default: 8 },
          business_context: {
            type: 'object',
            description: 'Business context for strategic clustering'
          }
        },
        required: ['keyword_strategy', 'user_token', 'site_url'],
        additionalProperties: false
      }
    },
    validator: z.object({
      keyword_strategy: z.object({}).passthrough(),
      user_token: z.string().min(1, 'User token is required for authentication'),
      site_url: flexibleUrlSchema,
      cluster_count: z.number().int().min(3, 'Topic clusters need at least 3 keywords to be effective - this creates the semantic relationships that search engines recognize').max(15, 'Maximum 15 clusters recommended for focused content strategy').optional().default(8),
      business_context: z.object({}).passthrough().optional()
    }),
    category: 'content',
    requiresSetup: false
  },

  'KEYWORDS_cluster_similarity': {
    schema: {
      name: 'KEYWORDS_cluster_similarity',
      description: 'Group keywords within a topic cluster by semantic similarity for article planning. Uses AI embeddings to identify 5-10 related keywords that should be covered in single comprehensive articles. This prevents thin one-keyword-per-article content and creates authoritative coverage.',
      parameters: {
        type: 'object',
        properties: {
          website_token: { type: 'string', description: 'Website token for the keywords' },
          topic_cluster: { type: 'string', description: 'Topic cluster name to analyze' },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of keywords to cluster (from the topic cluster)'
          },
          target_articles: {
            type: 'integer',
            description: 'Desired number of articles to create from these keywords (optional, auto-calculated if not provided)',
            default: 0
          },
          similarity_threshold: {
            type: 'number',
            description: 'Minimum similarity score (0.0-1.0) for grouping keywords together',
            default: 0.75
          }
        },
        required: ['website_token', 'topic_cluster', 'keywords'],
        additionalProperties: false
      }
    },
    validator: z.object({
      website_token: z.string().min(1, 'Website token is required'),
      topic_cluster: z.string().min(1, 'Topic cluster name is required'),
      keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
      target_articles: z.number().int().min(0).optional().default(0),
      similarity_threshold: z.number().min(0.5).max(1.0).optional().default(0.75)
    }),
    category: 'content',
    requiresSetup: false
  },

  'BRIEFS_generate': {
    schema: {
      name: 'BRIEFS_generate',
      description: 'Generate content briefs aligned to anti-cannibalization and pillar/cluster strategy (one primary keyword per page, distinct intent, internal link map).',
      parameters: {
        type: 'object',
        properties: {
          site_url: { type: 'string', description: 'Website URL or domain' },
          website_token: { type: 'string', description: 'Website token (optional if site_url provided)' },
          count: { type: 'integer', description: 'Number of briefs to generate', default: 10 },
          clusters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional cluster names to focus on'
          },
          include_pillar: { type: 'boolean', description: 'Include pillar briefs for clusters', default: false },
          add_to_queue: { type: 'boolean', description: 'Also save briefs to content_generation_queue', default: false }
        },
        required: ['site_url'],
        additionalProperties: false
      }
    },
    validator: z.object({
      site_url: flexibleUrlSchema,
      website_token: z.string().optional(),
      count: z.number().int().min(1).max(50).optional().default(10),
      clusters: z.array(z.string()).optional().default([]),
      include_pillar: z.boolean().optional().default(false),
      add_to_queue: z.boolean().optional().default(false)
    }),
    category: 'content',
    requiresSetup: false
  },

  'CONTENT_gap_analysis': {
    schema: {
      name: 'CONTENT_gap_analysis',
      description: 'Identify content gaps and opportunities by comparing user website against competitors and analyzing missing topics, formats, and strategic angles',
      parameters: {
        type: 'object',
        properties: {
          user_website_analysis: {
            type: 'object',
            description: 'Analysis of user&apos;s website from crawling'
          },
          competitor_analysis: {
            type: 'object',
            description: 'Competitor research data'
          },
          topic_clusters: {
            type: 'array',
            items: { type: 'object' },
            description: 'Existing topic clusters for context'
          },
          focus_content_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Content types to focus gap analysis on',
            default: ['blog', 'guides', 'comparisons']
          }
        },
        required: ['user_website_analysis', 'competitor_analysis'],
        additionalProperties: false
      }
    },
    validator: z.object({
      user_website_analysis: z.object({}).passthrough(),
      competitor_analysis: z.object({}).passthrough(),
      topic_clusters: z.array(z.object({}).passthrough()).optional(),
      focus_content_types: z.array(z.string()).optional().default(['blog', 'guides', 'comparisons'])
    }),
    category: 'content',
    requiresSetup: false
  }
};

// Get schemas for OpenAI (optionally filtered)
export function getFunctionSchemas(filter?: {
  category?: string[];
  requiresSetup?: boolean;
  functionNames?: string[];
}): any[] {
  let functions = Object.entries(FUNCTION_REGISTRY);

  if (filter) {
    if (filter.category) {
      functions = functions.filter(([_, def]) => filter.category!.includes(def.category));
    }
    
    if (filter.requiresSetup !== undefined) {
      functions = functions.filter(([_, def]) => def.requiresSetup === filter.requiresSetup);
    }
    
    if (filter.functionNames) {
      functions = functions.filter(([name, _]) => filter.functionNames!.includes(name));
    }
  }

  return functions.map(([_, def]) => def.schema);
}

// Validate function arguments
export function validateFunctionArgs(functionName: string, args: any): { success: true; data: any } | { success: false; error: string } {
  const definition = FUNCTION_REGISTRY[functionName];
  
  if (!definition) {
    return { success: false, error: `Unknown function: ${functionName}` };
  }

  try {
    const validatedArgs = definition.validator.parse(args);
    return { success: true, data: validatedArgs };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` 
      };
    }
    
    return { success: false, error: 'Validation failed' };
  }
}

// Get available tools based on setup status
export function getAvailableToolsForSetup(setupStatus: {
  gscConnected: boolean;
  seoagentjsInstalled: boolean;
  isFullySetup: boolean;
}): string[] {
  const availableTools: string[] = [];

  // Always available
  availableTools.push('get_site_status', 'create_idea');

  // Setup tools
  if (!setupStatus.gscConnected) {
    availableTools.push('connect_gsc');
  }

  // Post-setup tools
  if (setupStatus.gscConnected) {
    availableTools.push('sync_gsc_data', 'audit_site');
  }

  // Content tools (available anytime)
  availableTools.push('generate_article');

  return availableTools;
}
