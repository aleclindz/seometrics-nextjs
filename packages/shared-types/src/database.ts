/**
 * Database-specific types and schemas
 * These types mirror the actual database structure from DATABASE_SCHEMA.md
 */

// Core database table interfaces matching the actual schema
export interface DatabaseUser {
  id: number
  email: string
  token: string
  auth_user_id: string | null
  plan: number
  created_at: string
  updated_at: string
}

export interface DatabaseWebsite {
  id: number
  website_token: string
  user_token: string
  domain: string
  language: string
  enable_meta_tags: boolean
  enable_image_tags: boolean
  meta_tags: number
  image_tags: number
  is_managed: boolean
  is_excluded_from_sync: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseArticle {
  id: number
  user_token: string
  site_id: number | null
  title: string
  content: string
  slug: string | null
  status: string
  cms_id: string | null
  language: string
  settings: Record<string, any>
  eeat_score: number
  metrics_json: Record<string, any>
  word_count: number
  readability_score: number | null
  created_at: string
  updated_at: string
}

// Supabase database schema for type generation
export interface Database {
  public: {
    Tables: {
      login_users: {
        Row: DatabaseUser
        Insert: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'> & {
          id?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<DatabaseUser>
      }
      websites: {
        Row: DatabaseWebsite
        Insert: Omit<DatabaseWebsite, 'id' | 'website_token' | 'created_at' | 'updated_at'> & {
          id?: number
          website_token?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<DatabaseWebsite>
      }
      articles: {
        Row: DatabaseArticle
        Insert: Omit<DatabaseArticle, 'id' | 'created_at' | 'updated_at'> & {
          id?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<DatabaseArticle>
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      article_status: 'pending' | 'generating' | 'generated' | 'publishing' | 'published' | 'generation_failed' | 'publishing_failed'
    }
  }
}