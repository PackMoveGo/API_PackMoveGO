#!/bin/bash

# 🚀 PackMoveGO API Testing Script (cURL version)
# 
# This script uses cURL to test the main endpoints of api.packmovego.com
# 
# Usage:
#   chmod +x test-api-curl.sh
#   ./test-api-curl.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# API Base URL
API_BASE="https://api.packmovego.com"

# Test counter
PASSED=0
FAILED=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    local details=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $message${NC}"
        ((FAILED++))
    fi
    
    if [ ! -z "$details" ]; then
        echo -e "${YELLOW}   $details${NC}"
    fi
}

# Function to test an endpoint
test_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-""}
    local expected_status=${4:-200}
    
    local url="$API_BASE$endpoint"
    local curl_cmd="curl -s -o /dev/null -w '%{http_code}'"
    
    if [ "$method" = "POST" ] && [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd $url"
    
    local status_code=$(eval $curl_cmd)
    
    if [ "$status_code" = "$expected_status" ] || [ "$status_code" = "200" ] || [ "$status_code" = "401" ]; then
        print_status "PASS" "$method $endpoint" "Status: $status_code"
    else
        print_status "FAIL" "$method $endpoint" "Status: $status_code (expected: $expected_status)"
    fi
}

# Function to test with response body
test_endpoint_with_response() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-""}
    
    local url="$API_BASE$endpoint"
    local curl_cmd="curl -s"
    
    if [ "$method" = "POST" ] && [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd $url"
    
    local response=$(eval $curl_cmd)
    local status_code=$(echo "$response" | tail -n1)
    
    if [ ! -z "$response" ] && [ "$response" != "null" ]; then
        print_status "PASS" "$method $endpoint" "Has data"
    else
        print_status "FAIL" "$method $endpoint" "No data or error"
    fi
}

echo -e "${CYAN}🚀 PackMoveGO API Testing Suite (cURL)${NC}"
echo -e "${CYAN}Testing: $API_BASE${NC}"
echo -e "${CYAN}Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")${NC}"
echo "============================================================"

# Test Health Endpoints
echo -e "\n${BLUE}🔍 Testing Health Endpoints...${NC}"
test_endpoint "/health"
test_endpoint "/api/health"
test_endpoint "/api/heartbeat"
test_endpoint "/api/ping"
test_endpoint "/analytics/health"

# Test Data Endpoints
echo -e "\n${BLUE}📊 Testing Data Endpoints...${NC}"
test_endpoint_with_response "/data/about"
test_endpoint_with_response "/data/blog"
test_endpoint_with_response "/data/contact"
test_endpoint_with_response "/data/locations"
test_endpoint_with_response "/data/nav"
test_endpoint_with_response "/data/reviews"
test_endpoint_with_response "/data/services"
test_endpoint_with_response "/data/supplies"
test_endpoint_with_response "/data/testimonials"

# Test v0 Data Endpoints
echo -e "\n${BLUE}📊 Testing v0 Data Endpoints...${NC}"
test_endpoint_with_response "/v0/about"
test_endpoint_with_response "/v0/blog"
test_endpoint_with_response "/v0/contact"
test_endpoint_with_response "/v0/locations"
test_endpoint_with_response "/v0/nav"
test_endpoint_with_response "/v0/reviews"
test_endpoint_with_response "/v0/services"
test_endpoint_with_response "/v0/supplies"
test_endpoint_with_response "/v0/testimonials"

# Test Services Endpoints
echo -e "\n${BLUE}🚚 Testing Services Endpoints...${NC}"
test_endpoint_with_response "/v1/services"
test_endpoint_with_response "/v1/services/analytics"

# Test Analytics Endpoints
echo -e "\n${BLUE}📈 Testing Analytics Endpoints...${NC}"
test_endpoint "/analytics/performance"
test_endpoint "/analytics/realtime"
test_endpoint "/analytics/export"

# Test Authentication Endpoints
echo -e "\n${BLUE}🔐 Testing Authentication Endpoints...${NC}"
test_endpoint "/auth/login" "POST" '{"email":"test@packmovego.com","password":"testpassword123"}'
test_endpoint "/auth/register" "POST" '{"email":"test@packmovego.com","password":"testpassword123"}'
test_endpoint "/auth/verify"

# Test Security Endpoints
echo -e "\n${BLUE}🔒 Testing Security Endpoints...${NC}"
test_endpoint "/security/verify-sections" "POST" '{"test":true}'

# Test Prelaunch Endpoints
echo -e "\n${BLUE}🚀 Testing Prelaunch Endpoints...${NC}"
test_endpoint "/prelaunch/subscribers"
test_endpoint "/prelaunch/early_subscribers"

# Test CORS Headers
echo -e "\n${BLUE}🌐 Testing CORS Headers...${NC}"
CORS_RESPONSE=$(curl -s -I -H "Origin: https://www.packmovego.com" "$API_BASE/health" | grep -i "access-control-allow-origin" || echo "")
if [ ! -z "$CORS_RESPONSE" ]; then
    print_status "PASS" "CORS Headers" "CORS configured"
else
    print_status "FAIL" "CORS Headers" "No CORS headers found"
fi

# Test Response Time
echo -e "\n${BLUE}⏱️ Testing Response Time...${NC}"
START_TIME=$(date +%s%N)
curl -s -o /dev/null "$API_BASE/health"
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 1000 ]; then
    print_status "PASS" "Response Time" "${RESPONSE_TIME}ms"
else
    print_status "FAIL" "Response Time" "${RESPONSE_TIME}ms (slow)"
fi

# Test SSL Connection
echo -e "\n${BLUE}🔐 Testing SSL Connection...${NC}"
SSL_TEST=$(curl -s -I "$API_BASE/health" 2>/dev/null | head -n1 | grep "HTTP" || echo "")
if [ ! -z "$SSL_TEST" ]; then
    print_status "PASS" "SSL Connection" "HTTPS connection successful"
else
    print_status "FAIL" "SSL Connection" "SSL connection failed"
fi

# Print Summary
echo -e "\n============================================================"
echo -e "${CYAN}📊 TEST SUMMARY${NC}"
echo "============================================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${BLUE}📈 Total: $((PASSED + FAILED))${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎯 Success Rate: 100%${NC}"
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    SUCCESS_RATE=$(( (PASSED * 100) / (PASSED + FAILED) ))
    echo -e "${YELLOW}🎯 Success Rate: ${SUCCESS_RATE}%${NC}"
    echo -e "${RED}⚠️  Some tests failed${NC}"
    exit 1
fi 