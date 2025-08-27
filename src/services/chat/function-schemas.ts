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

// Type inference from Zod schemas
export type ConnectGSCArgs = z.infer<typeof ConnectGSCSchema>;
export type SyncGSCDataArgs = z.infer<typeof SyncGSCDataSchema>;
export type GenerateArticleArgs = z.infer<typeof GenerateArticleSchema>;
export type CreateIdeaArgs = z.infer<typeof CreateIdeaSchema>;
export type GetSiteStatusArgs = z.infer<typeof GetSiteStatusSchema>;
export type AuditSiteArgs = z.infer<typeof AuditSiteSchema>;

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
      description: 'Generate SEO-optimized article content',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Article topic or title' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'Target keywords for SEO' },
          word_count: { type: 'integer', description: 'Target word count', default: 1500 }
        },
        required: ['topic', 'keywords'],
        additionalProperties: false
      }
    },
    validator: z.object({
      topic: z.string(),
      keywords: z.array(z.string()),
      word_count: z.number().int().min(300).max(5000).optional().default(1500)
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
      description: 'Generate SEO-optimized article content for a website',
      parameters: {
        type: 'object',
        properties: {
          topic: { 
            type: 'string', 
            description: 'Main topic or title for the article'
          },
          target_keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target keywords to optimize for'
          },
          content_type: {
            type: 'string',
            enum: ['blog_post', 'landing_page', 'guide'],
            description: 'Type of content to generate',
            default: 'blog_post'
          },
          word_count: {
            type: 'integer',
            minimum: 300,
            maximum: 5000,
            description: 'Target word count for the article',
            default: 1500
          },
          site_url: {
            type: 'string',
            format: 'uri',
            description: 'Website URL for context and publishing'
          }
        },
        required: ['topic'],
        additionalProperties: false
      }
    },
    validator: GenerateArticleSchema,
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