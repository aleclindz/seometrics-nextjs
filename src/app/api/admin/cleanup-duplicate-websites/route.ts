import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[CLEANUP DUPLICATES] Starting duplicate website cleanup');

    // Get all websites to analyze duplicates
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('*')
      .order('created_at', { ascending: true });

    if (websitesError) {
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    const duplicatesToDelete: number[] = [];
    const processed = new Set<string>();
    const analysis: any[] = [];

    // Group by user_token and domain variations
    const userDomainGroups: Record<string, any[]> = {};

    for (const website of websites) {
      const cleanDomain = website.domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '');
      const groupKey = `${website.user_token}::${cleanDomain}`;

      if (!userDomainGroups[groupKey]) {
        userDomainGroups[groupKey] = [];
      }
      userDomainGroups[groupKey].push(website);
    }

    // Analyze each group for duplicates
    for (const [groupKey, group] of Object.entries(userDomainGroups)) {
      if (group.length > 1) {
        const [userToken, cleanDomain] = groupKey.split('::');
        
        // Sort by preference: sc-domain (GSC connected) > has data > managed > newer
        group.sort((a, b) => {
          // Prefer sc-domain: (GSC connected)
          const aHasPrefix = a.domain.startsWith('sc-domain:') ? 1 : 0;
          const bHasPrefix = b.domain.startsWith('sc-domain:') ? 1 : 0;
          if (aHasPrefix !== bHasPrefix) return bHasPrefix - aHasPrefix;

          // Prefer websites with data
          const aHasData = (a.meta_tags + a.image_tags) > 0 ? 1 : 0;
          const bHasData = (b.meta_tags + b.image_tags) > 0 ? 1 : 0;
          if (aHasData !== bHasData) return bHasData - aHasData;

          // Prefer managed websites
          const aManagedScore = a.is_managed ? 1 : 0;
          const bManagedScore = b.is_managed ? 1 : 0;
          if (aManagedScore !== bManagedScore) return bManagedScore - aManagedScore;

          // Prefer older (first created)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const keeper = group[0];
        const duplicates = group.slice(1);

        analysis.push({
          domain: cleanDomain,
          userToken: userToken.substring(0, 8) + '...',
          keeper: {
            id: keeper.id,
            domain: keeper.domain,
            managed: keeper.is_managed,
            hasData: (keeper.meta_tags + keeper.image_tags) > 0,
            dataCount: keeper.meta_tags + keeper.image_tags
          },
          duplicates: duplicates.map(d => ({
            id: d.id,
            domain: d.domain,
            managed: d.is_managed,
            hasData: (d.meta_tags + d.image_tags) > 0,
            dataCount: d.meta_tags + d.image_tags
          }))
        });

        // Mark duplicates for deletion
        duplicatesToDelete.push(...duplicates.map(d => d.id));
      }
    }

    const { dryRun = true } = await request.json();

    if (!dryRun && duplicatesToDelete.length > 0) {
      console.log('[CLEANUP DUPLICATES] Deleting duplicate websites:', duplicatesToDelete);

      const { error: deleteError } = await supabase
        .from('websites')
        .delete()
        .in('id', duplicatesToDelete);

      if (deleteError) {
        console.error('[CLEANUP DUPLICATES] Delete error:', deleteError);
        return NextResponse.json({ 
          error: 'Failed to delete duplicates',
          analysis,
          wouldDelete: duplicatesToDelete
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalWebsites: websites.length,
      duplicateGroups: analysis.length,
      duplicatesFound: duplicatesToDelete.length,
      duplicatesToDelete,
      analysis,
      deleted: !dryRun ? duplicatesToDelete.length : 0
    });

  } catch (error) {
    console.error('[CLEANUP DUPLICATES] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup duplicates' 
    }, { status: 500 });
  }
}

export async function GET() {
  // Dry run by default
  const dryRunRequest = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ dryRun: true })
  });

  return POST(dryRunRequest as NextRequest);
}