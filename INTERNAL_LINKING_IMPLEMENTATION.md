# Internal Linking System Implementation

## Overview

This document describes the automatic internal linking system that generates strategic SEO-optimized links between articles in the same topic cluster.

## Architecture

### Two-Phase Approach

1. **Link Planning** (During Brief Generation)
   - Determines which articles should link to which
   - Generates anchor text hints
   - Stored in `article_briefs.internal_link_plan`
   - No URLs yet (articles may not be published)

2. **Link Injection** (During Publishing)
   - Resolves target article URLs
   - Injects actual `<a>` tags into HTML
   - Tracks inserted links
   - Stored in `article_queue.injected_internal_links`

## Database Schema

### New Columns

**article_briefs.internal_link_plan** (JSONB)
```json
{
  "recommended_links": [
    {
      "target_discovery_article_id": "pill_imports_fl",
      "target_brief_id": 123,
      "anchor_hint": "comprehensive import guide",
      "link_type": "pillar|sibling|supporting_to_pillar",
      "reason": "Links supporting article to pillar"
    }
  ],
  "max_links": 5,
  "priority_order": ["pillar", "sibling", "supporting_to_pillar"]
}
```

**article_queue.injected_internal_links** (JSONB)
```json
[
  {
    "target_url": "/import-guides/comprehensive-florida-import-guide",
    "anchor_text": "comprehensive import guide",
    "link_type": "pillar",
    "inserted_at": "2025-10-18T12:00:00Z",
    "position_index": 0
  }
]
```

**articles.injected_internal_links** (JSONB)
- Same structure as article_queue (for legacy articles table)

## SEO Strategy

### Link Types

1. **PILLAR → SUPPORTING**
   - Pillar articles link to 3-5 supporting articles in same cluster
   - Uses varied anchor text
   - Distributes link equity to detailed content

2. **SUPPORTING → PILLAR**
   - Each supporting article links back to 1 pillar
   - Reinforces topical authority
   - Creates hub-and-spoke structure

3. **SUPPORTING → SUPPORTING (Siblings)**
   - Supporting articles link to 2-3 related siblings
   - Only within same cluster
   - Creates semantic web of related content

### Anchor Text Strategy

For each target article, we generate 3 anchor text variants:

1. **Exact** (max 1 per article): Primary keyword verbatim
   - Example: "florida import regulations"

2. **Partial** (2-3 per article): Primary keyword + qualifier
   - Example: "florida import regulations guide"
   - Example: "florida import regulations checklist"

3. **Descriptive** (remainder): Natural language from title
   - Example: "learn about import regulations"
   - Example: "comprehensive guide to Florida imports"

### SEO Safety Rules

