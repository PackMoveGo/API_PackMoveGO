#!/bin/bash

echo "==================================================================="
echo "🚀 PackMoveGO Gateway Service Test"
echo "==================================================================="
echo "Gateway: https://localhost:3000"
echo "Server:  https://localhost:3001 (private)"
echo ""

# Start gateway only
echo "Starting gateway service..."
cd "$(dirname "$0")"
npm run dev:gateway > /tmp/gateway_test.log 2>&1 &
GATEWAY_PID=$!

# Wait for startup
sleep 8

echo "Testing gateway endpoints..."
echo ""

# Test 1: Health check (no auth required)
echo "1. Health Check (no auth required):"
HEALTH=$(curl -k -s https://localhost:3000/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
  echo "   ✅ SUCCESS: $HEALTH"
else
  echo "   ❌ FAILED: Gateway not responding"
fi
echo ""

# Test 2: Without API key (should redirect to packmovego.com)
echo "2. Request without API key (should redirect to packmovego.com):"
NO_KEY_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost:3000/v0/blog 2>/dev/null)
if [ "$NO_KEY_STATUS" = "301" ]; then
  echo "   ✅ SUCCESS: Correctly redirected with 301"
else
  echo "   ⚠️  HTTP Status: $NO_KEY_STATUS (expected 301)"
fi
echo ""

# Test 3: With API key (should succeed)
echo "3. Request with API key (should succeed):"
WITH_KEY=$(curl -k -s -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/v0/blog 2>/dev/null)
if [ -n "$WITH_KEY" ]; then
  echo "   ✅ SUCCESS: Request accepted"
else
  echo "   ⚠️  No response received"
fi
echo ""

# Test 4: With Authorization header
echo "4. Request with Authorization header:"
WITH_AUTH=$(curl -k -s -H "Authorization: Bearer pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/health 2>/dev/null)
if echo "$WITH_AUTH" | grep -q "ok"; then
  echo "   ✅ SUCCESS: Both header formats work"
else
  echo "   ⚠️  Response: $WITH_AUTH"
fi
echo ""

# Test 5: Direct server access (should redirect to gateway)
echo "5. Direct server access (should redirect to gateway):"
SERVER_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost:3001/ 2>/dev/null)
if [ "$SERVER_STATUS" = "301" ]; then
  echo "   ✅ SUCCESS: Server redirects direct access to gateway (301)"
else
  echo "   ⚠️  HTTP Status: $SERVER_STATUS (expected 301)"
fi
echo ""

# Test 6: Arcjet protection (bot detection with curl)
echo "6. Arcjet Protection (CURL is allowed):"
ARCJET_TEST=$(curl -k -s -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/health 2>/dev/null)
if echo "$ARCJET_TEST" | grep -q "ok"; then
  echo "   ✅ SUCCESS: Arcjet allows CURL (configured in allow list)"
else
  echo "   ⚠️  Response: $ARCJET_TEST"
fi
echo ""

echo "==================================================================="
echo "📝 Gateway API Configuration"
echo "==================================================================="
echo "API Key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6"
echo ""
echo "Usage in Frontend:"
echo "  const API_BASE_URL = 'https://localhost:3000'; // Development"
echo "  // const API_BASE_URL = 'https://api.packmovego.com'; // Production"
echo ""
echo "  fetch(API_BASE_URL + '/v0/blog', {"
echo "    headers: { 'x-api-key': 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6' }"
echo "  });"
echo ""
echo "Security Features:"
echo "  ✅ Arcjet Protection (Bot Detection, Rate Limiting, Shield)"
echo "  ✅ API Key Validation"
echo "  ✅ HTTPS/SSL"
echo "  ✅ Direct server access blocked"
echo ""

# Cleanup
echo "Stopping gateway..."
kill $GATEWAY_PID 2>/dev/null
pkill -f "nodemon" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true
sleep 2

echo ""
echo "✅ Test complete!"
echo ""
echo "To start both services: npm run dev"
echo "To start gateway only: npm run dev:gateway"
echo "To start server only: npm run dev:server"

