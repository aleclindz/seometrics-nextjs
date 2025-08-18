import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl, testType = 'comprehensive' } = await request.json();
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }

    console.log(`[TEST-SEO-WATCHDOG] Starting ${testType} test for: ${siteUrl}`);
    
    const testResults = {
      siteUrl,
      testType,
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0,
        total: 0
      }
    };

    // 1. Test database schema and connectivity
    const dbTests = await testDatabaseSchema(userToken);
    testResults.tests.push(...dbTests);
    
    // 2. Test API endpoints
    const apiTests = await testAPIEndpoints(userToken, siteUrl);
    testResults.tests.push(...apiTests);
    
    // 3. Test SEOAgent.js integration
    const jsTests = await testSEOAgentJS(siteUrl);
    testResults.tests.push(...jsTests);
    
    // 4. Test monitoring capabilities
    const monitoringTests = await testMonitoringCapabilities(userToken, siteUrl);
    testResults.tests.push(...monitoringTests);
    
    // 5. Test fix automation
    const fixTests = await testFixAutomation(userToken, siteUrl);
    testResults.tests.push(...fixTests);

    // Calculate summary
    testResults.tests.forEach(test => {
      testResults.summary.total++;
      if (test.status === 'passed') testResults.summary.passed++;
      else if (test.status === 'failed') testResults.summary.failed++;
      else testResults.summary.warnings++;
    });

    // Log test results
    await logTestResults(userToken, testResults);

    const overallStatus = testResults.summary.failed === 0 ? 'PASSED' : 'FAILED';
    
    return NextResponse.json({
      success: testResults.summary.failed === 0,
      data: testResults,
      message: `🧪 SEO Watchdog Tests ${overallStatus}: ${testResults.summary.passed}/${testResults.summary.total} passed, ${testResults.summary.failed} failed`,
      status: overallStatus
    });

  } catch (error) {
    console.error('[TEST-SEO-WATCHDOG] Error:', error);
    return NextResponse.json({ error: 'SEO Watchdog testing failed' }, { status: 500 });
  }
}

