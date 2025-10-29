# SEOAgent Admin Dashboard

A comprehensive local admin tool for monitoring and managing SEOAgent users, conversations, connections, and publishing activities.

## 🚀 Quick Start

### Local Development

1. Start the development server:
```bash
npm run dev
```

2. Access the admin dashboard:
```
http://localhost:3000/admin
```

## 📊 Features

### 1. Users View
Monitor all registered users with detailed statistics:
- **User Information**: Email, plan tier, subscription status
- **Website Stats**: Total websites, managed websites count
- **Content Stats**: Articles generated and published
- **Connections**: GSC and CMS connection counts
- **Activity**: Conversation count and user engagement
- **Search**: Filter users by email
- **Pagination**: Browse through all users

**API Endpoint**: `/api/admin/users`

**Query Parameters**:
- `limit` (default: 100) - Number of users per page
- `offset` (default: 0) - Pagination offset
- `search` - Filter by email (case-insensitive)

### 2. Connections View
View website connection statuses across all users:
- **Connection Dashboard**: Real-time stats for all connection types
  - Total websites
  - GSC connected
  - SEOAgent.js active
  - CMS connected
  - Hosting connected
  - Fully connected websites
- **Website Table**: Detailed connection status per website
  - Domain and user information
  - Connection icons for each integration type
  - CMS type badges (Strapi, WordPress, Ghost, etc.)
  - Management status
- **Connection Health**: Visual indicators (checkmarks, alerts, errors)

**API Endpoint**: `/api/admin/connections`

**Query Parameters**:
- `userToken` - Filter by specific user
- `limit` (default: 100) - Number of websites per page
- `offset` (default: 0) - Pagination offset

**Connection Statuses**:
- ✅ `connected` / `active` - Working properly
- ⚠️ `none` / `inactive` - Not yet configured
- ❌ `error` - Connection failed

### 3. Conversations View
Monitor agent conversations and chat activity:
- **Conversation Threads**: All chat sessions with users
- **User Context**: Email and website information
- **Message Count**: Total messages per conversation
- **Recent Messages**: Preview of last 3 messages with timestamps
- **Message Types**: User vs Assistant message indicators
- **Timeline**: Conversation creation and last update times
- **Pagination**: Load more conversations as needed

**API Endpoint**: `/api/admin/chat/conversations`

**Query Parameters**:
- `userToken` - Filter by specific user
- `siteId` - Filter by website
- `dateFrom` - Filter conversations after date
- `dateTo` - Filter conversations before date
- `limit` (default: 50) - Number of conversations per page
- `offset` (default: 0) - Pagination offset

**Data Tables Used**:
- `chat_threads` - Conversation metadata
- `chat_messages` - Individual messages
- `login_users` - User email lookup

### 4. Publishing Activities View
Track article generation and publishing pipeline:
- **Publishing Stats Dashboard**:
  - Briefs created
  - Articles published
  - Articles in progress (generating + publishing)
  - Failed articles count
- **Article Table**: Detailed article information
  - Title with truncation for long titles
  - User email and website domain
  - Status badges with color coding
  - Quality and SEO scores
  - Live article links (when published)
  - Creation timestamps
- **Status Filters**: Quick filter by All, Published, or Errors
- **Error Tracking**: View generation and publishing errors
- **Performance Metrics**:
  - Average generation time
  - Average quality score
  - Average SEO score

**API Endpoint**: `/api/admin/publishing`

**Query Parameters**:
- `userToken` - Filter by specific user
- `status` - Filter by article status (pending, generating, published, etc.)
- `days` (default: 30) - Time range for data
- `limit` (default: 50) - Number of articles per page
- `offset` (default: 0) - Pagination offset

**Article Statuses**:
- `pending` - Queued for generation
- `generating` - Currently being generated
- `generated` - Generation complete, awaiting publish
- `publishing` - Currently publishing to CMS
- `published` - Successfully published
- `generation_failed` - Generation error
- `publishing_failed` - Publishing error

## 🔒 Security

**IMPORTANT**: This admin dashboard has NO authentication by default. It uses service role keys to bypass Row Level Security (RLS) for full database access.

### Production Deployment Recommendations:

1. **DO NOT deploy to production** without adding authentication
2. **Add authentication layer**:
   ```typescript
   // Example middleware for /admin routes
   import { getServerSession } from 'next-auth';

   export async function middleware(request: NextRequest) {
     const session = await getServerSession();
     if (!session || session.user.role !== 'admin') {
       return NextResponse.redirect('/login');
     }
   }
   ```

