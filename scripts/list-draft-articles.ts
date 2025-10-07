/**
 * List Draft Articles
 *
 * Lists all draft articles for a user to identify article IDs for testing
 *
 * Usage:
 *   npx tsx scripts/list-draft-articles.ts <userToken>
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listDraftArticles(userToken: string) {
  console.log('\n========================================');
  console.log('Draft Articles');
  console.log('========================================\n');

  try {
    const { data: articles, error } = await supabase
      .from('article_queue')
      .select(`
        id,
        title,
        status,
        website_id,
        cms_connection_id,
        created_at,
        article_content,
        websites:website_id (
          domain
        )
      `)
      .eq('user_token', userToken)
      .in('status', ['pending', 'generating', 'generated', 'publishing_failed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('No draft articles found.');
      return;
    }

    console.log(`Found ${articles.length} draft article(s):\n`);

    articles.forEach((article, index) => {
      const website = (article as any).websites;
      console.log(`[${index + 1}] Article ID: ${article.id}`);
      console.log(`    Title: ${article.title}`);
      console.log(`    Status: ${article.status}`);
      console.log(`    Website: ${website?.domain || 'N/A'}`);
      console.log(`    Website ID: ${article.website_id || 'N/A'}`);
      console.log(`    CMS Connection ID: ${article.cms_connection_id || 'Not assigned'}`);
      console.log(`    Has Content: ${!!article.article_content}`);
      console.log(`    Content Length: ${article.article_content?.length || 0} chars`);
      console.log(`    Created: ${new Date(article.created_at).toLocaleString()}`);
      console.log(`\n    To diagnose publishing issues, run:`);
      console.log(`    npx tsx scripts/diagnose-article-publish.ts ${article.id} ${userToken}`);
      console.log('\n' + '─'.repeat(80) + '\n');
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
const userToken = args[0];

if (!userToken) {
  console.error('Usage: npx tsx scripts/list-draft-articles.ts <userToken>');
  console.error('\nExample:');
  console.error('  npx tsx scripts/list-draft-articles.ts abc-def-ghi-jkl');
  process.exit(1);
}

listDraftArticles(userToken);
