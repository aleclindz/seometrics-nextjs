import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('[MIGRATION] Starting onboarding survey system migration')

    // Create enum types for standardized responses
    const enumsSQL = `
      CREATE TYPE website_building_method AS ENUM (
          'custom', 
          'shopify', 
          'wix', 
          'squarespace', 
          'wordpress', 
          'webflow',
          'lovable',
          'replit',
          'github_pages',
          'other'
      );

      CREATE TYPE cms_type AS ENUM (
          'none',
          'strapi',
          'contentful', 
          'sanity',
          'ghost',
          'wordpress',
          'directus',
          'other'
      );

      CREATE TYPE hosting_provider AS ENUM (
          'vercel',
          'netlify', 
          'aws',
          'google_cloud',
          'github_pages',
          'cloudflare_pages',
          'digitalocean',
          'heroku',
          'railway',
          'render',
          'other'
      );
    `

    // Create the main table
    const tableSQL = `
      CREATE TABLE onboarding_surveys (
          id SERIAL PRIMARY KEY,
          user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
          
          -- Core website building questions
          website_building_method website_building_method NOT NULL,
          website_building_method_other TEXT,
          
          -- CMS questions (contextual based on building method)
          uses_cms BOOLEAN DEFAULT false,
          cms_type cms_type DEFAULT 'none',
          cms_type_other TEXT,
          
          -- Hosting questions
          hosting_provider hosting_provider NOT NULL,
          hosting_provider_other TEXT,
          
          -- Business context
          business_type VARCHAR(100),
          website_age VARCHAR(50),
          monthly_visitors VARCHAR(50),
          
          -- SEO experience and goals
          seo_experience VARCHAR(50),
          primary_seo_goal TEXT,
          
          -- Founder call and premium offer
          interested_in_founder_call BOOLEAN DEFAULT false,
          calendly_booking_link TEXT,
          accepted_pro_offer BOOLEAN DEFAULT false,
          pro_offer_redemption_code VARCHAR(100),
          
          -- Survey completion tracking
          survey_completed BOOLEAN DEFAULT false,
          survey_step INTEGER DEFAULT 1,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Create indexes
    const indexesSQL = `
      CREATE INDEX idx_onboarding_surveys_user_token ON onboarding_surveys(user_token);
      CREATE INDEX idx_onboarding_surveys_completed ON onboarding_surveys(survey_completed);
      CREATE INDEX idx_onboarding_surveys_founder_call ON onboarding_surveys(interested_in_founder_call);
      CREATE INDEX idx_onboarding_surveys_building_method ON onboarding_surveys(website_building_method);
      CREATE INDEX idx_onboarding_surveys_cms_type ON onboarding_surveys(cms_type);
      CREATE INDEX idx_onboarding_surveys_hosting ON onboarding_surveys(hosting_provider);
    `

    // Create trigger function and trigger
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER set_timestamp
          BEFORE UPDATE ON onboarding_surveys
          FOR EACH ROW
          EXECUTE FUNCTION trigger_set_timestamp();
    `

    // RLS policies
    const rlsSQL = `
      ALTER TABLE onboarding_surveys ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Users can view their own survey data" ON onboarding_surveys
          FOR SELECT USING (user_token = current_setting('app.current_user_token', true));

      CREATE POLICY "Users can insert their own survey data" ON onboarding_surveys
          FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token', true));

      CREATE POLICY "Users can update their own survey data" ON onboarding_surveys
          FOR UPDATE USING (user_token = current_setting('app.current_user_token', true));

      CREATE POLICY "Admin can view all surveys" ON onboarding_surveys
          FOR SELECT USING (current_setting('role', true) = 'admin');
    `

    // For now, return instructions to run the migration manually
    const migrationInstructions = `
-- Run this SQL in your Supabase SQL Editor:

${enumsSQL}

${tableSQL}

${indexesSQL}

${triggerSQL}

${rlsSQL}
    `

    console.log('[MIGRATION] Migration SQL generated')

    return NextResponse.json({
      success: true,
      message: 'Migration SQL generated. Please run in Supabase SQL Editor.',
      sql: migrationInstructions
    })

  } catch (error) {
    console.error('[MIGRATION] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error },
      { status: 500 }
    )
  }
}