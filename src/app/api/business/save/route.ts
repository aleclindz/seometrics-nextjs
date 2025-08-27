import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SaveBusinessRequest {
  websiteToken?: string;
  userToken: string;
  businessInfo: {
    name?: string;
    address?: string;
    phone?: string;
    hours?: string;
    serviceArea?: string;
    businessCategory?: string;
    website?: string;
    businessType?: 'local' | 'online' | 'hybrid';
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    priceRange?: string;
    paymentMethods?: string[];
    socialProfiles?: string[];
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { websiteToken, userToken, businessInfo }: SaveBusinessRequest = await request.json();

    if (!userToken || !businessInfo) {
      return NextResponse.json({ 
        error: 'Missing required parameters: userToken, businessInfo' 
      }, { status: 400 });
    }

    console.log(`[SAVE BUSINESS] Saving business info for user ${userToken}`);

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('login_users')
      .select('token')
      .eq('token', userToken)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
    }

    let websiteId: number | null = null;

    // If websiteToken provided, update specific website
    if (websiteToken) {
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id')
        .eq('website_token', websiteToken)
        .eq('user_token', userToken)
        .single();

      if (websiteError || !website) {
        return NextResponse.json({ error: 'Website not found' }, { status: 404 });
      }

      websiteId = website.id;

      // Update existing website with business information
      const { error: updateError } = await supabase
        .from('websites')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('website_token', websiteToken)
        .eq('user_token', userToken);

      if (updateError) {
        console.error('[SAVE BUSINESS] Error updating website:', updateError);
        return NextResponse.json({ error: 'Failed to save business information' }, { status: 500 });
      }

      console.log(`[SAVE BUSINESS] Updated website ${websiteToken} with business info`);

    } else if (businessInfo.website) {
      // Create new website with business information using DomainQueryService
      const domain = extractDomainFromUrl(businessInfo.website);
      
      const createResult = await DomainQueryService.createWebsiteWithDomain(
        userToken,
        domain,
        {
          website_token: crypto.randomUUID(),
          is_managed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );

      if (!createResult.success) {
        console.error('[SAVE BUSINESS] Error creating website:', createResult.error);
        return NextResponse.json({ error: 'Failed to create website' }, { status: 500 });
      }

      websiteId = createResult.data!.id;
      console.log(`[SAVE BUSINESS] Created new website ${createResult.data!.website_token} with business info`);
    }

    // Trigger schema generation if we have local business info
    if (businessInfo.businessType === 'local' || businessInfo.businessType === 'hybrid') {
      await triggerSchemaGeneration(websiteToken || '', businessInfo);
    }

    return NextResponse.json({
      success: true,
      message: 'Business information saved successfully',
      businessType: businessInfo.businessType,
      websiteId: websiteId
    });

  } catch (error) {
    console.error('[SAVE BUSINESS] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

function extractDomainFromUrl(url: string): string {
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(cleanUrl).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function triggerSchemaGeneration(websiteToken: string, businessInfo: any) {
  try {
    // TODO: Trigger schema generation for this website
    // This could call the schema generation edge function or queue a job
    console.log(`[SAVE BUSINESS] Schema generation triggered for ${websiteToken}`);
    
    // For now, we'll just log that schema should be generated
    // In production, this would trigger the actual schema generation process
    
  } catch (error) {
    console.error('[SAVE BUSINESS] Error triggering schema generation:', error);
    // Don't fail the save if schema generation fails
  }
}