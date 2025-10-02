import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VercelWebhookPayload {
  id: string;
  type: string;
  createdAt: number;
  payload: {
    deployment: {
      id: string;
      url: string;
      name: string;
      meta?: {
        githubCommitRef?: string;
        githubCommitSha?: string;
        githubCommitMessage?: string;
      };
    };
    project: {
      id: string;
      name: string;
    };
    team?: {
      id: string;
    };
    links?: {
      deployment: string;
      project: string;
    };
  };
  region: string;
}

// Verify webhook signature from Vercel
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Get deployment build logs from Vercel
async function getDeploymentLogs(deploymentId: string, teamId?: string) {
  try {
    const url = new URL(`https://api.vercel.com/v3/deployments/${deploymentId}/events`);
    if (teamId) {
      url.searchParams.set('teamId', teamId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch deployment logs: ${response.statusText}`);
    }

    const events = await response.json();
    return events;
  } catch (error) {
    console.error('Error fetching deployment logs:', error);
    return null;
  }
}

// Analyze build errors and generate fix suggestions
function analyzeDeploymentErrors(logs: any[]): {
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!logs || !Array.isArray(logs)) {
    return { errors, suggestions };
  }

  for (const log of logs) {
    if (log.type === 'stderr' || log.payload?.text?.includes('Error')) {
      const errorText = log.payload?.text || log.text || '';
      errors.push(errorText);

      // Analyze common error patterns
      if (errorText.includes('ESLint')) {
        suggestions.push('Run `npm run build` locally to fix ESLint errors before deploying');
      }
      if (errorText.includes('Type error') || errorText.includes('TypeScript')) {
        suggestions.push('Fix TypeScript type errors - run `npx tsc --noEmit` to check');
      }
      if (errorText.includes('Module not found')) {
        suggestions.push('Install missing dependencies with `npm install`');
      }
      if (errorText.includes('react/no-unescaped-entities')) {
        suggestions.push('Replace apostrophes with &apos; and quotes with &ldquo; &rdquo; in JSX');
      }
      if (errorText.includes('@next/next/no-img-element')) {
        suggestions.push('Replace <img> tags with <Image> from next/image');
      }
    }
  }

  return { errors, suggestions };
}

// Log deployment failure to database
async function logDeploymentFailure(
  deploymentId: string,
  deploymentUrl: string,
  projectName: string,
  errors: string[],
  suggestions: string[]
) {
  try {
    await supabase.from('deployment_failures').insert({
      deployment_id: deploymentId,
      deployment_url: deploymentUrl,
      project_name: projectName,
      errors: errors,
      suggestions: suggestions,
      status: 'pending_fix',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging deployment failure:', error);
  }
}

// Trigger Claude Code to fix the deployment
async function triggerAutomaticFix(
  deploymentId: string,
  errors: string[],
  suggestions: string[],
  commitMessage?: string
) {
  // Store the fix request in a queue that Claude Code can monitor
  try {
    await supabase.from('auto_fix_queue').insert({
      deployment_id: deploymentId,
      errors: errors,
      suggestions: suggestions,
      commit_message: commitMessage,
      status: 'queued',
      created_at: new Date().toISOString(),
    });

    console.log(`Auto-fix queued for deployment ${deploymentId}`);
  } catch (error) {
    console.error('Error queuing auto-fix:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-vercel-signature');

    // Verify webhook signature if secret is configured
    if (process.env.VERCEL_WEBHOOK_SECRET && signature) {
      const isValid = verifySignature(
        rawBody,
        signature,
        process.env.VERCEL_WEBHOOK_SECRET
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const payload: VercelWebhookPayload = JSON.parse(rawBody);

    console.log('Vercel webhook received:', {
      type: payload.type,
      deploymentId: payload.payload?.deployment?.id,
      deploymentUrl: payload.payload?.deployment?.url,
    });

    // Handle deployment failure events (deployment.error is the only failure event)
    if (payload.type === 'deployment.error') {
      const { deployment, project, team } = payload.payload;

      // Fetch deployment logs to analyze the failure
      const logs = await getDeploymentLogs(deployment.id, team?.id);

      // Analyze errors and generate fix suggestions
      const { errors, suggestions } = analyzeDeploymentErrors(logs);

      // Log the failure to database
      await logDeploymentFailure(
        deployment.id,
        deployment.url,
        project.name,
        errors,
        suggestions
      );

      // Trigger automatic fix process
      await triggerAutomaticFix(
        deployment.id,
        errors,
        suggestions,
        deployment.meta?.githubCommitMessage
      );

      return NextResponse.json({
        message: 'Deployment failure processed',
        deploymentId: deployment.id,
        errorsFound: errors.length,
        suggestionsGenerated: suggestions.length,
        autoFixQueued: true,
      });
    }

    // Handle successful deployment events
    if (payload.type === 'deployment.succeeded') {
      // Clear any pending fixes for this project
      const { project } = payload.payload;
      await supabase
        .from('auto_fix_queue')
        .update({ status: 'resolved' })
        .eq('status', 'queued')
        .ilike('commit_message', `%${project.name}%`);

      return NextResponse.json({
        message: 'Deployment success acknowledged',
      });
    }

    return NextResponse.json({
      message: 'Webhook received',
      type: payload.type,
    });
  } catch (error) {
    console.error('Error processing Vercel webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
