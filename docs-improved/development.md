# Development Guide

## Getting Started with Local Development

This guide will help you set up SEOAgent.com for local development, understand the codebase structure, and contribute effectively to the project.

## 🚀 Quick Setup

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: Latest version
- **Code Editor**: VS Code recommended with extensions

### Clone and Install
```bash
git clone <repository-url>
cd seometrics-nextjs
npm install
```

### Environment Configuration
```bash
cp .env.example .env.local
# Edit .env.local with your configuration values
```

### Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## 🔧 Environment Variables

### Required Variables
Create `.env.local` with these essential variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Stripe Integration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Search Console
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

### Optional Variables
```bash
# Development Flags
NODE_ENV=development
DEBUG_MODE=true

# External APIs (for testing)
SERP_DEV_API_KEY=your_serp_dev_key
LIGHTHOUSE_API_KEY=your_lighthouse_api_key
```

---

## 🏗️ Project Structure

### Directory Overview
```
seometrics-nextjs/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Auth-related routes
│   │   ├── dashboard/      # Main app routes  
│   │   ├── api/           # API route handlers
│   │   └── globals.css    # Global styles
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   ├── forms/         # Form components
│   │   └── features/      # Feature-specific components
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── types/             # TypeScript definitions
│   └── utils/             # Helper functions
├── public/                # Static assets
├── docs-improved/         # Documentation
├── .env.example          # Environment template
└── package.json          # Dependencies and scripts
```

### Key Files & Their Purpose

#### `/src/app/layout.tsx`
Main application layout with providers and global configuration.

#### `/src/contexts/auth.tsx`
**CRITICAL**: Authentication context with stabilized session management.
- ✅ Static session handling (no reactive listeners)
- ✅ Single useEffect with empty dependency array
- ✅ 30-minute session timeout
- ❌ **DO NOT MODIFY** without explicit instruction

#### `/src/components/WebsiteManagement.tsx`
Website selection and management interface with plan-based limits.

#### `/src/app/api/`
All backend API routes organized by feature:
- `auth/` - Authentication endpoints
- `websites/` - Website management
- `articles/` - Content generation
- `cms/` - CMS integrations
- `gsc/` - Google Search Console
- `subscription/` - Stripe integration

---

## 🗄️ Database Setup

### Supabase Configuration
1. Create a new Supabase project
2. Copy the project URL and anon key to `.env.local`
3. Set up the database schema (see next section)

### Database Schema Setup
The database uses PostgreSQL with Row Level Security. Key tables:

```sql
-- Core user management
CREATE TABLE login_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id),
  token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Website management
CREATE TABLE websites (
  id SERIAL PRIMARY KEY,
  user_token UUID REFERENCES login_users(token),
  website_token UUID DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL,
  is_managed BOOLEAN DEFAULT false,
  is_excluded_from_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Subscription management
CREATE TABLE user_plans (
  id SERIAL PRIMARY KEY,
  user_token UUID REFERENCES login_users(token),
  tier VARCHAR(50) NOT NULL,
  sites_allowed INTEGER NOT NULL,
  posts_allowed INTEGER DEFAULT -1,
  status VARCHAR(50) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Row Level Security Policies
```sql
-- Example RLS policy for websites table
CREATE POLICY "Users can access own websites" ON websites
FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);
```

For complete schema details, see [Database Schema](database-schema.md).

---

## 🔗 API Development

### API Route Structure
```typescript
// /src/app/api/example/route.ts
import { NextRequest } from 'next/server';
import { getUserByToken } from '@/lib/supabase-utils';