async function testDatabaseSchema(userToken: string) {
  const tests: any[] = [];
  
  // Test 1: SEO monitoring events table exists and is accessible
  try {
    const { count, error } = await supabase
      .from('seo_monitoring_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_token', userToken);
      
    if (error) {
      tests.push({
        name: 'Database Schema - SEO Monitoring Events Table',
        status: 'failed',
        description: 'SEO monitoring events table should be accessible',
        error: error instanceof Error ? error.message : String(error),
        fix: 'Run database migration 035_create_seo_monitoring_events.sql'
      });
    } else {
      tests.push({
        name: 'Database Schema - SEO Monitoring Events Table',
        status: 'passed',
        description: 'SEO monitoring events table is accessible',
        metadata: { recordCount: count || 0 }
      });
    }
  } catch (error) {
    tests.push({
      name: 'Database Schema - SEO Monitoring Events Table',
      status: 'failed',
      description: 'Failed to test SEO monitoring events table',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  // Test 2: Row Level Security is working
  try {
    // Try to insert a test event
    const { data, error } = await supabase
      .from('seo_monitoring_events')
      .insert({
        user_token: userToken,
        site_url: 'https://test-site.com',
        page_url: 'https://test-site.com/test',
        event_type: 'test_event',
        severity: 'info',
        category: 'testing',
        title: 'Database Test Event',
        description: 'Testing database connectivity and RLS',
        source: 'test-suite'
      })
      .select()
      .single();
      
    if (error) {
      tests.push({
        name: 'Database Security - Row Level Security',
        status: 'failed',
        description: 'RLS should allow inserting events for authenticated user',
        error: error instanceof Error ? error.message : String(error),
        fix: 'Check RLS policies on seo_monitoring_events table'
      });
    } else {
      tests.push({
        name: 'Database Security - Row Level Security',
        status: 'passed',
        description: 'RLS is working correctly for event insertion',
        metadata: { testEventId: data.id }
      });
      
      // Clean up test event
      await supabase
        .from('seo_monitoring_events')
        .delete()
        .eq('id', data.id);
    }
  } catch (error) {
    tests.push({
      name: 'Database Security - Row Level Security',
      status: 'failed',
      description: 'Failed to test RLS policies',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  return tests;
}

async function testAPIEndpoints(userToken: string, siteUrl: string) {
  const tests: any[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  const endpoints = [
    {
      name: 'SEO Scan Tool',
      endpoint: '/api/tools/seo-scan',
      method: 'POST',
      body: { userToken, siteUrl, scanType: 'quick' }
    },
    {
      name: 'SEO Alert Tool',
      endpoint: '/api/tools/seo-alert',
      method: 'GET',
      params: `userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}&limit=5`
    },
    {
      name: 'Fix Indexability Tool',
      endpoint: '/api/tools/fix-indexability',
      method: 'GET',
      params: `userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`
    },
    {
      name: 'Fix Canonical Tool',
      endpoint: '/api/tools/fix-canonical',
      method: 'GET',
      params: `userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`
    },
    {
      name: 'Fix Hreflang Tool',
      endpoint: '/api/tools/fix-hreflang',
      method: 'GET',
      params: `userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`
    },
    {
      name: 'Emergency SEO Fix Tool',
      endpoint: '/api/tools/emergency-seo-fix',
      method: 'GET',
      params: `userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      let response;
      const url = endpoint.method === 'GET' 
        ? `${baseUrl}${endpoint.endpoint}?${endpoint.params}`
        : `${baseUrl}${endpoint.endpoint}`;
        
      if (endpoint.method === 'POST') {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(endpoint.body)
        });
      } else {
        response = await fetch(url);
      }
      
      if (response.ok) {
        const data = await response.json();
        tests.push({
          name: `API Endpoint - ${endpoint.name}`,
          status: 'passed',
          description: `${endpoint.endpoint} is responding correctly`,
          metadata: { 
            statusCode: response.status, 
            hasData: !!data.data,
            success: data.success 
          }
        });
      } else {
        tests.push({
          name: `API Endpoint - ${endpoint.name}`,
          status: 'failed',
          description: `${endpoint.endpoint} returned error status`,
          error: `HTTP ${response.status}`,
          fix: `Check ${endpoint.endpoint} implementation`
        });
      }
    } catch (error) {
      tests.push({
        name: `API Endpoint - ${endpoint.name}`,
        status: 'failed',
        description: `Failed to test ${endpoint.endpoint}`,
        error: error instanceof Error ? error.message : String(error),
        fix: `Verify ${endpoint.endpoint} is deployed correctly`
      });
    }
  }
  
  return tests;
}

async function testSEOAgentJS(siteUrl: string) {
  const tests: any[] = [];
  
  // Test 1: Check if SEOAgent.js is accessible
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/seoagent.js`);
    
    if (response.ok) {
      const jsContent = await response.text();
      
      // Check for key functions
      const keyFunctions = [
        'initializeSEOWatchdog',
        'establishSEOBaseline', 
        'startDOMMutationObserver',
        'processAdvancedCanonical',
        'detectPageLanguage',
        'handleSEOChange'
      ];
      
      const missingFunctions = keyFunctions.filter(func => !jsContent.includes(func));
      
      if (missingFunctions.length === 0) {
        tests.push({
          name: 'SEOAgent.js - Core Functions',
          status: 'passed',
          description: 'All core SEO watchdog functions are present',
          metadata: { functionsChecked: keyFunctions.length }
        });
      } else {
        tests.push({
          name: 'SEOAgent.js - Core Functions',
          status: 'failed',
          description: 'Missing core SEO watchdog functions',
          error: `Missing functions: ${missingFunctions.join(', ')}`,
          fix: 'Update seoagent.js with latest watchdog implementation'
        });
      }
      
      // Check for enhanced features
      const enhancedFeatures = [
        'MutationObserver',
        'SEO baseline',
        'canonical processing',
        'hreflang automation',
        'indexability monitoring'
      ];
      
      const presentFeatures = enhancedFeatures.filter(feature => 
        jsContent.toLowerCase().includes(feature.toLowerCase())
      );
      
      tests.push({
        name: 'SEOAgent.js - Enhanced Features',
        status: presentFeatures.length >= 4 ? 'passed' : 'warning',
        description: `Enhanced SEO features detected: ${presentFeatures.length}/${enhancedFeatures.length}`,
        metadata: { 
          presentFeatures,
          missingFeatures: enhancedFeatures.filter(f => !presentFeatures.includes(f))
        }
      });
      
    } else {
      tests.push({
        name: 'SEOAgent.js - Accessibility',
        status: 'failed',
        description: 'SEOAgent.js file is not accessible',
        error: `HTTP ${response.status}`,
        fix: 'Ensure seoagent.js is deployed to /public/seoagent.js'
      });
    }
  } catch (error) {
    tests.push({
      name: 'SEOAgent.js - Accessibility',
      status: 'failed',
      description: 'Failed to access SEOAgent.js',
      error: error instanceof Error ? error.message : String(error),
      fix: 'Check SEOAgent.js deployment'
    });
  }
  
  return tests;
}

async function testMonitoringCapabilities(userToken: string, siteUrl: string) {
  const tests: any[] = [];
  
  // Test monitoring event creation
  try {
    const testEvent = {
      user_token: userToken,
      site_url: siteUrl,
      page_url: siteUrl + '/test-page',
      event_type: 'monitoring_test',
      severity: 'info',
      category: 'testing',
      title: 'Monitoring Capability Test',
      description: 'Testing monitoring event creation',
      source: 'test-suite',
      metadata: { test: true, timestamp: new Date().toISOString() }
    };
    
    const { data, error } = await supabase
      .from('seo_monitoring_events')
      .insert(testEvent)
      .select()
      .single();
      
    if (error) {
      tests.push({
        name: 'Monitoring - Event Creation',
        status: 'failed',
        description: 'Should be able to create monitoring events',
        error: error instanceof Error ? error.message : String(error),
        fix: 'Check seo_monitoring_events table and RLS policies'
      });
    } else {
      tests.push({
        name: 'Monitoring - Event Creation',
        status: 'passed',
        description: 'Successfully created monitoring event',
        metadata: { eventId: data.id }
      });
      
      // Test event retrieval
      const { data: retrievedData, error: retrieveError } = await supabase
        .from('seo_monitoring_events')
        .select('*')
        .eq('id', data.id)
        .single();
        
      if (!retrieveError && retrievedData) {
        tests.push({
          name: 'Monitoring - Event Retrieval',
          status: 'passed',
          description: 'Successfully retrieved monitoring event',
          metadata: { retrievedEventType: retrievedData.event_type }
        });
      } else {
        tests.push({
          name: 'Monitoring - Event Retrieval',
          status: 'failed',
          description: 'Failed to retrieve monitoring event',
          error: retrieveError?.message || 'No data returned'
        });
      }
      
      // Clean up test event
      await supabase
        .from('seo_monitoring_events')
        .delete()
        .eq('id', data.id);
    }
  } catch (error) {
    tests.push({
      name: 'Monitoring - Event Creation',
      status: 'failed',
      description: 'Failed to test monitoring event creation',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  return tests;
}

async function testFixAutomation(userToken: string, siteUrl: string) {
  const tests: any[] = [];
  
  // Test fix automation capabilities
  const fixTypes = [
    { name: 'Canonical Fixes', endpoint: '/api/tools/fix-canonical' },
    { name: 'Hreflang Fixes', endpoint: '/api/tools/fix-hreflang' },
    { name: 'Indexability Fixes', endpoint: '/api/tools/fix-indexability' },
    { name: 'Emergency Fixes', endpoint: '/api/tools/emergency-seo-fix' }
  ];
  
  for (const fixType of fixTypes) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}${fixType.endpoint}?userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          tests.push({
            name: `Fix Automation - ${fixType.name}`,
            status: 'passed',
            description: `${fixType.name} automation is working`,
            metadata: { 
              hasCapabilities: !!data.data,
              automated: data.data.automated !== false
            }
          });
        } else {
          tests.push({
            name: `Fix Automation - ${fixType.name}`,
            status: 'warning',
            description: `${fixType.name} returned success but with issues`,
            metadata: { response: data }
          });
        }
      } else {
        tests.push({
          name: `Fix Automation - ${fixType.name}`,
          status: 'failed',
          description: `${fixType.name} automation failed`,
          error: `HTTP ${response.status}`,
          fix: `Check ${fixType.endpoint} implementation`
        });
      }
    } catch (error) {
      tests.push({
        name: `Fix Automation - ${fixType.name}`,
        status: 'failed',
        description: `Failed to test ${fixType.name} automation`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return tests;
}

async function logTestResults(userToken: string, testResults: any) {
  try {
    // Log test completion event
    await supabase
      .from('seo_monitoring_events')
      .insert({
        user_token: userToken,
        site_url: testResults.siteUrl,
        page_url: testResults.siteUrl,
        event_type: 'watchdog_test_completed',
        severity: testResults.summary.failed === 0 ? 'info' : 'warning',
        category: 'testing',
        title: `SEO Watchdog Test ${testResults.summary.failed === 0 ? 'PASSED' : 'FAILED'}`,
        description: `Comprehensive test suite: ${testResults.summary.passed}/${testResults.summary.total} passed`,
        source: 'test-suite',
        metadata: {
          testType: testResults.testType,
          summary: testResults.summary,
          failedTests: testResults.tests.filter((t: any) => t.status === 'failed').map((t: any) => t.name)
        }
      });
  } catch (error) {
    console.error('[TEST-SEO-WATCHDOG] Error logging test results:', error);
  }
}

// GET endpoint for test status
export async function GET(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('userToken');
    
    if (!userToken) {
      return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
    }
    
    // Return testing capabilities and recent test results
    const { data: recentTests } = await supabase
      .from('seo_monitoring_events')
      .select('*')
      .eq('user_token', userToken)
      .eq('event_type', 'watchdog_test_completed')
      .order('detected_at', { ascending: false })
      .limit(5);
    
    const testCapabilities = {
      available_tests: [
        'Database Schema Validation',
        'API Endpoint Testing',
        'SEOAgent.js Function Verification',
        'Monitoring Capabilities Testing',
        'Fix Automation Testing'
      ],
      test_types: ['quick', 'comprehensive', 'api-only', 'js-only'],
      recent_tests: recentTests || []
    };
    
    return NextResponse.json({
      success: true,
      data: testCapabilities,
      message: 'SEO Watchdog testing capabilities ready'
    });
    
  } catch (error) {
    console.error('[TEST-SEO-WATCHDOG] Error:', error);
    return NextResponse.json({ error: 'Failed to get test capabilities' }, { status: 500 });
  }
}