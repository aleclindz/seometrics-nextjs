#!/bin/bash

# Test Sitemap Cron Job
# This script tests the scheduled sitemap regeneration system

echo "🧪 Testing SEOAgent Sitemap Cron Job..."
echo "========================================"

# Configuration
BASE_URL="https://www.seoagent.com"
ADMIN_SECRET="y7X0I3xd1RXD9vKjvhAd5tPbLMyqR8SguAHqaEO+KuU="

# Use raw secret (no encoding needed!)
RAW_SECRET="${ADMIN_SECRET}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📍 Testing URL: ${BASE_URL}/api/admin/test-sitemap-cron"
echo "🔑 Using Admin Secret: ${ADMIN_SECRET:0:10}..."
echo "✨ Using raw secret (no URL encoding needed)"
echo ""

# Make the request with timeout (using curl's built-in timeout)
echo "🚀 Triggering cron test (60s timeout)..."
response=$(curl -s -L -m 60 -w "HTTPSTATUS:%{http_code}" \
  "${BASE_URL}/api/admin/test-sitemap-cron?adminToken=${RAW_SECRET}")
curl_exit_code=$?

if [ $curl_exit_code -eq 28 ]; then
  echo -e "${RED}⏰ REQUEST TIMED OUT after 60 seconds${NC}"
  echo "This usually means:"
  echo "1. The endpoint is processing many websites (this is normal)"  
  echo "2. There might be an internal error in the cron job"
  echo "3. The database query is taking too long"
  echo ""
  echo "✅ The good news: Your endpoint is deployed and accessible!"
  echo "🔍 Check Vercel function logs for more details"
  exit 1
fi

# Also test if the endpoint exists quickly
echo "🔍 Testing endpoint existence..."
endpoint_test=$(curl -s -I -m 10 -w "HTTPSTATUS:%{http_code}" \
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