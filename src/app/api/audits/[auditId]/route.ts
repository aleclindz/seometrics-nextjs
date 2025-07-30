import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuditRouteContext {
  params: {
    auditId: string;
  };
}

// GET /api/audits/[auditId] - Get audit status and results
export async function GET(request: NextRequest, context: AuditRouteContext) {
  try {
    const { auditId } = context.params;
    const userToken = request.nextUrl.searchParams.get('userToken');
    
    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 400 });
    }

    if (!auditId) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    // Set RLS context
    await supabase.rpc('set_config', {
      config_key: 'app.current_user_token',
      config_value: userToken
    });

    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('seo_audits')
      .select('*')
      .eq('id', auditId)
      .eq('user_token', userToken)
      .single();

    if (auditError || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Get audit issues if audit is completed
    let issues = [];
    let pages = [];

    if (audit.status === 'completed') {
      // Get issues
      const { data: auditIssues, error: issuesError } = await supabase
        .from('audit_issues')
        .select('*')
        .eq('audit_id', auditId)
        .eq('user_token', userToken)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (!issuesError && auditIssues) {
        issues = auditIssues;
      }

      // Get pages
      const { data: auditPages, error: pagesError } = await supabase
        .from('audit_pages')
        .select('*')
        .eq('audit_id', auditId)
        .eq('user_token', userToken)
        .order('crawled_at', { ascending: false });

      if (!pagesError && auditPages) {
        pages = auditPages;
      }
    }

    return NextResponse.json({
      success: true,
      audit: {
        ...audit,
        issues,
        pages,
        issuesByCategory: groupIssuesByCategory(issues),
        issuesBySeverity: groupIssuesBySeverity(issues)
      }
    });

  } catch (error) {
    console.error('Error fetching audit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/audits/[auditId] - Update audit status or fix issues
export async function PATCH(request: NextRequest, context: AuditRouteContext) {
  try {
    const { auditId } = context.params;
    const userToken = request.nextUrl.searchParams.get('userToken');
    
    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 400 });
    }

    if (!auditId) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    // Set RLS context
    await supabase.rpc('set_config', {
      config_key: 'app.current_user_token',
      config_value: userToken
    });

    const body = await request.json();
    const { action, issueId, issueIds } = body;

    // Handle different actions
    switch (action) {
      case 'mark_issue_fixed':
        if (!issueId) {
          return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
        }

        await supabase
          .from('audit_issues')
          .update({ 
            status: 'fixed', 
            fixed_at: new Date().toISOString() 
          })
          .eq('id', issueId)
          .eq('audit_id', auditId)
          .eq('user_token', userToken);

        break;

      case 'mark_issue_ignored':
        if (!issueId) {
          return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
        }

        await supabase
          .from('audit_issues')
          .update({ status: 'ignored' })
          .eq('id', issueId)
          .eq('audit_id', auditId)
          .eq('user_token', userToken);

        break;

      case 'mark_multiple_fixed':
        if (!issueIds || !Array.isArray(issueIds)) {
          return NextResponse.json({ error: 'Issue IDs array is required' }, { status: 400 });
        }

        await supabase
          .from('audit_issues')
          .update({ 
            status: 'fixed', 
            fixed_at: new Date().toISOString() 
          })
          .in('id', issueIds)
          .eq('audit_id', auditId)
          .eq('user_token', userToken);

        break;

      case 'rerun_audit':
        // Mark current audit as superseded and create a new one
        await supabase
          .from('seo_audits')
          .update({ status: 'superseded' })
          .eq('id', auditId)
          .eq('user_token', userToken);

        // This would typically trigger a new audit
        // For now, we'll just return success
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Audit updated successfully'
    });

  } catch (error) {
    console.error('Error updating audit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/audits/[auditId] - Delete an audit
export async function DELETE(request: NextRequest, context: AuditRouteContext) {
  try {
    const { auditId } = context.params;
    const userToken = request.nextUrl.searchParams.get('userToken');
    
    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 400 });
    }

    if (!auditId) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    // Set RLS context
    await supabase.rpc('set_config', {
      config_key: 'app.current_user_token',
      config_value: userToken
    });

    // Delete the audit (cascading deletes will handle issues and pages)
    const { error } = await supabase
      .from('seo_audits')
      .delete()
      .eq('id', auditId)
      .eq('user_token', userToken);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete audit' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Audit deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting audit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function groupIssuesByCategory(issues: any[]) {
  const categories: Record<string, any[]> = {};
  issues.forEach(issue => {
    if (!categories[issue.category]) {
      categories[issue.category] = [];
    }
    categories[issue.category].push(issue);
  });
  return categories;
}

function groupIssuesBySeverity(issues: any[]) {
  const severities: Record<string, any[]> = {
    critical: [],
    warning: [],
    info: []
  };
  issues.forEach(issue => {
    if (severities[issue.severity]) {
      severities[issue.severity].push(issue);
    }
  });
  return severities;
}