#!/bin/bash

echo "🔧 Fixing translateyoutubevideos.com sitemap issue..."

# Test the current sitemap status
echo "1. Testing current sitemap.xml status:"
curl -I "https://translateyoutubevideos.com/sitemap.xml"

echo -e "\n2. Running automated fix script via API:"
# Run the fix script
response=$(curl -s -X POST "https://seoagent.com/api/debug/fix-translateyoutubevideos-sitemap")
echo "$response" | jq -r '.message'
echo "Success: $(echo "$response" | jq -r '.success')"

echo -e "\n3. Website token: $(echo "$response" | jq -r '.websiteToken')"

echo -e "\n4. Testing sitemap API after fix:"
curl -s "https://seoagent.com/api/sitemaps/serve?domain=translateyoutubevideos.com" | head -5

echo -e "\n5. Testing final sitemap.xml:"
curl -I "https://translateyoutubevideos.com/sitemap.xml"

echo -e "\n✅ Fix script completed!"