3. **IP Whitelist**: Restrict access to specific IP addresses
4. **Environment-based**: Only enable in development:
   ```typescript
   if (process.env.NODE_ENV !== 'development') {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

## 📡 API Endpoints

### Users API
**GET** `/api/admin/users`

Response:
```json
{
  "success": true,
  "users": [{
    "id": 1,
    "email": "user@example.com",
    "token": "user-token-uuid",
    "plan": 1,
    "created_at": "2025-10-01T00:00:00Z",
    "stats": {
      "websites_total": 5,
      "websites_managed": 3,
      "articles_generated": 20,
      "articles_published": 15,
      "gsc_connections": 1,
      "cms_connections": 2,
      "conversations": 10
    },
    "subscription": {
      "tier": "pro",
      "status": "active",
      "sites_allowed": 10,
      "posts_allowed": 100
    }
  }],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "has_more": true
  }
}
```

### Connections API
**GET** `/api/admin/connections`

Response:
```json
{
  "success": true,
  "connections": [{
    "id": 1,
    "domain": "example.com",
    "cleaned_domain": "example.com",
    "user_email": "user@example.com",
    "gsc_status": "connected",
    "seoagentjs_status": "active",
    "cms_status": "connected",
    "hosting_status": "none",
    "is_managed": true,
    "gsc_connection": {
      "email": "gsc@example.com",
      "last_sync": "2025-10-29T12:00:00Z",
      "is_active": true
    },
    "cms_connection": {
      "type": "strapi",
      "name": "Main Strapi",
      "status": "active",
      "last_sync": "2025-10-29T11:00:00Z"
    }
  }],
  "stats": {
    "total_websites": 45,
    "gsc_connected": 30,
    "seoagentjs_active": 40,
    "cms_connected": 25,
    "hosting_connected": 10,
    "fully_connected": 20
  }
}
```

### Conversations API
**GET** `/api/admin/chat/conversations`

Response:
```json
{
  "success": true,
  "conversations": [{
    "id": "thread-uuid",
    "user_token": "user-token-uuid",
    "user_email": "user@example.com",
    "site_id": 1,
    "title": "SEO Strategy Discussion",
    "message_count": 15,
    "last_message": "Let me analyze your site...",
    "created_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-29T14:30:00Z",
    "recent_messages": [{
      "message_type": "user",
      "content": "How can I improve my rankings?",
      "created_at": "2025-10-29T14:25:00Z"
    }]
  }]
}
```

### Publishing API
**GET** `/api/admin/publishing`

Response:
```json
{
  "success": true,
  "articles": [{
    "id": 123,
    "title": "Complete SEO Guide",
    "user_email": "user@example.com",
    "website_domain": "example.com",
    "status": "published",
    "word_count": 2500,
    "quality_score": 8.5,
    "seo_score": 9.2,
    "public_url": "https://example.com/seo-guide",
    "cms_admin_url": "https://cms.example.com/admin/articles/123",
    "generation_time_seconds": 45,
    "created_at": "2025-10-29T10:00:00Z",
    "published_at": "2025-10-29T10:02:00Z",
    "generation_logs": [{
      "step": "outline_generation",
      "status": "completed",
      "duration_seconds": 5
    }]
  }],
  "stats": {
    "briefs_created": 50,
    "articles_pending": 5,
    "articles_generating": 2,
    "articles_published": 40,
    "articles_failed": 3,
    "avg_generation_time": 42.5,
    "avg_quality_score": 8.3,
    "avg_seo_score": 8.9
  }
}
```

## 🔧 Database Tables Used

### Core Tables:
- `login_users` - User authentication and profiles
- `websites` - Website domains and settings
- `user_plans` - Subscription tiers and limits
- `usage_tracking` - Quota consumption

### Connection Tables:
- `gsc_connections` - Google Search Console OAuth
- `gsc_properties` - GSC verified properties
- `cms_connections` - CMS integration credentials

### Conversation Tables:
- `chat_threads` - Conversation metadata
- `chat_messages` - Individual chat messages
- `agent_memory` - Persistent agent context
- `agent_learning` - Action execution tracking

### Publishing Tables:
- `article_briefs` - Article planning and briefs
- `article_queue` - Article generation pipeline
- `article_generation_logs` - Step-by-step generation logs
- `article_images` - Generated article images

## 🎨 UI Components

The admin dashboard uses shadcn/ui components:
- `Tabs` - Tab navigation between views
- `Card` - Content containers
- `Table` - Data tables
- `Badge` - Status indicators
- `Button` - Action buttons
- `Input` - Search and filter inputs

## 🛠️ Customization

### Add New Filters
```typescript
// Add date range filter to Users view
const [dateRange, setDateRange] = useState({ from: '', to: '' });

const fetchUsers = async () => {
  const params = new URLSearchParams({
    ...dateRange.from && { dateFrom: dateRange.from },
    ...dateRange.to && { dateTo: dateRange.to }
  });
  // ... fetch logic
};
```

### Add New Stats
```typescript
// Add custom stat to Connections view
const { count: hostingConnectedCount } = await supabase
  .from('websites')
  .select('*', { count: 'exact', head: true })
  .eq('hosting_status', 'connected');
```

### Export Data
```typescript
// Add CSV export functionality
const exportToCSV = (data: any[], filename: string) => {
  const csv = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};
```

## 🐛 Troubleshooting

### Error: "Failed to fetch users"
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify Supabase connection is working
- Check browser console for detailed error messages

### No data showing
- Ensure tables have data (run migrations if needed)
- Check RLS policies are properly set up
- Verify API endpoints are returning data

### Slow loading
- Add indexes to frequently queried columns
- Implement caching for stats calculations
- Add loading states and pagination

## 📝 Future Enhancements

- [ ] Add authentication/authorization
- [ ] Real-time updates using Supabase realtime
- [ ] Export data to CSV/Excel
- [ ] Advanced filtering and search
- [ ] Charts and graphs for trend analysis
- [ ] User action logs (impersonation, changes)
- [ ] Email notifications for critical events
- [ ] Webhook management interface
- [ ] System health monitoring
- [ ] Performance metrics dashboard

## 🤝 Contributing

When adding new admin features:
1. Create API endpoint in `/src/app/api/admin/[feature]/route.ts`
2. Add view component in admin page
3. Update this documentation
4. Test with real data
5. Consider security implications

---

**Last Updated**: October 29, 2025
**Version**: 1.0.0