export async function GET(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('userToken');
    if (!userToken) {
      return Response.json({error: 'User token required'}, {status: 400});
    }

    const user = await getUserByToken(userToken);
    if (!user) {
      return Response.json({error: 'Unauthorized'}, {status: 401});
    }

    // Your API logic here
    
    return Response.json({success: true, data: result});
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({error: 'Internal server error'}, {status: 500});
  }
}
```

### Authentication Pattern
All protected API routes should validate the user token:

```typescript
const userToken = request.nextUrl.searchParams.get('userToken');
const user = await getUserByToken(userToken);
if (!user) return Response.json({error: 'Unauthorized'}, {status: 401});
```

### Error Handling Standards
```typescript
// Consistent error response format
return Response.json({
  success: false,
  error: "Human-readable error message",
  code: "ERROR_CODE",
  details: {} // Optional additional context
}, {status: 400});
```

---

## 🎨 Frontend Development

### Component Architecture
```typescript
// Example component structure
interface ComponentProps {
  // Always include user context when needed
  user: User;
  // Specific props for the component
  websites: Website[];
  onWebsiteSelect: (websiteId: string) => void;
}

export function WebsiteSelector({ user, websites, onWebsiteSelect }: ComponentProps) {
  // Component implementation
}
```

### State Management Patterns
```typescript
// Use React hooks for local state
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Use context for shared state
const { user } = useAuth();

// Use server state for data fetching
const { data: websites, isLoading } = useWebsites(user?.token);
```

### Styling Guidelines
- **Tailwind CSS**: Use utility classes for styling
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Support both light and dark themes
- **Consistent Spacing**: Use Tailwind's spacing scale

```typescript
// Example component with Tailwind
<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
    Website Management
  </h2>
</div>
```

---

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Patterns
```typescript
// Example component test
import { render, screen } from '@testing-library/react';
import { WebsiteManagement } from '@/components/WebsiteManagement';

describe('WebsiteManagement', () => {
  it('displays websites correctly', () => {
    render(<WebsiteManagement user={mockUser} websites={mockWebsites} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });
});
```

### API Route Testing
```typescript
// Example API test
import { GET } from '@/app/api/websites/route';

describe('/api/websites', () => {
  it('returns user websites', async () => {
    const request = new Request('http://localhost/api/websites?userToken=test');
    const response = await GET(request);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.websites).toHaveLength(2);
  });
});
```

---

## 🚀 Build & Deployment

### Development Scripts
```bash
# Start development server
npm run dev

# Build production version
npm run build

# Start production server (after build)
npm start

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check
```

### Pre-deployment Checklist
1. ✅ All tests passing: `npm test`
2. ✅ No TypeScript errors: `npm run type-check`
3. ✅ No ESLint errors: `npm run lint`
4. ✅ Successful build: `npm run build`
5. ✅ Environment variables configured
6. ✅ Database migrations applied

### ESLint Rules (Critical for Deployment)
```javascript
// Key rules that cause deployment failures
{
  "react/no-unescaped-entities": "error", // Use &apos; instead of '
  "@next/next/no-img-element": "error",   // Use next/image instead of <img>
  "react/jsx-key": "error",               // Provide keys for list items
  "@typescript-eslint/no-unused-vars": "error"
}
```

### Common Deployment Issues
1. **Quote Escaping**: Use `&apos;` instead of `'` in JSX
2. **Image Tags**: Use `next/image` instead of `<img>`
3. **Unused Variables**: Remove or prefix with underscore
4. **Missing Keys**: Add unique keys to list items

---

## 🔧 Debugging

### Development Tools
```typescript
// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// Use React Developer Tools
// Install: https://react.dev/learn/react-developer-tools
```

### Common Issues & Solutions

#### Authentication Issues
```typescript
// Check user token in API routes
console.log('User token:', userToken);
console.log('User found:', user);

// Verify auth context
const { user, loading } = useAuth();
console.log('Auth state:', { user, loading });
```

#### Database Connection Issues
```typescript
// Test Supabase connection
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('login_users')
  .select('*')
  .limit(1);

console.log('Supabase test:', { data, error });
```

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

---

## 📚 Development Guidelines

### Code Style
- **TypeScript**: Use strict type checking
- **Formatting**: Prettier with 2-space indentation
- **Naming**: PascalCase for components, camelCase for functions
- **Comments**: JSDoc for public functions

