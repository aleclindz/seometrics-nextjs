import { NextRequest, NextResponse } from 'next/server';
import { OpenAIFunctionClient } from '@/services/chat/openai-function-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {} as Record<string, any>,
    errors: [] as string[],
    responseTime: 0
  };

  try {
    // Check 1: OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY;
    results.checks.openai_key = {
      status: apiKey ? 'pass' : 'fail',
      message: apiKey ? 'API key configured' : 'Missing OPENAI_API_KEY'
    };
    if (!apiKey) results.errors.push('OpenAI API key not configured');

    // Check 2: Database Connection
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Test a simple query
      const { data, error } = await supabase
        .from('login_users')
        .select('token', { count: 'exact', head: true });
        
      results.checks.database = {
        status: error ? 'fail' : 'pass',
        message: error ? `Database error: ${error.message}` : 'Database connected'
      };
      if (error) results.errors.push(`Database: ${error.message}`);
    } catch (dbError) {
      results.checks.database = {
        status: 'fail',
        message: `Database connection failed: ${dbError}`
      };
      results.errors.push(`Database connection failed`);
    }

    // Check 3: Test Simple Agent Function
    if (apiKey) {
      try {
        const openaiClient = new OpenAIFunctionClient(apiKey);
        
        // Test a basic message (without function calling to avoid DB dependencies)
        const testContext = {
          history: [],
          siteContext: { selectedSite: 'test.com', userSites: [] },
          userToken: 'test-health-check'
        };
        
        // Simple message that shouldn't trigger function calls
        const response = await openaiClient.sendMessage(
          "Just say 'Health check successful' in one sentence.", 
          testContext
        );
        
        results.checks.agent_response = {
          status: response.content ? 'pass' : 'fail',
          message: response.content ? 'Agent responding normally' : 'Agent not responding',
          response_preview: response.content?.substring(0, 100) + '...'
        };
        
        if (!response.content) results.errors.push('Agent not responding to basic queries');
      } catch (agentError) {
        results.checks.agent_response = {
          status: 'fail', 
          message: `Agent error: ${agentError}`,
        };
        results.errors.push(`Agent functionality failed`);
      }
    } else {
      results.checks.agent_response = {
        status: 'skip',
        message: 'Skipped due to missing OpenAI key'
      };
    }

    // Check 4: Required Database Tables (basic check)
    const requiredTables = ['agent_events', 'agent_actions', 'agent_ideas'];
    const missingTables = [];
    
    // Note: In production, we'd check if these tables exist
    // For now, we'll assume they're missing if we get table errors
    results.checks.agent_tables = {
      status: 'warning',
      message: 'Agent tables may not exist - some functions will fail',
      missing_tables: requiredTables // Assume missing for now
    };
    
    // Set overall status
    const failedChecks = Object.values(results.checks).filter(check => check.status === 'fail').length;
    if (failedChecks > 0) {
      results.status = 'unhealthy';
    } else if (Object.values(results.checks).some(check => check.status === 'warning')) {
      results.status = 'degraded';
    }

    results.responseTime = Date.now() - startTime;

    return NextResponse.json(results, { 
      status: results.status === 'healthy' ? 200 : 500 
    });

  } catch (error) {
    console.error('[AGENT HEALTH] Unexpected error:', error);
    results.status = 'unhealthy';
    results.errors.push(`Health check failed: ${error}`);
    results.responseTime = Date.now() - startTime;
    
    return NextResponse.json(results, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Run extended tests with actual function calls
  const startTime = Date.now();
  const body = await request.json();
  const { userToken, testFunctions = [] } = body;

  if (!userToken) {
    return NextResponse.json({ error: 'User token required for extended tests' }, { status: 400 });
  }

  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    userToken,
    functionTests: {} as Record<string, any>,
    errors: [] as string[],
    responseTime: 0
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const openaiClient = new OpenAIFunctionClient(apiKey);
    const testContext = {
      history: [],
      siteContext: { selectedSite: 'test.com', userSites: [{ id: 'test.com', url: 'test.com', name: 'test.com' }] },
      userToken
    };

    // Test specific functions if requested
    const functionsToTest = testFunctions.length > 0 ? testFunctions : [
      'summarize_activity',
      'create_idea', 
      'check_technical_seo'
    ];

    for (const functionName of functionsToTest) {
      let testQuery = '';
      try {
        switch (functionName) {
          case 'summarize_activity':
            testQuery = 'Show me recent activity summary';
            break;
          case 'create_idea':
            testQuery = 'Create an idea to improve site performance';
            break;
          case 'check_technical_seo':
            testQuery = 'Check technical SEO status';
            break;
          default:
            testQuery = `Test ${functionName} function`;
        }

        const response = await openaiClient.sendMessage(testQuery, testContext);
        
        results.functionTests[functionName] = {
          status: response.content && !response.content.includes('Error') ? 'pass' : 'fail',
          query: testQuery,
          responsePreview: response.content?.substring(0, 200) + '...',
          functionCalled: response.functionCall?.name || null,
          hasError: response.content?.includes('Error') || false
        };

      } catch (fnError) {
        results.functionTests[functionName] = {
          status: 'fail',
          error: `${fnError}`,
          query: testQuery
        };
        results.errors.push(`${functionName}: ${fnError}`);
      }
    }

    // Set overall status
    const failedTests = Object.values(results.functionTests).filter(test => test.status === 'fail').length;
    if (failedTests > 0) {
      results.status = 'degraded';
    }

    results.responseTime = Date.now() - startTime;

    return NextResponse.json(results, { 
      status: results.status === 'healthy' ? 200 : 207 // 207 = Multi-Status (some tests failed)
    });

  } catch (error) {
    console.error('[AGENT HEALTH] Function test error:', error);
    results.status = 'unhealthy';
    results.errors.push(`Function tests failed: ${error}`);
    results.responseTime = Date.now() - startTime;
    
    return NextResponse.json(results, { status: 500 });
  }
}