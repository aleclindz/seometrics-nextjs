# Agent Abilities System

This directory contains the refactored agent system that breaks down agent capabilities into separate, focused abilities.

## Architecture

```
src/services/agent/abilities/
├── index.ts                    # Main registry and orchestrator
├── base-ability.ts            # Abstract base class for all abilities
├── gsc-ability.ts            # Google Search Console functions
├── content-ability.ts        # Article generation and content optimization
├── performance-ability.ts    # Site performance and analytics
├── technical-seo-ability.ts  # Technical SEO auditing and analysis
└── ideas-ability.ts          # Ideas and actions management
```

## Benefits

- **Separation of Concerns**: Each ability handles one specific domain
- **Independent Development**: Teams can work on different abilities without conflicts
- **Easy Testing**: Each ability can be tested in isolation
- **Maintainable**: Clear structure makes functionality easy to find and modify
- **Extensible**: New abilities can be added by extending `BaseAbility`

## Usage

```typescript
import { AbilityRegistry } from './abilities';

// Create registry with user token
const registry = new AbilityRegistry(userToken);

// Execute a function
const result = await registry.executeFunction('generate_article', {
  topic: 'SEO Best Practices',
  target_keywords: ['SEO', 'optimization']
});

// Check available functions
const availableFunctions = registry.getAllFunctionNames();

// Get debug info
const abilitiesInfo = registry.getAbilitiesInfo();
```

## Adding New Abilities

1. Create a new file extending `BaseAbility`
2. Implement `getFunctionNames()` and `executeFunction()`
3. Add to the `AbilityRegistry` constructor in `index.ts`
4. Export from `index.ts`

Example:

```typescript
import { BaseAbility, FunctionCallResult } from './base-ability';

export class NewAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return ['new_function_1', 'new_function_2'];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'new_function_1':
        return await this.doSomething(args);
      default:
        return this.error(`Unknown function: ${name}`);
    }
  }

  private async doSomething(args: any): Promise<FunctionCallResult> {
    // Implementation here
    return this.success(result);
  }
}
```

## Abilities Overview

### GSCAbility
- `connect_gsc`: Connect to Google Search Console
- `sync_gsc_data`: Sync data from GSC
- `get_gsc_properties`: Get GSC properties
- `disconnect_gsc`: Disconnect from GSC

### ContentAbility
- `generate_article`: Generate articles with AI
- `optimize_content`: Optimize existing content
- `publish_content`: Publish to connected CMS
- `analyze_content_performance`: Analyze content metrics

### PerformanceAbility
- `get_site_performance`: Get site performance data
- `get_site_status`: Get overall site status
- `analyze_metrics`: Analyze performance metrics
- `get_performance_trends`: Get trends over time
- `compare_performance`: Compare performance periods

### TechnicalSEOAbility
- `audit_site`: Comprehensive site audit
- `check_technical_seo`: Check technical SEO issues
- `plan_crawl`: Plan crawling strategy
- `analyze_crawl`: Analyze crawl results
- `check_indexing`: Check indexing status
- `analyze_site_structure`: Analyze site structure
- `check_page_speed`: Check page speed
- `validate_schema`: Validate structured data

### IdeasAbility
- `create_idea`: Create new ideas
- `adopt_idea`: Adopt ideas with action plans
- `run_action`: Execute actions
- `get_ideas`: Get ideas for a site
- `update_idea`: Update existing ideas
- `delete_idea`: Delete ideas
- `track_idea_progress`: Track implementation progress