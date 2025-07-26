#!/bin/bash

# PackMoveGo Mobile API Test Script
# This script tests all mobile API endpoints

echo "📱 PackMoveGo Mobile API Test"
echo "=============================="

# Get the server URL from command line or use default
SERVER_URL=${1:-"http://localhost:3002"}

echo "Testing server: $SERVER_URL"
echo ""

# Function to test an endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo "🔍 Testing: $description"
    echo "   Endpoint: $endpoint"
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$SERVER_URL$endpoint")
    
    # Extract HTTP status and response body
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "200" ]; then
        echo "   ✅ Status: $http_status"
        echo "   📄 Response: $response_body" | head -c 200
        if [ ${#response_body} -gt 200 ]; then
            echo "... (truncated)"
        fi
    else
        echo "   ❌ Status: $http_status"
        echo "   📄 Response: $response_body"
    fi
    echo ""
}

# Test all endpoints
test_endpoint "/api/health" "Health Check"
test_endpoint "/mobile/health" "Mobile Health Check"
test_endpoint "/mobile/api" "Mobile API"
test_endpoint "/mobile/debug" "Mobile Debug Info"
test_endpoint "/mobile/data/about" "About Data"
test_endpoint "/mobile/data/Services" "Services Data"
test_endpoint "/mobile/data/contact" "Contact Data"

echo "🎉 Mobile API testing complete!"
echo ""
echo "To test from your phone:"
echo "1. Make sure your phone is on the same network as this computer"
echo "2. Find your computer's IP address: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
echo "3. Open this URL on your phone: http://YOUR_COMPUTER_IP:3002/mobile-test.html"
echo ""
echo "Or test directly with these URLs:"
echo "   Health: $SERVER_URL/mobile/health"
echo "   API: $SERVER_URL/mobile/api"
echo "   Debug: $SERVER_URL/mobile/debug" 