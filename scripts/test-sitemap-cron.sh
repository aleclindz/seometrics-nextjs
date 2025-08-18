#!/bin/bash

# Test Sitemap Cron Job
# This script tests the scheduled sitemap regeneration system

echo "🧪 Testing SEOAgent Sitemap Cron Job..."
echo "========================================"

# Configuration
BASE_URL="https://seoagent.com"
ADMIN_SECRET="y7X0I3xd1RXD9vKjvhAd5tPbLMyqR8SguAHqaEO+KuU="

# URL encode the secret (replace + with %2B and = with %3D)
ENCODED_SECRET=$(echo "$ADMIN_SECRET" | sed 's/+/%2B/g' | sed 's/=/%3D/g')

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📍 Testing URL: ${BASE_URL}/api/admin/test-sitemap-cron"
echo "🔑 Using Admin Secret: ${ADMIN_SECRET:0:10}..."
echo "🔧 URL-encoded Secret: ${ENCODED_SECRET:0:15}..."
echo ""

# Make the request
echo "🚀 Triggering cron test..."
response=$(curl -s -L -w "HTTPSTATUS:%{http_code}" \
  "${BASE_URL}/api/admin/test-sitemap-cron?adminToken=${ENCODED_SECRET}")

# Also test if the endpoint exists
echo "🔍 Testing endpoint existence..."
endpoint_test=$(curl -s -I -w "HTTPSTATUS:%{http_code}" \
  "${BASE_URL}/api/admin/test-sitemap-cron" | grep "HTTPSTATUS:")
endpoint_code=$(echo $endpoint_test | sed 's/.*HTTPSTATUS://')
echo "📍 Endpoint status (without params): $endpoint_code"

# Extract the response body and status code
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
response_body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

echo "📊 HTTP Status: $http_code"
echo ""

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ SUCCESS: Cron test completed successfully${NC}"
  echo ""
  echo "📋 Response:"
  echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
else
  echo -e "${RED}❌ ERROR: HTTP $http_code${NC}"
  echo ""
  echo "📋 Response:"
  echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
fi

echo ""
echo "🔍 Check the following after running:"
echo "1. Visit your dashboard to see if sitemaps were regenerated"
echo "2. Check Google Search Console for new sitemap submissions"
echo "3. Test sitemap.xml URLs (e.g., https://translateyoutubevideos.com/sitemap.xml)"
echo ""
echo "📝 View logs in database:"
echo "SELECT * FROM system_logs WHERE log_type = 'cron_sitemap_regeneration' ORDER BY created_at DESC;"
echo ""
echo "⏰ Next automatic run: Every Monday at 2:00 AM UTC"