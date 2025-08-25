import { NextRequest, NextResponse } from 'next/server';
import { PolicyEngine } from '@/services/agent/policy-engine';

export const dynamic = 'force-dynamic';

// GET /api/agent/policies - Get policy information and recommendations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteUrl = searchParams.get('siteUrl');
    const actionType = searchParams.get('actionType');

    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
    }

    // Get default policy for new sites
    const newSitePolicy = PolicyEngine.getNewSitePolicy();

    // If specific action type requested, get its default policy
    let actionPolicy = null;
    if (actionType) {
      const mockContext = {
        actionId: 'mock',
        actionType,
        userToken,
        siteUrl: siteUrl || 'example.com',
        payload: {}
      };

      // This would normally validate, but for GET we just want to see the default
      actionPolicy = {
        actionType,
        recommendedPolicy: PolicyEngine.getNewSitePolicy(),
        riskLevel: 'medium', // Default assumption
        requiresApproval: true
      };
    }

    // Check user permissions if site URL provided
    let permissions = null;
    if (siteUrl && actionType) {
      const hasPermission = await PolicyEngine.checkUserPermissions(
        userToken,
        siteUrl,
        actionType
      );

      permissions = {
        hasPermission,
        siteUrl,
        actionType
      };
    }

    return NextResponse.json({
      success: true,
      policies: {
        newSiteDefault: newSitePolicy,
        actionSpecific: actionPolicy,
        userPermissions: permissions
      },
      recommendations: generatePolicyRecommendations(userToken, siteUrl, actionType)
    });

  } catch (error) {
    console.error('[AGENT POLICIES] Get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent/policies/validate - Validate a policy for an action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      actionId,
      actionType,
      siteUrl,
      payload,
      requestedPolicy,
      targetUrls
    } = body;

    if (!userToken || !actionType || !siteUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, actionType, siteUrl' },
        { status: 400 }
      );
    }

    const context = {
      actionId: actionId || `temp_${Date.now()}`,
      actionType,
      userToken,
      siteUrl,
      payload: payload || {},
      targetUrls: targetUrls || []
    };

    // Validate the policy
    const validation = await PolicyEngine.validatePolicy(context, requestedPolicy || {});

    let approvalRequestId = null;
    if (validation.approvalRequired && validation.adjustedPolicy) {
      try {
        approvalRequestId = await PolicyEngine.createApprovalRequest(
          context,
          validation.adjustedPolicy
        );
      } catch (error) {
        console.error('[AGENT POLICIES] Approval request failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      validation: {
        allowed: validation.allowed,
        reason: validation.reason,
        estimatedRisk: validation.estimatedRisk,
        approvalRequired: validation.approvalRequired,
        approvalRequestId,
        adjustedPolicy: validation.adjustedPolicy
      },
      recommendations: validation.allowed ? 
        generateExecutionRecommendations(validation.adjustedPolicy!) : 
        generateRejectionRecommendations(validation.reason || 'Unknown error')
    });

  } catch (error) {
    console.error('[AGENT POLICIES] Validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generatePolicyRecommendations(
  userToken: string,
  siteUrl?: string | null,
  actionType?: string | null
): string[] {
  const recommendations = [];

  if (!siteUrl) {
    recommendations.push('Specify a site URL to get site-specific policy recommendations');
  }

  if (!actionType) {
    recommendations.push('Specify an action type to get action-specific policy guidance');
  }

  if (siteUrl && actionType) {
    switch (actionType) {
      case 'technical_seo_fix':
        recommendations.push('Start with DRY_RUN environment to preview changes');
        recommendations.push('Limit maxPages to 20 or less for initial testing');
        recommendations.push('Enable rollback capability for all technical fixes');
        break;
      case 'content_generation':
        recommendations.push('Content generation is generally low-risk and can run in PRODUCTION');
        recommendations.push('Consider setting maxPages to 1 for focused content creation');
        break;
      case 'cms_publishing':
        recommendations.push('Always require approval for CMS publishing actions');
        recommendations.push('Use STAGING environment first to test publication workflow');
        break;
      default:
        recommendations.push('Use conservative settings for unknown action types');
        recommendations.push('Start with DRY_RUN environment and approval required');
    }
  }

  recommendations.push('Monitor execution stats to adjust policies over time');
  recommendations.push('Higher blast radius actions always require manual approval');

  return recommendations;
}

function generateExecutionRecommendations(policy: any): string[] {
  const recommendations = [];

  if (policy.environment === 'PRODUCTION') {
    recommendations.push('Running in PRODUCTION - changes will be live immediately');
  } else if (policy.environment === 'DRY_RUN') {
    recommendations.push('DRY_RUN mode active - no actual changes will be made');
  }

  if (policy.blastRadius?.riskLevel === 'high') {
    recommendations.push('High-risk operation - monitor closely during execution');
  }

  if (policy.maxPages && policy.maxPages > 50) {
    recommendations.push('Large-scale operation - consider running in smaller batches');
  }

  if (!policy.blastRadius?.rollbackRequired) {
    recommendations.push('No rollback capability - ensure changes are thoroughly tested');
  }

  return recommendations;
}

function generateRejectionRecommendations(reason: string): string[] {
  const recommendations = [];

  recommendations.push(`Action blocked: ${reason}`);

  if (reason.includes('permission')) {
    recommendations.push('Verify website ownership and management status');
    recommendations.push('Check if website is marked as managed in your account');
  }

  if (reason.includes('approval')) {
    recommendations.push('Request manual approval for this high-risk action');
    recommendations.push('Consider reducing blast radius or using DRY_RUN mode');
  }

  if (reason.includes('limit')) {
    recommendations.push('Check your subscription limits and usage');
    recommendations.push('Consider upgrading your plan for higher limits');
  }

  recommendations.push('Contact support if you believe this restriction is incorrect');

  return recommendations;
}