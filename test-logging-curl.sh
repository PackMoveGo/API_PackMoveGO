#!/bin/bash

echo "🧪 Testing API logging on Render..."
echo "🌐 Base URL: https://api.packmovego.com"
echo "📊 Making requests to trigger logging..."
echo ""

# Test endpoints
endpoints=(
  "/test-logging"
  "/health"
  "/v0/nav"
  "/v0/blog"
  "/v0/about"
  "/v0/contact"
)

for endpoint in "${endpoints[@]}"; do
  echo "📡 Testing: $endpoint"
  curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" \
       -H "User-Agent: Logging-Test-Curl/1.0" \
       "https://api.packmovego.com$endpoint" > /dev/null
  sleep 1
done

echo ""
echo "✅ Test completed!"
echo "📋 Check your Render console logs to see the request logging."
echo "🔍 Look for lines starting with timestamps like: [2025-07-31T23:05:54.182Z]" 