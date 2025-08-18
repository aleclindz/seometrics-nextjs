#!/bin/bash

# Debug URL Parameter Passing
echo "🔍 Debugging URL Parameter Issues..."
echo "===================================="

BASE_URL="https://www.seoagent.com"
ADMIN_SECRET="y7X0I3xd1RXD9vKjvhAd5tPbLMyqR8SguAHqaEO+KuU="

echo "🔑 Original secret: $ADMIN_SECRET"
echo "📏 Original length: ${#ADMIN_SECRET}"

# Test different encoding methods
ENCODED_1=$(echo "$ADMIN_SECRET" | sed 's/+/%2B/g' | sed 's/=/%3D/g')
echo "🔧 Method 1 encoded: $ENCODED_1"

# Test with curl's --data-urlencode
echo ""
echo "🧪 Testing different approaches..."

echo "1. Raw secret (no encoding):"
response1=$(curl -s -m 5 "${BASE_URL}/api/admin/test-sitemap-cron?adminToken=${ADMIN_SECRET}" | jq -r '.debug // empty' 2>/dev/null || echo "Failed")
echo "   Result: $response1"

echo "2. Manual URL encoding:"
response2=$(curl -s -m 5 "${BASE_URL}/api/admin/test-sitemap-cron?adminToken=${ENCODED_1}" | jq -r '.debug // empty' 2>/dev/null || echo "Failed")  
echo "   Result: $response2"

echo "3. Curl automatic encoding:"
response3=$(curl -s -m 5 -G "${BASE_URL}/api/admin/test-sitemap-cron" --data-urlencode "adminToken=${ADMIN_SECRET}" | jq -r '.debug // empty' 2>/dev/null || echo "Failed")
echo "   Result: $response3"