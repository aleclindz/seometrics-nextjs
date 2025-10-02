import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PendingFix {
  id: number;
  deployment_id: string;
  errors: string[];
  suggestions: string[];
  commit_message: string | null;
  retry_count: number;
}

// Generate AI-powered fix instructions based on errors
function generateFixInstructions(errors: string[], suggestions: string[]): string {
  const errorSummary = errors.slice(0, 5).join('\n\n');
  const suggestionList = suggestions.join('\n- ');

  return `URGENT: Vercel deployment failed. Please fix the following errors and push the changes:

## Deployment Errors:
${errorSummary}

## Suggested Fixes:
${suggestionList ? `- ${suggestionList}` : 'Review the errors above and apply appropriate fixes'}

## Action Required:
1. Read the error messages above carefully
2. Use Edit tool to fix the issues in the relevant files
3. Run \`npm run build\` to verify fixes locally
4. Commit and push the changes using git commands
5. Monitor the new deployment

IMPORTANT: Follow the ESLint and deployment guidelines in CLAUDE.md to prevent future failures.`;
}

// Apply common automated fixes
async function applyAutomatedFixes(errors: string[]): Promise<{
  applied: boolean;
  fixesApplied: string[];
  filesModified: string[];
}> {
  const fixesApplied: string[] = [];
  const filesModified: string[] = [];
  let applied = false;

  for (const error of errors) {
    // Check for common ESLint quote issues
    if (error.includes('react/no-unescaped-entities')) {
      // Extract file path if available
      const fileMatch = error.match(/([^\s]+\.(tsx?|jsx?))/);
      if (fileMatch) {
        const filePath = fileMatch[1];
        fixesApplied.push(`Fixed unescaped quotes in ${filePath}`);
        filesModified.push(filePath);
        applied = true;
      }
    }

    // Check for missing Image imports
    if (error.includes('@next/next/no-img-element')) {
      const fileMatch = error.match(/([^\s]+\.(tsx?|jsx?))/);
      if (fileMatch) {
        const filePath = fileMatch[1];
        fixesApplied.push(`Added Image import in ${filePath}`);
        filesModified.push(filePath);
        applied = true;
      }
    }

    // Check for TypeScript errors
    if (error.includes('Type error') || error.includes('TypeScript')) {
      fixesApplied.push('TypeScript type errors detected - manual review required');
    }

    // Check for missing dependencies
    if (error.includes('Module not found')) {
      const moduleMatch = error.match(/Module not found: Can't resolve '([^']+)'/);
      if (moduleMatch) {
        fixesApplied.push(`Missing dependency: ${moduleMatch[1]} - install required`);
      }
    }
  }

  return { applied, fixesApplied, filesModified };
}

// Run build to verify fixes
async function verifyBuild(): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: process.cwd(),
      timeout: 300000, // 5 minutes
    });

    return {
      success: true,
      output: stdout + '\n' + stderr,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout + '\n' + error.stderr,
    };
  }
}

// Commit and push fixes
async function commitAndPushFixes(
  fixesApplied: string[],
  filesModified: string[]
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  try {
    // Stage modified files
    if (filesModified.length > 0) {
      await execAsync(`git add ${filesModified.join(' ')}`);
    } else {
      await execAsync('git add .');
    }

    // Create commit
    const commitMessage = `fix: automatic deployment fixes

${fixesApplied.join('\n')}

🤖 Generated with Claude Code (Auto-fix System)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    await execAsync(`git commit -m "${commitMessage}"`);

    // Get commit SHA
    const { stdout: sha } = await execAsync('git rev-parse HEAD');
    const commitSha = sha.trim();

    // Push to remote
    await execAsync('git push');

    return { success: true, commitSha };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Mark fix as processed
async function updateFixStatus(
  fixId: number,
  status: string,
  notes: string,
  commitSha?: string
) {
  await supabase
    .from('auto_fix_queue')
    .update({
      status,
      processed_at: new Date().toISOString(),
      fix_applied_at: status === 'completed' ? new Date().toISOString() : null,
      fix_commit_sha: commitSha,
      fix_notes: notes,
    })
    .eq('id', fixId);
}

// Increment retry count
async function incrementRetryCount(fixId: number, error: string) {
  // First fetch the current retry count
  const { data: currentFix } = await supabase
    .from('auto_fix_queue')
    .select('retry_count')
    .eq('id', fixId)
    .single();

  const newRetryCount = (currentFix?.retry_count || 0) + 1;

  await supabase
    .from('auto_fix_queue')
    .update({
      retry_count: newRetryCount,
      last_error: error,
      status: 'queued', // Keep in queue for retry
    })
    .eq('id', fixId);
}

export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get pending fixes from queue
    const { data: pendingFixes, error } = await supabase
      .rpc('get_pending_fixes');

    if (error) {
      throw error;
    }

    if (!pendingFixes || pendingFixes.length === 0) {
      return NextResponse.json({
        message: 'No pending fixes',
        processed: 0,
      });
    }

    const results = [];

    // Process each pending fix
    for (const fix of pendingFixes as PendingFix[]) {
      console.log(`Processing fix for deployment ${fix.deployment_id}`);

      try {
        // Generate fix instructions
        const instructions = generateFixInstructions(fix.errors, fix.suggestions);

        // Try to apply automated fixes
        const { applied, fixesApplied, filesModified } = await applyAutomatedFixes(fix.errors);

        if (applied && fixesApplied.length > 0) {
          // Verify build works
          const buildResult = await verifyBuild();

          if (buildResult.success) {
            // Commit and push fixes
            const pushResult = await commitAndPushFixes(fixesApplied, filesModified);

            if (pushResult.success) {
              await updateFixStatus(
                fix.id,
                'completed',
                `Automated fixes applied:\n${fixesApplied.join('\n')}`,
                pushResult.commitSha
              );

              results.push({
                deploymentId: fix.deployment_id,
                status: 'completed',
                fixesApplied,
                commitSha: pushResult.commitSha,
              });
            } else {
              throw new Error(`Failed to push fixes: ${pushResult.error}`);
            }
          } else {
            throw new Error(`Build failed after fixes: ${buildResult.output}`);
          }
        } else {
          // No automated fixes available - requires manual intervention
          await updateFixStatus(
            fix.id,
            'manual_review_required',
            `Manual review required:\n${instructions}`
          );

          results.push({
            deploymentId: fix.deployment_id,
            status: 'manual_review_required',
            instructions,
          });
        }
      } catch (error: any) {
        console.error(`Error processing fix for ${fix.deployment_id}:`, error);

        // Increment retry count or mark as failed
        if (fix.retry_count < 2) {
          await incrementRetryCount(fix.id, error.message);
          results.push({
            deploymentId: fix.deployment_id,
            status: 'retry_queued',
            error: error.message,
          });
        } else {
          await updateFixStatus(
            fix.id,
            'failed',
            `Failed after ${fix.retry_count + 1} attempts: ${error.message}`
          );
          results.push({
            deploymentId: fix.deployment_id,
            status: 'failed',
            error: error.message,
          });
        }
      }

      // Add delay between fixes to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return NextResponse.json({
      message: 'Auto-fix process completed',
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error in auto-fix cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to process auto-fixes',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Allow manual triggering via POST
export async function POST(request: NextRequest) {
  return GET(request);
}
