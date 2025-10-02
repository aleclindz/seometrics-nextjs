#!/bin/bash

# Script to configure Vercel webhook for automatic deployment fix system
# This webhook will notify our API when deployments fail

set -e

# Check required environment variables
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Error: VERCEL_TOKEN environment variable is required"
  exit 1
fi

# Configuration
PROJECT_ID="prj_8n5bC0IAtBfKx6Z5LW60jZTAVt6O"
TEAM_ID="team_HSnkJEctgKF6Sx3vSXqUi33P"
WEBHOOK_URL="https://seoagent.com/api/webhooks/vercel-deployment"
WEBHOOK_SECRET="${VERCEL_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"

echo "🔧 Setting up Vercel webhook for automatic deployment fixes..."
echo ""
echo "Project ID: $PROJECT_ID"
echo "Team ID: $TEAM_ID"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Create the webhook
RESPONSE=$(curl -s -X POST "https://api.vercel.com/v1/webhooks" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\",
    \"events\": [
      \"deployment.error\",
      \"deployment.failed\",
      \"deployment.success\"
    ],
    \"projectIds\": [
      \"$PROJECT_ID\"
    ]
  }")

# Check if webhook was created successfully
if echo "$RESPONSE" | grep -q "\"id\""; then
  WEBHOOK_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Webhook created successfully!"
  echo ""
  echo "Webhook ID: $WEBHOOK_ID"
  echo "Webhook Secret: $WEBHOOK_SECRET"
  echo ""
  echo "⚠️  IMPORTANT: Add this to your Vercel environment variables:"
  echo "VERCEL_WEBHOOK_SECRET=$WEBHOOK_SECRET"
  echo ""
  echo "Full webhook details:"
  echo "$RESPONSE" | jq '.'
else
  echo "❌ Failed to create webhook"
  echo "Response:"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "✅ Webhook configuration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add VERCEL_WEBHOOK_SECRET to your Vercel environment variables"
echo "2. Redeploy your application to apply the new environment variable"
echo "3. The webhook will automatically monitor all deployments"
echo "4. Failed deployments will trigger automatic fixes every 5 minutes"
