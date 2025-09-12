# Vercel Integration Setup Guide

## Step 1: Create a Vercel Integration

1. Go to [vercel.com/integrations/console](https://vercel.com/integrations/console)
2. Click **"Create Integration"**
3. Fill out the form:

### Basic Information
- **Name**: SEOAgent
- **Description**: Automated SEO agent for technical SEO and content optimization
- **Homepage URL**: https://seoagent.com
- **Logo**: Upload a square logo (recommended 256x256px)

### OAuth Configuration
- **Redirect URL**: `https://www.seoagent.com/api/hosting/vercel/oauth`
- **Scopes**: Select the following permissions:
  - `read:project` - Read project information
  - `write:project` - Write/deploy to projects

### Additional Settings
- **Category**: Developer Tools
- **Tags**: SEO, automation, optimization

## Step 2: Get Your Credentials

After creating the integration, you'll see:
- **Client ID**: Copy this value
- **Client Secret**: Copy this value (only shown once!)

## Step 3: Update Environment Variables

Replace the placeholder values in your `.env.local` file:

```bash
# Replace these lines:
VERCEL_CLIENT_ID=your_vercel_client_id_here
VERCEL_CLIENT_SECRET=your_vercel_client_secret_here

# With your actual credentials:
VERCEL_CLIENT_ID=your_actual_client_id
VERCEL_CLIENT_SECRET=your_actual_client_secret
```

## Step 4: Deploy to Production

Don't forget to also update the environment variables in your Vercel production deployment:

1. Go to your project in Vercel dashboard
2. Go to Settings → Environment Variables
3. Add/update:
   - `VERCEL_CLIENT_ID`
   - `VERCEL_CLIENT_SECRET`
4. Redeploy your application

## Step 5: Test the Integration

1. Restart your local development server
2. Go to your app and try connecting Vercel from the Setup modal
3. You should now be redirected to Vercel for authorization

## Important Notes

- The redirect URL must match exactly: `https://www.seoagent.com/api/hosting/vercel/oauth`
- Keep your Client Secret secure and never commit it to version control
- The integration will only work with the proper credentials in place

## Troubleshooting

If you see "Vercel OAuth not configured" error:
1. Make sure the environment variables are set correctly
2. Restart your development server after updating `.env.local`
3. Check that the redirect URL in Vercel matches your API endpoint