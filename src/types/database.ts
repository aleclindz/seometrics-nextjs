// Database schema types based on PHP database structure
export interface Database {
  public: {
    Tables: {
      login_users: {
        Row: {
          id: number
          email: string
          token: string
          plan: number
          created_at: string
          updated_at: string
          auth_user_id: string | null
        }
        Insert: {
          id?: number
          email: string
          token: string
          plan?: number
          created_at?: string
          updated_at?: string
          auth_user_id?: string | null
        }
        Update: {
          id?: number
          email?: string
          token?: string
          plan?: number
          created_at?: string
          updated_at?: string
          auth_user_id?: string | null
        }
      }
      websites: {
        Row: {
          id: number
          website_token: string
          user_token: string
          domain: string
          language: string
          enable_meta_tags: number
          enable_image_tags: number
          meta_tags: number
          image_tags: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          website_token: string
          user_token: string
          domain: string
          language?: string
          enable_meta_tags?: number
          enable_image_tags?: number
          meta_tags?: number
          image_tags?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          website_token?: string
          user_token?: string
          domain?: string
          language?: string
          enable_meta_tags?: number
          enable_image_tags?: number
          meta_tags?: number
          image_tags?: number
          created_at?: string
          updated_at?: string
        }
      }
      pages: {
        Row: {
          id: number
          website_token: string
          url: string
          meta_title: string | null
          meta_description: string | null
          processed: number
          timestamp: string
        }
        Insert: {
          id?: number
          website_token: string
          url: string
          meta_title?: string | null
          meta_description?: string | null
          processed?: number
          timestamp?: string
        }
        Update: {
          id?: number
          website_token?: string
          url?: string
          meta_title?: string | null
          meta_description?: string | null
          processed?: number
          timestamp?: string
        }
      }
      images: {
        Row: {
          id: number
          website_token: string
          url: string
          alt_tag: string | null
          processed: number
          timestamp: string
        }
        Insert: {
          id?: number
          website_token: string
          url: string
          alt_tag?: string | null
          processed?: number
          timestamp?: string
        }
        Update: {
          id?: number
          website_token?: string
          url?: string
          alt_tag?: string | null
          processed?: number
          timestamp?: string
        }
      }
      articles: {
        Row: {
          id: number
          user_token: string
          title: string
          content: string
          language: string
          settings: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_token: string
          title: string
          content: string
          language?: string
          settings?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_token?: string
          title?: string
          content?: string
          language?: string
          settings?: any
          created_at?: string
          updated_at?: string
        }
      }
      api_usage: {
        Row: {
          id: number
          count: number
          date: string
        }
        Insert: {
          id?: number
          count?: number
          date?: string
        }
        Update: {
          id?: number
          count?: number
          date?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}