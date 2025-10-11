/**
 * POST /api/strategy/reset
 *
 * Resets strategy initialization for a website
 * Deletes all strategy data: discoveries, clusters, article_roles, briefs
 *
 * Body:
 * {
 *   websiteToken: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearWebsiteStrategy } from '@/services/strategy/discovery-persistence';
import { z } from 'zod';

const ResetRequestSchema = z.object({
  websiteToken: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = ResetRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { websiteToken } = validation.data;

    console.log('[STRATEGY RESET] Starting reset for', websiteToken);

    // Clear all strategy data
    await clearWebsiteStrategy(websiteToken);

    console.log('[STRATEGY RESET] Reset completed for', websiteToken);

    return NextResponse.json({
      success: true,
      websiteToken,
      message: 'Strategy initialization reset successfully. Ready for fresh initialization.'
    });

  } catch (error) {
    console.error('[STRATEGY RESET] Error:', error);
    return NextResponse.json(
      {
        error: 'Reset failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
