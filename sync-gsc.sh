#!/bin/bash

echo "🔄 Manual GSC Search Analytics Sync"
echo "Site: translateyoutubevideos.com"
echo "Syncing last 30 days of data..."
echo ""

curl -X POST http://localhost:3000/api/gsc/sync-analytics \
  -H "Content-Type: application/json" \
  -d '{
    "userToken": "71d3a313-563d-4701-afa5-59d3ba8d7a9c",
    "siteUrl": "sc-domain:translateyoutubevideos.com", 
    "syncType": "recent",
    "daysBack": 30
  }' \
  --silent \
  --show-error \
  --write-out "\n\n📊 Response Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat

echo ""
echo "✅ Sync request completed!"