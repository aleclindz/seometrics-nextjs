/**
 * Diagnostic script to troubleshoot article publishing 400 errors
 *
 * Usage:
 *   npx tsx scripts/diagnose-article-publish.ts <articleId> <userToken>
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseArticlePublish(articleId: string, userToken: string) {
  console.log('\n========================================');
  console.log('Article Publishing Diagnostic');
  console.log('========================================\n');

  console.log('[1/5] Fetching article details...');

  const { data: article, error: articleError } = await supabase
    .from('article_queue')
    .select(`
      *,
      cms_connections:cms_connection_id (
        id,
        base_url,
        api_token,
        content_type,
        cms_type,
        status
      ),
      websites:website_id (
        id,
        domain
      )
    `)
    .eq('id', articleId)
    .eq('user_token', userToken)
    .single();

  if (articleError || !article) {
    console.error('❌ Article not found');
    console.error('   Error:', articleError?.message);
    return;
  }

  console.log('✅ Article found');
  console.log('   ID:', article.id);
  console.log('   Title:', article.title);
  console.log('   Status:', article.status);
  console.log('   Website ID:', article.website_id);
  console.log('   CMS Connection ID:', article.cms_connection_id);
  console.log('   Has Content:', !!article.article_content);
  console.log('   Content Length:', article.article_content?.length || 0);

  console.log('\n[2/5] Checking article content...');
  if (!article.article_content) {
    console.error('❌ Article content not generated yet');
    console.error('   This will cause a 400 error');
    return;
  }
  console.log('✅ Article has content');

  console.log('\n[3/5] Checking article-level CMS connection...');
  const articleCms = (article as any).cms_connections;
  if (articleCms) {
    console.log('✅ Article has CMS connection');
    console.log('   ID:', articleCms.id);
    console.log('   Type:', articleCms.cms_type);
    console.log('   Base URL:', articleCms.base_url);
    console.log('   Status:', articleCms.status);
    console.log('   Has Token:', !!articleCms.api_token);
  } else {
    console.log('⚠️  No article-level CMS connection');
    console.log('   Will search for website-level connection...');
  }

  console.log('\n[4/5] Checking website-level CMS connections...');
  const { data: websiteConnections, error: connError } = await supabase
    .from('cms_connections')
    .select('*')
    .eq('user_token', userToken)
    .eq('website_id', article.website_id);

  if (connError) {
    console.error('❌ Error fetching CMS connections:', connError.message);
  } else if (!websiteConnections || websiteConnections.length === 0) {
    console.error('❌ No CMS connections found for this website');
    console.error('   Website ID:', article.website_id);
    console.error('   User Token:', userToken.substring(0, 8) + '...');
    console.error('   This will cause a 400 error: "No CMS connection found for this website"');
    return;
  } else {
    console.log(`✅ Found ${websiteConnections.length} CMS connection(s) for this website:`);
    websiteConnections.forEach((conn, i) => {
      console.log(`\n   [${i + 1}] Connection ID: ${conn.id}`);
      console.log(`       Type: ${conn.cms_type}`);
      console.log(`       Base URL: ${conn.base_url}`);
      console.log(`       Status: ${conn.status}`);
      console.log(`       Has Token: ${!!conn.api_token}`);
      console.log(`       Created: ${new Date(conn.created_at).toLocaleString()}`);
    });
  }

  console.log('\n[5/5] Checking active connections...');
  const { data: activeConn, error: activeError } = await supabase
    .from('cms_connections')
    .select('*')
    .eq('user_token', userToken)
    .eq('website_id', article.website_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (activeError) {
    console.error('❌ Error fetching active connection:', activeError.message);
  } else if (!activeConn) {
    console.error('❌ No ACTIVE CMS connections found');
    console.error('   All connections may be inactive/disabled');
    console.error('   This will cause a 400 error: "No CMS connection found for this website"');
  } else {
    console.log('✅ Active CMS connection found');
    console.log('   ID:', activeConn.id);
    console.log('   Type:', activeConn.cms_type);
    console.log('   Base URL:', activeConn.base_url);
    console.log('   Has Token:', !!activeConn.api_token);

    if (activeConn.cms_type === 'wordpress_com') {
      console.log('\n   WordPress.com Configuration:');
      const siteIdentifier = (() => {
        try {
          return new URL(activeConn.base_url).host;
        } catch {
          return activeConn.base_url;
        }
      })();
      console.log('   Site Identifier:', siteIdentifier);
      console.log('   OAuth Token Present:', !!activeConn.api_token);
      console.log('   Token Length:', activeConn.api_token?.length || 0);
    }
  }

  console.log('\n========================================');
  console.log('Diagnosis Complete');
  console.log('========================================\n');

  if (activeConn && article.article_content) {
    console.log('✅ Article should be publishable');
    console.log('   All required conditions met:');
    console.log('   - Article has content ✓');
    console.log('   - Active CMS connection exists ✓');
    console.log('   - CMS type:', activeConn.cms_type);
  } else {
    console.log('❌ Article cannot be published');
    if (!article.article_content) {
      console.log('   - Missing article content');
    }
    if (!activeConn) {
      console.log('   - No active CMS connection');
    }
  }

  console.log('\n');
}

// Main execution
const args = process.argv.slice(2);
const articleId = args[0];
const userToken = args[1];

if (!articleId || !userToken) {
  console.error('Usage: npx tsx scripts/diagnose-article-publish.ts <articleId> <userToken>');
  console.error('\nExample:');
  console.error('  npx tsx scripts/diagnose-article-publish.ts 123 abc-def-ghi');
  process.exit(1);
}

diagnoseArticlePublish(articleId, userToken).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
