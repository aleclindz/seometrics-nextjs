/**
 * GET /api/strategy/status?websiteToken=xxx
 *
 * Returns strategy initialization status for a website
 *
 * Response:
 * {
 *   initialized: boolean
 *   discoveryId?: number
 *   clusterCount: number
 *   pillarCount: number
 *   supportingCount: number
 *   lastDiscoveryAt?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStrategyStatus } from '@/services/strategy/discovery-persistence';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteToken = searchParams.get('websiteToken');

    if (!websiteToken) {
      return NextResponse.json(
        { error: 'Missing websiteToken parameter' },
        { status: 400 }
      );
    }

    const status = await getStrategyStatus(websiteToken);

    if (!status) {
      // Website has no strategy initialized
      return NextResponse.json({
        initialized: false,
        clusterCount: 0,
        pillarCount: 0,
        supportingCount: 0
      });
    }

    return NextResponse.json({
      initialized: status.strategy_initialized || false,
      discoveryId: status.last_discovery_id,
      discoveryType: status.discovery_type,
      discoveryStatus: status.discovery_status,
      clusterCount: status.cluster_count || 0,
      pillarCount: status.pillar_count || 0,
      supportingCount: status.supporting_count || 0,
      lastDiscoveryAt: status.discovery_created_at || status.strategy_initialized_at
    });

  } catch (error) {
    console.error('[STRATEGY STATUS API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch strategy status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
