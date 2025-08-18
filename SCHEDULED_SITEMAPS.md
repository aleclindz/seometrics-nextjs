# Scheduled Sitemap Regeneration System

## Overview
Automatic weekly sitemap regeneration for all managed websites to ensure Google has up-to-date sitemaps without manual intervention.

## Schedule
- **When**: Every Monday at 2:00 AM UTC
- **Frequency**: Weekly
- **Cron Expression**: `0 2 * * 1`

## How It Works

### 1. Trigger
Vercel cron job calls `/api/cron/regenerate-sitemaps` every Monday at 2:00 AM UTC.

### 2. Website Selection
- Selects all websites with `is_managed = true`
- Only processes websites belonging to active users (`is_active = true`)
- Skips websites that had sitemaps generated within the last 6 days

### 3. Sitemap Generation
For each eligible website:
- Calls `/api/technical-seo/generate-sitemap`
- Generates sitemap XML with current URLs
- Submits to Google Search Console automatically
- Makes sitemap available via SEOAgent.js at `/sitemap.xml`

### 4. Error Handling
- Continues processing other websites if one fails
- Logs all results to `system_logs` table
- Includes 2-second delay between websites to prevent overload

### 5. Logging & Monitoring
Results are logged with:
- Total processed websites
- Success/failure counts
- Individual website results
- Error details for troubleshooting

## Environment Variables Required

```bash
CRON_SECRET=your-secure-cron-secret
ADMIN_SECRET=your-admin-secret
```

## Manual Testing

Test the cron job manually:
```
GET /api/admin/test-sitemap-cron?adminToken=YOUR_ADMIN_SECRET
```

## Database Schema

### system_logs Table
```sql
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Benefits

1. **Zero Manual Intervention** - Sitemaps update automatically
2. **Fresh Content Discovery** - New pages get indexed faster
3. **GSC Compliance** - Always have valid sitemaps submitted
4. **Customer Value** - "Set it and forget it" SEO automation
5. **Scalable** - Works for unlimited managed websites

## Monitoring

Check cron job results:
```sql
SELECT * FROM system_logs 
WHERE log_type = 'cron_sitemap_regeneration' 
ORDER BY created_at DESC;
```

## Frequency Optimization

Current: Weekly (Monday 2 AM UTC)
- Good for most websites with regular content updates
- Avoids overwhelming Google with daily resubmissions
- Balances freshness vs. server resources

Could adjust to:
- **Daily**: High-traffic news/blog sites
- **Bi-weekly**: Static websites with rare updates
- **Monthly**: Landing pages or rarely updated sites