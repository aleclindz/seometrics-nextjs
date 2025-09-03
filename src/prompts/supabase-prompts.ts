/**
 * Simplified prompts for Supabase Edge Functions
 * 
 * Since Supabase functions run in Deno and can't import the full PromptManager,
 * we export the prompts as simple constants that can be imported.
 */

export const SUPABASE_PROMPTS = {
  ARTICLE_OUTLINE_GENERATOR: 'You are an expert content writer. Create engaging article outlines.',
  
  DETAILED_ARTICLE_WRITER: 'You are an expert content writer who creates detailed, engaging articles.',
  
  META_TAGS_EXPERT: 'You are an SEO expert. Create compelling meta tags that follow SEO best practices and character limits.'
} as const;

export type SupabasePromptKey = keyof typeof SUPABASE_PROMPTS;