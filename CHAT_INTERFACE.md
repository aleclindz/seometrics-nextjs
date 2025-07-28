# SEOMetrics Chat Interface

## Overview

The SEOMetrics chat interface is a modern, AI-powered conversational interface that allows users to interact with all SEO tools and features through natural language commands. Built with OpenAI's Function Calling API, it provides an intuitive alternative to the traditional dashboard interface.

## Features

### 🤖 AI-Powered Assistant
- **OpenAI Integration**: Powered by GPT-4 with function calling capabilities
- **Natural Language Processing**: Understand user intents and execute actions
- **Context Awareness**: Maintains conversation history and site context
- **Structured Responses**: Function calls provide reliable, validated actions

### 🏢 Multi-Site Management
- **Sidebar Navigation**: Collapsible sidebar showing all user websites
- **Real-Time Status**: Live status indicators for each site
- **Quick Site Switching**: Easy selection between different websites
- **Site Metrics**: At-a-glance performance data

### 📊 Status Indicators
- **Google Search Console**: Connection status and sync health
- **CMS Connections**: WordPress, Webflow, and other platform status
- **Smart.js Integration**: Auto meta/alt tag functionality status
- **Performance Metrics**: Clicks, impressions, and CTR data

### 🔧 Available Functions

#### Setup & Connection
- `connect_gsc(site_url)` - Connect Google Search Console
- `connect_cms(site_url, cms_type, credentials)` - Connect CMS platforms
- `add_site(site_url, site_name)` - Add new website
- `check_smartjs_status(site_url)` - Verify Smart.js installation

#### Analytics & Performance
- `get_site_performance(site_url, date_range)` - Get GSC performance data
- `sync_gsc_data(site_url)` - Manually sync GSC data
- `generate_seo_report(site_url, report_type)` - Create SEO reports
- `list_sites()` - Get all user websites

#### Content & Optimization
- `generate_article(topic, keywords, site_url)` - Create SEO content
- `analyze_content_gaps(site_url, competitors)` - Find content opportunities
- `optimize_page_content(page_url, keywords)` - Improve existing content

## Usage Examples

### Connect Google Search Console
```
User: "Connect my website example.com to Google Search Console"
Assistant: [Executes connect_gsc function and guides through OAuth flow]
```

### Generate Content
```
User: "Create an SEO article about 'sustainable gardening' for my site"
Assistant: [Executes generate_article function with optimization suggestions]
```

### Get Performance Data
```
User: "Show me how my website is performing this month"
Assistant: [Executes get_site_performance and displays metrics]
```

### Check Site Status
```
User: "What's the status of my Smart.js integration?"
Assistant: [Executes check_smartjs_status and reports on features]
```

## Interface Components

### ChatInterface
Main container component that orchestrates the entire chat experience:
- Manages OpenAI client initialization
- Handles message state and conversation flow
- Coordinates with sidebar for site context
- Provides responsive layout with collapsible sidebar

### ChatSidebar
Multi-site management panel featuring:
- Site list with search functionality
- Real-time status indicators
- Quick action buttons
- Site metrics display
- Collapsible design for space efficiency

### SiteCard
Individual site representation showing:
- Site name and URL
- Connection status for GSC, CMS, and Smart.js
- Performance metrics (clicks, impressions, CTR)
- Progress indicators for incomplete setups
- Visual health indicators

### StatusIndicator
Reusable status badge component:
- Visual status representation with colors
- Tooltips for detailed status information
- Support for different indicator types
- Hover interactions for additional context

### MessageList
Chat message display with support for:
- User and assistant messages
- Function call visualization
- Rich content formatting
- Timestamps and message typing
- Loading states and animations

### MessageInput
Advanced input component featuring:
- Auto-resizing textarea
- Command suggestions
- File upload capabilities
- Voice input preparation
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

## Technical Architecture

### OpenAI Function Calling
- **Structured Commands**: All user intents mapped to specific functions
- **Type Safety**: Function schemas ensure parameter validation
- **Error Handling**: Graceful fallbacks for failed function calls
- **Progress Tracking**: Real-time updates for long-running operations

### State Management
- **Local State**: React hooks for UI state management
- **Context Integration**: Leverages existing auth and site contexts
- **Message Persistence**: Chat history maintained in component state
- **Real-Time Updates**: WebSocket preparation for live status updates

### API Integration
- **Existing Endpoints**: All functions map to current API routes
- **No Backend Changes**: Chat interface works with existing infrastructure
- **Authentication**: Uses established auth token system
- **Error Boundaries**: Comprehensive error handling and user feedback

## Navigation

### Interface Toggle
Toggle between chat and dashboard interfaces:
- Fixed position toggle in top-right corner
- Preserves user authentication state
- Smooth transitions between interfaces
- New feature indicator on chat mode

### Accessibility
- Full keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Responsive design for all device sizes

## Development Notes

### Environment Setup
Requires `NEXT_PUBLIC_OPENAI_API_KEY` environment variable for full functionality.

### Mock Data
Currently uses simulated data for development. Function calls will integrate with actual APIs as backend services are connected.

### Future Enhancements
- WebSocket integration for real-time updates
- Voice input/output capabilities
- File upload and analysis
- Advanced chat commands and shortcuts
- Integration with existing backend API service

## Getting Started

1. **Access the Chat Interface**: Navigate to `/chat` or use the interface toggle
2. **Explore Commands**: Try natural language requests like "show my sites" or "connect GSC"
3. **Site Management**: Use the sidebar to view and manage multiple websites
4. **Get Help**: Ask the assistant "what can you help me with?" for available functions

The chat interface represents the future of SEO management - conversational, intuitive, and powerful.