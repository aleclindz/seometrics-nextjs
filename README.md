# SEO Metrics Tool - Next.js Migration

A modern SEO content generation and optimization platform built with Next.js, Supabase, and AI-powered tools.

## 🚀 Migration from PHP

This project migrates the existing PHP/MySQL SEO metrics tool to a modern stack:

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Hosting**: Vercel (or Netlify)
- **AI Integrations**: OpenAI, Anthropic Claude, Groq

## 📦 Features

### Content Generation
- ✅ AI-powered article generation with multiple models (GPT-4, Claude, Llama)
- ✅ Multi-language support (20+ languages)
- ✅ Custom writing tones and styles
- ✅ Content enhancement features:
  - YouTube video integration
  - Unsplash image embedding
  - Dynamic table generation
  - FAQ sections
  - Key takeaways
  - Text highlighting and blockquotes

### SEO Optimization
- ✅ Meta title and description generation
- ✅ Image alt-text generation
- ✅ Authority link integration
- ✅ Content formatting for SEO

### User Management
- 🔄 User authentication and authorization
- 🔄 Website management and tracking
- 🔄 API usage monitoring and limits
- 🔄 Multi-tier subscription plans

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd seometrics-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your API keys and Supabase configuration.

4. **Setup Supabase**
   - Create a new Supabase project
   - Run the database migrations (see `/supabase/migrations/`)
   - Deploy edge functions (see `/supabase/functions/`)

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

The Supabase database mirrors the original MySQL structure:

- `login_users` - User accounts and subscription plans
- `websites` - User websites and settings
- `pages` - Website pages for meta tag processing
- `images` - Images for alt-text generation
- `articles` - Generated articles and content
- `api_usage` - API usage tracking

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Netlify Alternative
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`

## 🔧 API Endpoints

### Content Generation
- `POST /api/articles/generate` - Generate articles
- `POST /api/meta-tags/generate` - Generate meta tags
- `POST /api/images/alt-text` - Generate image alt-text

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/websites` - List user websites
- `POST /api/websites` - Add new website

## 🔑 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# External Services
UNSPLASH_ACCESS_KEY=
YOUTUBE_API_KEY=
SCRAPINGBEE_API_KEY=
VALUESERP_API_KEY=
```

## 📋 Migration Status

- ✅ Project setup and configuration
- ✅ Database schema design
- ✅ Basic UI components
- 🔄 Supabase edge functions
- 🔄 API endpoint implementation
- 🔄 Frontend components and pages
- 🔄 User authentication
- 🔄 Data migration from PHP/MySQL
- ⏳ Testing and optimization
- ⏳ Production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details