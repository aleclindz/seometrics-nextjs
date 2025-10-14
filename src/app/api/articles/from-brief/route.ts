import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userToken, websiteToken, briefId, start = true, conversationId } = await request.json();
    if (!userToken || !briefId) {
      return NextResponse.json({ success: false, error: 'userToken and briefId are required' }, { status: 400 });
    }

    // Load brief (trust brief's own website association)
    const { data: brief, error: briefErr } = await supabase
      .from('article_briefs')
      .select('*')
      .eq('id', briefId)
      .eq('user_token', userToken)
      .maybeSingle();
    if (briefErr) {
      console.error('[FROM BRIEF] Error fetching brief:', briefErr);
      return NextResponse.json({ success: false, error: `Brief fetch error: ${briefErr.message}` }, { status: 500 });
    }
    if (!brief) {
      console.error('[FROM BRIEF] Brief not found:', { briefId, userToken });
      return NextResponse.json({ success: false, error: 'Brief not found' }, { status: 404 });
    }

    const effectiveWebsiteToken = brief.website_token as string;

    // Resolve website id from brief's website_token (safer than trusting the client param)
    const { data: site, error: siteErr } = await supabase
      .from('websites')
      .select('id, domain')
      .eq('website_token', effectiveWebsiteToken)
      .eq('user_token', userToken)
      .maybeSingle();
    if (siteErr) {
      console.error('[FROM BRIEF] Error fetching website:', siteErr);
      return NextResponse.json({ success: false, error: `Website fetch error: ${siteErr.message}` }, { status: 500 });
    }
    if (!site?.id) {
      console.error('[FROM BRIEF] Website not found:', { effectiveWebsiteToken, userToken });
      return NextResponse.json({ success: false, error: 'Website not found for brief' }, { status: 404 });
    }

    // Prepare draft insert
    const targetKeywords = Array.from(new Set<string>([
      String(brief.primary_keyword || ''),
      ...((Array.isArray(brief.secondary_keywords) ? brief.secondary_keywords : []) as string[])
    ].filter(Boolean)));

    const insertPayload: any = {
      user_token: userToken,
      website_id: site.id,
      title: brief.title || brief.h1 || 'New Article',
      slug: (brief.url_path || (brief.title || '')).toLowerCase().replace(/[^a-z0-9\-\/]/g, '-').replace(/-+/g, '-').replace(/\/+/, '/').replace(/^-+|-+$/g, ''),
      target_keywords: targetKeywords,
      secondary_keywords: Array.isArray(brief.secondary_keywords) ? brief.secondary_keywords : [],
      content_outline: {
        parent_cluster: brief.parent_cluster,
        intent: brief.intent,
        page_type: brief.page_type || 'blog',
        template: 'from-brief',
        conversationId: conversationId || null // Store for callback
      },
      status: 'pending',
      generated_from_brief_id: brief.id,
      topic_cluster: brief.parent_cluster || null,
      created_at: new Date().toISOString()
    };

    const { data: draft, error: insErr } = await supabase
      .from('article_queue')
      .insert(insertPayload)
      .select('*')
      .single();
    if (insErr) {
      console.error('[FROM BRIEF] Error inserting draft:', insErr);
      console.error('[FROM BRIEF] Insert payload:', JSON.stringify(insertPayload, null, 2));
      return NextResponse.json({ success: false, error: `Failed to create draft: ${insErr.message}` }, { status: 500 });
    }
    if (!draft) {
      console.error('[FROM BRIEF] Draft insert succeeded but no data returned');
      return NextResponse.json({ success: false, error: 'Failed to create draft: no data returned' }, { status: 500 });
    }

    // Link brief -> draft (keep status as 'queued' since 'generating' constraint not yet applied)
    const { data: updatedBrief, error: updateErr } = await supabase
      .from('article_briefs')
      .update({ generated_article_id: draft.id, updated_at: new Date().toISOString() })
      .eq('id', brief.id)
      .eq('user_token', userToken)
      .select()
      .single();

    if (updateErr) {
      console.error('[FROM BRIEF] Failed to update brief with generated_article_id:', updateErr);
    } else {
      console.log('[FROM BRIEF] Successfully linked brief to article:', {
        briefId: brief.id,
        articleId: draft.id,
        briefStatus: updatedBrief?.status,
        generatedArticleId: updatedBrief?.generated_article_id
      });
    }

    // Send agent notification if conversationId provided
    if (conversationId) {
      console.log('[FROM BRIEF] Sending agent notification for article generation start');

      const { data: lastMessage } = await supabase
        .from('agent_conversations')
        .select('message_order')
        .eq('user_token', userToken)
        .eq('website_token', effectiveWebsiteToken)
        .eq('conversation_id', conversationId)
        .order('message_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextMessageOrder = (lastMessage?.message_order || 0) + 1;

      await supabase
        .from('agent_conversations')
        .insert({
          user_token: userToken,
          website_token: effectiveWebsiteToken,
          conversation_id: conversationId,
          message_role: 'assistant',
          message_content: `🚀 **Generating Article**\n\n📝 **"${draft.title}"**\n\nI'm now generating your article. This usually takes 1-2 minutes. I'll let you know when it's ready!`,
          action_card: {
            type: 'progress',
            data: {
              title: 'Article Generation',
              description: 'Generating article content...',
              progress: 0,
              status: 'running',
              articleId: draft.id,
              estimatedTime: '1-2 minutes'
            }
          },
          message_order: nextMessageOrder,
          metadata: {
            article_id: draft.id,
            brief_id: brief.id,
            generation_started: new Date().toISOString()
          }
        });

      console.log('[FROM BRIEF] Agent notification sent');
    }

    // Optionally trigger generation pipeline
    if (start) {
      console.log('[FROM BRIEF] Triggering article generation for article ID:', draft.id);

      if (process.env.ENABLE_REDIS_QUEUES === 'true') {
        // Add job to BullMQ queue for Railway worker processing
        try {
          console.log('[FROM BRIEF] Adding job to content-generation queue');

          const connection = new IORedis(process.env.REDIS_URL!, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
          });

          const queue = new Queue('content-generation', { connection });

          await queue.add('generate-article', {
            articleId: draft.id,
            userToken,
            payload: {
              articleId: draft.id,
              conversationId: null
            }
          });

          console.log('[FROM BRIEF] Job added to queue successfully');

          await queue.close();
          await connection.quit();
        } catch (error: any) {
          console.error('[FROM BRIEF] Error adding job to queue:', error.message);
        }
      } else {
        // Fallback: Direct processing (synchronous)
        try {
          const base = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('http'))
            ? process.env.NEXT_PUBLIC_APP_URL
            : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

          const processUrl = `${base}/api/articles/generate/process`;
          console.log('[FROM BRIEF] Calling process endpoint directly:', processUrl);

          const processResp = await fetch(processUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken, articleId: draft.id })
          });

          const processData = await processResp.json();
          console.log('[FROM BRIEF] Process endpoint response:', processData);

          if (!processResp.ok) {
            console.error('[FROM BRIEF] Process endpoint failed:', processData);
          }
        } catch (error: any) {
          console.error('[FROM BRIEF] Error triggering generation:', error.message);
        }
      }
    }

    const responsePayload = {
      success: true,
      draft,
      articleId: draft.id, // Include for client-side polling
      title: draft.title,
      status: draft.status
    };

    console.log('[FROM BRIEF] ✅ Successfully created draft:', {
      draftId: draft.id,
      briefId: brief.id,
      title: draft.title,
      status: draft.status,
      conversationId: conversationId || 'none'
    });
    console.log('[FROM BRIEF] 📤 Returning response with articleId:', draft.id);

    return NextResponse.json(responsePayload);
  } catch (e) {
    console.error('[FROM BRIEF] Error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: simple GET for health/route presence validation
export async function GET() {
  return NextResponse.json({ ok: true });
}
