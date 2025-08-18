#!/bin/bash

# Check Deployment Status
echo "🔍 Checking SEOAgent Deployment Status..."
echo "========================================"

BASE_URL="https://seoagent.com"

# Test different endpoints to see what's deployed
endpoints=(
  "/api/admin/test-sitemap-cron"
  "/api/cron/regenerate-sitemaps" 
  "/api/technical-seo/generate-sitemap"
  "/api/sitemaps/serve"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing: ${BASE_URL}${endpoint}"
  
  response=$(curl -s -I -w "HTTPSTATUS:%{http_code}" "${BASE_URL}${endpoint}")
  http_code=$(echo "$response" | grep "HTTPSTATUS:" | sed 's/.*HTTPSTATUS://')
  
  case "$http_code" in
    200|201) echo "  ✅ Available ($http_code)" ;;
    401|403) echo "  🔐 Available but needs auth ($http_code)" ;;
    404|307) echo "  ❌ Not deployed ($http_code)" ;;
    405) echo "  ⚠️  Available but wrong method ($http_code)" ;;
    *) echo "  ❓ Unknown status ($http_code)" ;;
  esac
done

echo ""
echo "📝 Next Steps:"
echo "1. If endpoints show 'Not deployed', run: git add . && git commit -m 'Add scheduled sitemap system' && git push"
echo "2. Set environment variables in Vercel: CRON_SECRET and ADMIN_SECRET"  
echo "3. Redeploy the project in Vercel dashboard"
echo "4. Run the cron test script again"