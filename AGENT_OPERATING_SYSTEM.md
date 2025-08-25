# SEOAgent Operating System

## Overview

The SEOAgent Operating System transforms your existing SEOAgent infrastructure into a robust, truthful agent system using the "ledger-based truth + state machines" approach. This system ensures all agent operations are bounded, verifiable, and fully auditable.

## Core Architecture

### State Machines

The agent system operates on 5 core state machines:

1. **Ideas** (`agent_ideas`) - Evidence → Actionable Plans
2. **Actions** (`agent_actions`) - Concrete executable units  
3. **Runs** (`agent_runs`) - Bounded execution envelopes
4. **Patches** (`agent_patches`) - Atomic page changes
5. **Events** (`agent_events`) - Immutable audit trail

### Key Principles

- **Everything is a fact in a ledger** - No agent hallucinations, only truth from database
- **Plan → Execute → Verify** - All actions must be verified before marked complete
- **Policy envelope wraps every run** - No execution outside safety constraints
- **Opaque IDs only** - LLM sees summaries, never raw data
- **Idempotency everywhere** - All operations safely retryable

## Quick Start

### 1. Database Migration

```bash
# Apply the agent operating system schema
npx supabase db push

# The migration creates 6 new tables and 10 default capabilities
```

### 2. Environment Setup

Add to your `.env.local`:

```bash
# Redis for queue management
REDIS_URL=redis://localhost:6379

# Optional: Configure queue concurrency
AGENT_QUEUE_CONCURRENCY=5
```

### 3. Start Redis (for queue management)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis
redis-server
```

### 4. Initialize Queue Workers

```bash
# The queue manager starts automatically with your Next.js app
# Workers are initialized for all queue types:
# - agent-actions
# - content-generation
# - technical-seo
# - cms-publishing
# - verification
```

## Agent Tools Reference

The system provides 8 core agent tools accessible via the LLM:

### Idea Management
- `create_idea(site_url, title, hypothesis, evidence, ice_score)` - Create backlog items
- `adopt_idea(idea_id, actions[])` - Convert ideas to actionable plans

### Action Management  
- `list_actions(site_url?, status?, limit?)` - View current actions
- `run_action(action_id, policy_overrides?)` - Execute actions safely
- `update_action_status(action_id, new_status, note?)` - Approve/decline actions

### Intelligence & Discovery
- `summarize_activity(site_url?, since?)` - "Since we last spoke" canonical summaries
- `plan_crawl(site_url, crawl_type, policy)` - Technical SEO agent integration
- `list_integrations(site_url?, category?)` - Capability discovery

## Usage Examples

### Creating and Executing Ideas

```javascript
// 1. Create an idea from evidence
const idea = await createIdea({
  site_url: 'example.com',
  title: 'Improve Core Web Vitals performance',
  hypothesis: 'Large images are slowing down page load times',
  evidence: { lighthouse_score: 65, lcp_time: 3.2 },
  ice_score: 85
});

// 2. Adopt idea with concrete actions
const adoption = await adoptIdea({
  idea_id: idea.id,
  strategy: 'Performance optimization workflow',
  actions: [
    {
      action_type: 'technical_seo_crawl',
      title: 'Crawl site for performance issues',
      priority_score: 80
    },
    {
      action_type: 'image_optimization',
      title: 'Optimize large images',
      priority_score: 75
    }
  ]
});

// 3. Execute actions with safety policies
await runAction({
  action_id: adoption.actions[0].id,
  policy_overrides: {
    environment: 'STAGING',
    max_pages: 20
  }
});
```

### Activity Monitoring

```javascript
// Get canonical activity summary
const summary = await summarizeActivity({
  site_url: 'example.com',
  since: '2024-01-01T00:00:00Z'
});

console.log(summary.narrative);
// "Completed: 3 technical SEO fixes, 1 content optimization. 
//  Currently active: 2 running actions. 
//  5 high-priority ideas ready for adoption."
```

### Workflow Automation

```javascript
// Use predefined workflows for common scenarios
const workflowPlan = await createWorkflowPlan({
  idea_id: idea.id,
  workflow_id: 'new_site_seo_setup', // Predefined template
  user_token: userToken
});

// Execute the entire workflow
await executeWorkflowPlan({
  plan: workflowPlan,
  confirm_execution: true
});
```

## Safety & Policy System

### Policy Engine

All actions are governed by the policy engine which enforces:

- **Blast Radius Limits** - Maximum pages/patches per run
- **Environment Controls** - DRY_RUN → STAGING → PRODUCTION progression
- **Approval Gates** - High-risk actions require human approval
- **User Permissions** - Website ownership and management verification

### Default Policies

```javascript
// New sites start with conservative policies
{
  environment: 'DRY_RUN',
  maxPages: 5,
  maxPatches: 10,
  requiresApproval: true,
  blastRadius: {
    scope: 'single_page',
    riskLevel: 'low',
    rollbackRequired: true
  }
}

// Managed sites with good history get relaxed policies
{
  environment: 'PRODUCTION',
  maxPages: 50,
  requiresApproval: false,
  // ... more aggressive settings
}
```

### Verification System

Every action must pass verification before being marked complete:

- **Technical SEO Fixes** - Verify DOM changes applied correctly
- **Content Generation** - Confirm content exists and is accessible  
- **CMS Publishing** - Check published content is live
- **Schema Injection** - Validate JSON-LD markup parses correctly

## Integration Points

### Existing Dashboard Integration

```tsx
import { AgentDashboard, AgentChat } from '@/components/agent';

