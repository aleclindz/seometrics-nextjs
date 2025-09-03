# SEOAgent Prompts Management System

## 📋 Overview

This directory contains the centralized prompt management system for SEOAgent.com. All AI system prompts are now organized, versioned, and easily editable without touching code.

## 📂 Directory Structure

```
src/prompts/
├── README.md                 # This file
├── index.ts                  # Main exports
├── PromptManager.ts          # Core prompt management class
├── types.ts                  # TypeScript interfaces
├── categories/              # Prompt categories
│   ├── agent.ts            # Chat agent prompts
│   ├── content.ts          # Content generation prompts
│   └── technical-seo.ts    # Technical SEO prompts
├── utils/                  # Utilities
│   ├── variables.ts        # Variable injection system
│   └── formatters.ts       # Text formatting helpers
├── config/                 # Product Manager Files 📝
│   ├── prompts.json        # ✏️ EDIT THIS - All prompts in readable format
│   ├── variables.json      # 📖 Reference - Available template variables
│   └── versions.json       # 📊 Track changes and history
├── supabase-prompts.ts     # Simplified prompts for Supabase functions
└── test-prompts.js         # Test script
```

## 🎯 For Product Managers

### Quick Start - Editing Prompts

**The main file you'll edit: `/src/prompts/config/prompts.json`**

1. **Find the prompt** you want to modify in the JSON structure
2. **Edit the template** text directly in the `"template"` field  
3. **Save the file** - changes take effect on next deployment
4. **Test locally** if needed with `npm run dev`

### Available Prompt Categories

#### 🤖 **Agent Prompts** (`categories.agent`)
- `MAIN_SEO_AGENT` - Primary chat assistant (full features)
- `SIMPLE_SEO_AGENT` - Simplified version for API routes
- `SECURE_SEO_AGENT` - Client-side safe version

#### ✍️ **Content Prompts** (`categories.content`)  
- `ENHANCED_SEO_CONTENT_WRITER` - Main article generation
- `META_TAGS_EXPERT` - Meta titles and descriptions
- `SVS_OPTIMIZED_CONTENT_WRITER` - AI search engine optimization

#### 🔧 **Technical SEO Prompts** (`categories["technical-seo"]`)
- `TECHNICAL_SEO_ANALYZER` - Comprehensive issue analysis  
- `TECHNICAL_SEO_FIX_EXPERT` - Specific fix recommendations
- `ACTIVITY_SUMMARIZER` - Daily/weekly summaries

### Using Variables in Prompts

Prompts can include dynamic variables using `{{variableName}}` syntax:

```json
{
  "template": "You are helping {{websiteDomain}} with {{articleType}} content in a {{tone}} tone."
}
```

**Common Variables:**
- `{{websiteDomain}}` - Website being worked on
- `{{articleType}}` - Type of content (blog, guide, etc.)
- `{{tone}}` - Writing tone (professional, casual, technical)
- `{{selectedSite}}` - Currently selected website
- `{{keywords}}` - Target keywords (automatically formatted)

See `variables.json` for the complete list.

### Making Changes

#### ✅ Safe Changes (No Code Required)
- Edit prompt text in `prompts.json`
- Add new variables to existing prompts
- Adjust tone and messaging
- Fix typos or improve clarity

#### ⚠️ Advanced Changes (May Need Developer)
- Adding entirely new prompt categories
- Changing variable names (breaks existing code)
- Adding new prompt templates (need to register in code)
- Modifying the TypeScript interfaces

### Testing Changes

1. **Local Testing**: Run `npm run dev` and test the affected features
2. **Build Test**: Run `npm run build` to check for errors
3. **Prompt Test**: Run `node src/prompts/test-prompts.js` to validate the system

### Version Control

Every change should be documented in `versions.json`:

```json
{
  "version": "1.0.1",
  "release_date": "2024-01-20T10:00:00Z", 
  "description": "Improved agent friendliness",
  "changes": [
    "Made agent responses more conversational",
    "Added encouragement to technical SEO prompts"
  ]
}
```

## 🛠️ For Developers

### Using the System

```typescript
import { getPromptManager } from '@/prompts';

// Get a prompt with variables
const prompt = getPromptManager().getPrompt('agent', 'SIMPLE_SEO_AGENT', {
  selectedSite: 'example.com'
});

// Use in OpenAI call
const response = await openai.chat.completions.create({
  messages: [
    { role: 'system', content: prompt },
    { role: 'user', content: userMessage }
  ]
});
```

### Adding New Prompts

1. Add to appropriate category file (`categories/agent.ts`, etc.)
2. Update `prompts.json` with the new prompt
3. Register in the category's register function
4. Update `variables.json` if new variables are needed

### Migration from Hardcoded Prompts

```typescript
// Before
const systemPrompt = "You are an expert SEO assistant...";

// After  
import { getPromptManager } from '@/prompts';
const systemPrompt = getPromptManager().getPrompt('agent', 'SIMPLE_SEO_AGENT');
```

## 🧪 Testing

Run the test suite:
```bash
node src/prompts/test-prompts.js
```

## 📊 Benefits

✅ **No Code Changes**: Product managers can edit prompts directly  
✅ **Version Control**: Track all changes with Git  
✅ **Consistency**: Centralized management prevents drift  
✅ **Testing**: Easy to A/B test different prompt versions  
✅ **Maintenance**: One place to update all AI behavior  
✅ **Environment Support**: Different prompts for dev/staging/production

## 🆘 Getting Help

- **Prompt not working?** Check `variables.json` for correct variable names
- **Build errors?** Ensure JSON syntax is valid in config files
- **Need new features?** Contact the development team
- **Emergency?** Revert changes in Git and redeploy

---

*Last updated: January 15, 2024*