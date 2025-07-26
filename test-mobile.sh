#!/bin/bash

echo "📱 Testing Mobile API Endpoints"
echo "================================"

# Test basic health endpoint
echo "1. Testing health endpoint..."
curl -s https://api.packmovego.com/api/health | jq .

echo ""
echo "2. Testing mobile test endpoint..."
curl -s https://api.packmovego.com/mobile-test | jq .

echo ""
echo "3. Testing mobile nav endpoint..."
curl -s https://api.packmovego.com/mobile/v0/nav | jq .

echo ""
echo "4. Testing with mobile user agent..."
curl -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" -s https://api.packmovego.com/api/mobile-test | jq .

echo ""
echo "✅ Mobile API tests completed!" 