function Dashboard({ userToken, selectedSite, userSites }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AgentDashboard 
        userToken={userToken} 
        selectedSite={selectedSite} 
      />
      <AgentChat 
        userToken={userToken}
        selectedSite={selectedSite}
        userSites={userSites}
      />
    </div>
  );
}
```

### Memory System Enhancement

The agent learns from every interaction:

```javascript
import { EnhancedAgentMemory } from '@/services/agent/enhanced-memory';

// Record learning from action outcomes
await memory.recordAgentLearning(
  websiteToken,
  userToken, 
  'technical_seo_fix',
  'success',
  {
    workflow_id: 'new_site_seo_setup',
    execution_time_minutes: 15,
    user_feedback: 'positive',
    effectiveness_score: 9
  }
);

// Get personalized recommendations
const recommendations = await memory.getPersonalizedRecommendations(
  websiteToken,
  userToken,
  {
    site_health: 'fair',
    user_experience_level: 'intermediate',
    time_available: 'medium'
  }
);
```

## API Endpoints

### Core Agent APIs

- `GET/POST /api/agent/ideas` - Idea management
- `GET/POST/PUT /api/agent/actions` - Action management  
- `GET/POST /api/agent/summary` - Activity summaries
- `GET/POST /api/agent/capabilities` - Capability discovery
- `GET/POST /api/agent/policies/validate` - Policy validation
- `POST/GET /api/agent/verify` - Verification triggers

### Workflow APIs

- `GET/POST /api/agent/workflows` - Workflow templates
- `POST /api/agent/workflows/plan` - Create execution plans
- `PUT /api/agent/workflows/execute` - Execute workflows

## Queue Management

The system uses BullMQ for robust job processing:

### Queue Types

- **agent-actions** - General agent operations
- **content-generation** - Article and content creation
- **technical-seo** - Crawling and technical fixes  
- **cms-publishing** - Content publishing operations
- **verification** - Post-execution verification

### Monitoring

```bash
# Queue stats endpoint
curl /api/agent/queues/stats

# Response:
{
  "queues": {
    "agent-actions": { "waiting": 2, "active": 1, "completed": 45 },
    "technical-seo": { "waiting": 0, "active": 3, "completed": 23 }
  }
}
```

## Database Schema

### Key Tables Added

```sql
agent_ideas          -- Evidence-based backlog items
agent_actions        -- Executable units of work  
agent_runs           -- Bounded execution contexts
agent_patches        -- Atomic page changes
agent_events         -- Complete audit trail
agent_capabilities   -- Dynamic capability registry
```

### Relationships

```
agent_ideas (1) → (many) agent_actions
agent_actions (1) → (many) agent_runs  
agent_runs (1) → (many) agent_patches
All entities → agent_events (audit trail)
```

## Monitoring & Observability

### Built-in Metrics

- Action completion rates by type
- Average execution times
- Verification success rates  
- Policy violation counts
- User satisfaction scores

### Event Tracking

All state changes are logged to `agent_events`:

```sql
-- Example: Action status change
{
  "event_type": "action_status_changed",
  "entity_type": "action", 
  "entity_id": "uuid",
  "previous_state": "running",
  "new_state": "completed",
  "event_data": { "execution_time_ms": 45000 }
}
```

## Development Workflow

### Testing Agent Functions

```bash
# Test individual agent tools
curl -X POST /api/agent/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "userToken": "user123",
    "siteUrl": "example.com", 
    "title": "Test idea",
    "ice_score": 75
  }'
```

### Local Development

```bash
# Start Redis
redis-server

# Run development server
npm run dev

# Monitor queue processing
# Queue stats available at /api/agent/queues/stats
```

## Deployment

### Production Checklist

- [ ] Redis instance configured and accessible
- [ ] Database migration applied (`039_agent_operating_system.sql`)
- [ ] Environment variables set (REDIS_URL)
- [ ] Queue worker health monitoring set up
- [ ] Policy configurations reviewed for production use

### Scaling Considerations

- **Queue Workers** - Scale horizontally by adding more worker instances
- **Redis** - Use Redis Cluster for high availability
- **Database** - Monitor agent table sizes and add indexes as needed
- **Verification** - Consider external verification services for large volumes

## Troubleshooting

### Common Issues

**Actions stuck in "running" status**
- Check queue worker health
- Verify Redis connectivity
- Review action timeout policies

**Verification failures**
- Ensure target URLs are accessible
- Check DOM selectors in patches
- Validate expected vs actual results

**Policy violations**
- Review blast radius settings
- Check user permissions and website management status
- Verify subscription limits

### Debug Commands

```bash
# Check queue health
curl /api/agent/queues/stats

# Get recent events for debugging
curl "/api/agent/summary?userToken=USER&since=2024-01-01"

# Verify specific action
curl -X POST /api/agent/verify \
  -d '{"actionId": "ACTION_ID", "runId": "RUN_ID", "userToken": "USER"}'
```

## Roadmap

### Phase 1 Complete ✅
- Core state machines and safety systems
- Queue management and verification
- Basic workflow templates
- Dashboard integration

### Phase 2 (Next 30 days)
- Advanced workflow templates  
- Machine learning improvements
- Performance optimization
- Enhanced monitoring

### Phase 3 (60 days)
- Multi-tenant improvements
- Advanced policy templates
- Integration marketplace
- Mobile app support

---

**Built with the "ledger-based truth" philosophy - Every fact is verifiable, every action is auditable, every decision is explainable.**