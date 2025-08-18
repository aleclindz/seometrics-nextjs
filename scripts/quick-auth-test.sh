#!/bin/bash

# Quick Authentication Test
echo "🔐 Testing Authentication Only..."
echo "=================================="

BASE_URL="https://www.seoagent.com"
ADMIN_SECRET="y7X0I3xd1RXD9vKjvhAd5tPbLMyqR8SguAHqaEO+KuU="

# URL encode the secret
ENCODED_SECRET=$(echo "$ADMIN_SECRET" | sed 's/+/%2B/g' | sed 's/=/%3D/g')

echo "🔑 Testing with encoded secret: ${ENCODED_SECRET:0:15}..."

# Test with a quick request that should fail fast if auth is wrong
response=$(curl -s -m 10 -w "HTTPSTATUS:%{http_code}" \
  "${BASE_URL}/api/admin/test-sitemap-cron?adminToken=${ENCODED_SECRET}")

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
response_body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

echo "📊 HTTP Status: $http_code"

if [ "$http_code" -eq 401 ]; then
  echo "❌ Authentication Failed"
  echo "📋 Debug Response:"
  echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
  echo ""
  echo "🔧 Troubleshooting:"
  echo "1. Check that ADMIN_SECRET is set correctly in Vercel"
  echo "2. Verify the secret matches exactly (no extra spaces)"
  echo "3. Try redeploying after setting env vars"
elif [ "$http_code" -eq 200 ]; then
  echo "✅ Authentication Success!"
  echo "🎉 The endpoint is working - the previous timeout was likely due to processing time"
else
  echo "❓ Unexpected status: $http_code"
  echo "$response_body"
fi