- **Max 5-8 links per article** (based on word count: ~1 per 150 words)
- **Avoid first paragraph** (introduction should be link-free)
- **Avoid headers** (H1-H6 tags)
- **No link clustering** (skip paragraphs that already have links)
- **Graceful degradation** (skip links if target isn't published yet)

## Code Structure

### Services

**src/services/strategy/internal-link-planner.ts**
- `generateInternalLinkPlan()` - Main function called during brief creation
- `findLinkableArticles()` - Queries other briefs in same cluster
- `generatePillarLinks()` - Creates links for PILLAR articles
- `generateSupportingLinks()` - Creates links for SUPPORTING articles
- `generateAnchorHints()` - Creates exact/partial/descriptive anchors

**src/services/content/link-injector.ts**
- `injectInternalLinks()` - Main function called during publishing
- `resolveLinkUrls()` - Converts brief IDs to actual URLs
- `findPublishedArticleUrl()` - Looks up URL from article_queue/articles
- `findAndInsertLink()` - Injects `<a>` tag into HTML content

### Integration Points

**src/services/strategy/brief-generator.ts**
- Modified `generateBriefsFromArticleRoles()`
- After creating each brief, calls `generateInternalLinkPlan()`
- Updates brief with generated plan

**src/app/api/content/publish-article/route.ts**
- Before publishing to CMS
- Loads brief's `internal_link_plan`
- Calls `LinkInjector.injectInternalLinks()`
- Saves `injected_internal_links` metadata
- Publishes updated content with links

## Data Flow

```
Master Discovery
    ↓
Topic Clusters & Article Roles created
    ↓
Brief Generator runs
    ↓
For each brief created:
    ├─ Save brief to database
    ├─ Call generateInternalLinkPlan()
    │   ├─ Find other briefs in same cluster
    │   ├─ Determine link relationships (pillar/sibling/supporting)
    │   ├─ Generate anchor text hints
    │   └─ Return link plan object
    └─ Update brief.internal_link_plan
    
... (user schedules brief for generation) ...

Article Generation
    ↓
Article created in article_queue (status: generated)
    
... (user publishes article) ...

Publishing Flow
    ↓
Load brief.internal_link_plan
    ↓
Link Injector resolves URLs:
    ├─ Query article_queue for published targets
    ├─ Match by generated_from_brief_id or discovery_article_id
    ├─ Get public_url or slug
    └─ Build ResolvedLink[] array
    ↓
Inject links into HTML:
    ├─ Find suitable paragraphs (skip first, skip headers, skip paragraphs with links)
    ├─ Replace anchor text with <a href="...">text</a>
    └─ Track inserted links
    ↓
Publish updated content to CMS
    ↓
Save injected_internal_links metadata
```

## Example Flow

### 1. Master Discovery Creates Structure

```javascript
{
  clusters: [
    {
      pillar_title: "Florida Import Regulations",
      primary_keyword: "florida import laws",
      secondary_keywords: ["customs clearance", "import permits", ...]
    }
  ],
  articles: [
    {
      id: "pill_imports_fl",
      role: "PILLAR",
      title: "Complete Guide to Florida Import Regulations",
      primary_keyword: "florida import laws",
      cluster: "Florida Import Regulations"
    },
    {
      id: "supp_customs",
      role: "SUPPORTING", 
      title: "Florida Customs Clearance Process",
      primary_keyword: "florida customs clearance",
      cluster: "Florida Import Regulations",
      links_to: ["pill_imports_fl"]
    },
    {
      id: "supp_permits",
      role: "SUPPORTING",
      title: "Import Permits Required in Florida",
      primary_keyword: "florida import permits",
      cluster: "Florida Import Regulations",
      links_to: ["pill_imports_fl"]
    }
  ]
}
```

### 2. Brief Generator Creates Briefs

Pillar brief (id: 100) created:
```json
{
  "title": "Complete Guide to Florida Import Regulations",
  "article_role": "PILLAR",
  "topic_cluster_id": 5,
  "internal_link_plan": {
    "recommended_links": [
      {
        "target_brief_id": 101,
        "anchor_hint": "florida customs clearance process",
        "link_type": "supporting_to_pillar",
        "reason": "Pillar links to supporting article about florida customs clearance"
      },
      {
        "target_brief_id": 102,
        "anchor_hint": "import permits required in Florida",
        "link_type": "supporting_to_pillar",
        "reason": "Pillar links to supporting article about florida import permits"
      }
    ],
    "max_links": 5
  }
}
```

Supporting brief (id: 101) created:
```json
{
  "title": "Florida Customs Clearance Process",
  "article_role": "SUPPORTING",
  "topic_cluster_id": 5,
  "internal_link_plan": {
    "recommended_links": [
      {
        "target_brief_id": 100,
        "anchor_hint": "complete guide to Florida import regulations",
        "link_type": "pillar",
        "reason": "Supporting article links to pillar about florida import laws"
      },
      {
        "target_brief_id": 102,
        "anchor_hint": "import permits",
        "link_type": "sibling",
        "reason": "Related sibling article about florida import permits"
      }
    ],
    "max_links": 5
  }
}
```

### 3. Article Generated

Article created in `article_queue`:
```json
{
  "id": 500,
  "generated_from_brief_id": 101,
  "title": "Florida Customs Clearance Process",
  "slug": "florida-customs-clearance-process",
  "article_content": "<p>When importing goods into Florida...</p>",
  "status": "generated"
}
```

### 4. Publishing Injects Links

Link Injector resolves URLs:
- Brief 100 → `/complete-guide-to-florida-import-regulations` (pillar)
- Brief 102 → `/import-permits-required-in-florida` (sibling)

Injects into HTML:
```html
<p>When importing goods into Florida, understanding the customs clearance process is 
essential. For comprehensive information, see our 
<a href="/complete-guide-to-florida-import-regulations">complete guide to Florida import regulations</a>.</p>

<p>You'll also need to secure the proper 
<a href="/import-permits-required-in-florida">import permits</a> before your shipment arrives.</p>
```

Saves metadata:
```json
{
  "injected_internal_links": [
    {
      "target_url": "/complete-guide-to-florida-import-regulations",
      "anchor_text": "complete guide to Florida import regulations",
      "link_type": "pillar",
      "inserted_at": "2025-10-19T14:30:00Z",
      "position_index": 0
    },
    {
      "target_url": "/import-permits-required-in-florida",
      "anchor_text": "import permits",
      "link_type": "sibling",
      "inserted_at": "2025-10-19T14:30:00Z",
      "position_index": 1
    }
  ]
}
```

## Graceful Degradation

The system handles edge cases gracefully:

1. **Target article not published yet**
   - Link is skipped during injection
   - Publishing continues normally
   - Can be added later via retroactive linking

2. **No link plan exists**
   - Publishing works normally without links
   - Backwards compatible with old briefs

3. **Link injection fails**
   - Error is logged but publishing continues
   - Article is published without internal links

4. **Anchor text not found in content**
   - Link is skipped for that specific anchor
   - Other links are still injected

## Future Enhancements

Potential improvements for v2:

1. **Retroactive linking**: Update already-published articles when new related content is published
2. **Similarity scoring**: Use embeddings to rank sibling articles by semantic similarity
3. **Journey links**: Add conversion-focused links (pricing, demo) for bottom-funnel content
4. **Link density monitoring**: Track and optimize link distribution across content
5. **Broken link detection**: Monitor if target articles are unpublished/deleted

## Testing

To test the system:

1. **Run migration**: Apply `062_internal_linking_system.sql`
2. **Run Master Discovery** for a website
3. **Check briefs**: Verify `internal_link_plan` is populated
4. **Generate article** from a supporting brief
5. **Publish article**: Check that links are injected
6. **Verify metadata**: Check `injected_internal_links` in database
7. **View published article**: Confirm links appear in CMS

## Monitoring

Key metrics to track:

- Briefs with link plans: `SELECT COUNT(*) FROM article_briefs WHERE internal_link_plan IS NOT NULL`
- Articles with injected links: `SELECT COUNT(*) FROM article_queue WHERE injected_internal_links IS NOT NULL`
- Average links per article: `SELECT AVG(jsonb_array_length(injected_internal_links)) FROM article_queue WHERE injected_internal_links IS NOT NULL`
- Links by type: Analyze `link_type` distribution in `injected_internal_links`

## Migration File

Location: `supabase/migrations/062_internal_linking_system.sql`

Adds:
- `article_briefs.internal_link_plan` (JSONB)
- `article_queue.injected_internal_links` (JSONB)
- `articles.injected_internal_links` (JSONB)
- Performance indexes

Safe to run multiple times (uses `IF NOT EXISTS`).

