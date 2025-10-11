/**
 * GET /api/debug/test-brief-gen?discoveryId=2
 *
 * Diagnostic endpoint to test brief generation for a discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBriefsFromArticleRoles, ArticleRole } from '@/services/strategy/brief-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discoveryId = parseInt(searchParams.get('discoveryId') || '2');

    console.log('[DEBUG] Testing brief generation for discovery', discoveryId);

    // Fetch article roles
    const { data: articleRolesWithClusters, error: rolesError } = await supabase
      .from('article_roles')
      .select(`
        *,
        topic_clusters!article_roles_topic_cluster_id_fkey (
          cluster_name
        )
      `)
      .eq('discovery_id', discoveryId);

    if (rolesError) {
      return NextResponse.json({
        error: 'Failed to fetch article roles',
        details: rolesError
      }, { status: 500 });
    }

    if (!articleRolesWithClusters || articleRolesWithClusters.length === 0) {
      return NextResponse.json({
        message: 'No article roles found',
        discoveryId
      });
    }

    console.log('[DEBUG] Found', articleRolesWithClusters.length, 'article roles');

    // Get website and user tokens from first role
    const websiteToken = articleRolesWithClusters[0].website_token;

    // Get user_token from websites table
    const { data: website } = await supabase
      .from('websites')
      .select('user_token')
      .eq('website_token', websiteToken)
      .single();

    if (!website) {
      return NextResponse.json({
        error: 'Website not found',
        websiteToken
      }, { status: 404 });
    }

    const userToken = website.user_token;

    // Transform to ArticleRole format
    const articleRolesForBriefGen: ArticleRole[] = articleRolesWithClusters.map(role => ({
      id: role.id,
      discovery_article_id: role.discovery_article_id,
      role: role.role as 'PILLAR' | 'SUPPORTING',
      title: role.title,
      primary_keyword: role.primary_keyword,
      secondary_keywords: role.secondary_keywords || [],
      topic_cluster_id: role.topic_cluster_id,
      cluster_name: role.topic_clusters?.cluster_name,
      section_map: role.section_map,
      links_to_article_ids: role.links_to_article_ids || []
    }));

    console.log('[DEBUG] Attempting to generate briefs...');

    // Try manual insert first to capture exact error
    const testRole = articleRolesForBriefGen[0];
    const isPillar = testRole.role === 'PILLAR';
    const wordCountMin = isPillar ? 1500 : 800;
    const wordCountMax = isPillar ? 3000 : 1500;
    const clusterName = testRole.cluster_name || 'Uncategorized';

    const testInsert = {
      user_token: userToken,
      website_token: websiteToken,
      discovery_article_id: testRole.discovery_article_id,
      topic_cluster_id: testRole.topic_cluster_id,
      article_role: testRole.role,
      title: testRole.title,
      h1: testRole.title,
      primary_keyword: testRole.primary_keyword,
      secondary_keywords: testRole.secondary_keywords,
      intent: 'informational',
      summary: `${isPillar ? 'Comprehensive guide covering' : 'Focused deep-dive into'} ${testRole.primary_keyword}. Article about ${testRole.primary_keyword} in the ${clusterName} topic cluster.`,
      parent_cluster: clusterName,
      word_count_min: wordCountMin,
      word_count_max: wordCountMax,
      tone: 'professional',
      status: 'draft',
      section_map: testRole.section_map || null,
      sort_index: isPillar ? 0 : 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[DEBUG] Test insert data:', JSON.stringify(testInsert, null, 2));

    const { data: testBrief, error: testError } = await supabase
      .from('article_briefs')
      .insert(testInsert)
      .select('id')
      .single();

    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Insert failed',
        errorDetails: testError,
        testInsertData: testInsert,
        message: 'This shows the exact error when trying to insert a brief'
      }, { status: 500 });
    }

    // Generate briefs
    const briefResult = await generateBriefsFromArticleRoles(
      websiteToken,
      userToken,
      discoveryId,
      articleRolesForBriefGen
    );

    return NextResponse.json({
      success: true,
      discoveryId,
      websiteToken,
      userToken,
      articleRolesFound: articleRolesWithClusters.length,
      result: briefResult,
      testBriefId: testBrief?.id,
      sampleRole: articleRolesForBriefGen[0]
    });

  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