```typescript
/**
 * Generates SEO-optimized article content
 * @param title - Article title
 * @param keywords - Target keywords
 * @returns Generated article with metadata
 */
export async function generateArticle(
  title: string, 
  keywords: string[]
): Promise<ArticleResult> {
  // Implementation
}
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make commits with descriptive messages
git commit -m "Add website management functionality"

# Push and create pull request
git push origin feature/new-feature
```

### Pull Request Guidelines
1. **Clear Description**: Explain what changes were made and why
2. **Test Coverage**: Include tests for new functionality
3. **Documentation**: Update docs for user-facing changes
4. **ESLint Clean**: No linting errors
5. **TypeScript Clean**: No type errors

---

## 🔌 External API Integration

### Adding New CMS Support
1. **Create Connector Interface**
```typescript
// /src/lib/cms/new-cms-connector.ts
export class NewCMSConnector implements CMSConnector {
  async authenticate(): Promise<void> {
    // Authentication logic
  }
  
  async publishArticle(article: Article): Promise<PublishResult> {
    // Publishing logic
  }
}
```

2. **Add API Routes**
```typescript
// /src/app/api/cms/new-cms/route.ts
export async function POST(request: NextRequest) {
  // Handle new CMS integration
}
```

3. **Update Frontend Components**
```typescript
// Add to CMS connection options
const cmsOptions = [
  // existing options...
  { value: 'new-cms', label: 'New CMS', icon: NewCMSIcon }
];
```

### Google API Integration
```typescript
// Example: Adding new Google API
import { google } from 'googleapis';

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/google/callback'
);
```

---

## 📊 Performance Optimization

### Frontend Performance
```typescript
// Lazy load components
const WebsiteManagement = lazy(() => import('@/components/WebsiteManagement'));

// Use React.memo for expensive components
export const ExpensiveComponent = memo(function ExpensiveComponent(props) {
  // Component logic
});

// Optimize re-renders with useCallback
const handleWebsiteSelect = useCallback((websiteId: string) => {
  // Handler logic
}, [dependencies]);
```

### Database Performance
```sql
-- Add indexes for common queries
CREATE INDEX idx_websites_user_token ON websites(user_token);
CREATE INDEX idx_articles_website_token ON articles(website_token);

-- Use materialized views for complex queries
CREATE MATERIALIZED VIEW user_website_stats AS
SELECT user_token, COUNT(*) as website_count
FROM websites 
WHERE is_managed = true
GROUP BY user_token;
```

---

## 🔒 Security Considerations

### API Security
```typescript
// Validate input parameters
const websiteId = z.string().uuid().parse(body.websiteId);

// Sanitize user input
const title = sanitizeHtml(body.title, {
  allowedTags: [],
  allowedAttributes: {}
});

// Check plan limits before operations
const canManageWebsite = await checkPlanLimits(user.token, 'website');
if (!canManageWebsite) {
  return Response.json({error: 'Plan limit exceeded'}, {status: 403});
}
```

### Data Protection
- All sensitive data encrypted at rest
- API keys stored in environment variables
- User data isolated with RLS policies
- OAuth tokens encrypted in database

---

## 🆘 Getting Help

### Development Resources
- **Next.js Documentation**: https://nextjs.org/docs
- **React Documentation**: https://react.dev
- **Supabase Documentation**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

### Internal Resources
- [API Reference](api-reference.md) - Complete API documentation
- [Database Schema](database-schema.md) - Database structure
- [User Guide](user-guide.md) - Feature documentation
- [Architecture](architecture.md) - System design

### Community & Support
- **GitHub Issues**: Report bugs and request features
- **Development Chat**: Internal team communication
- **Code Reviews**: Peer review process
- **Documentation**: Maintain and update docs

---

This development guide provides everything needed to contribute effectively to SEOAgent.com. Always refer to the existing codebase patterns and maintain consistency with the established architecture.