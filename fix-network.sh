#!/bin/bash

echo "🔧 === NETWORK CONFIGURATION FIX ==="
echo "This script will configure your network for phone connectivity"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Some commands require sudo privileges"
    echo "You may be prompted for your password"
    echo ""
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get network interfaces
echo "📡 Detecting network interfaces..."
INTERFACES=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
echo "Found IP addresses:"
echo "$INTERFACES"
echo ""

# Configure firewall for Node.js
echo "🔧 Configuring firewall for Node.js..."
if command_exists /usr/libexec/ApplicationFirewall/socketfilterfw; then
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node 2>/dev/null
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node 2>/dev/null
    echo "✅ Firewall configured for Node.js"
else
    echo "⚠️  Application Firewall not found"
fi

# Configure firewall for Node.js (alternative path)
if command_exists /usr/libexec/ApplicationFirewall/socketfilterfw; then
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node) 2>/dev/null
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock $(which node) 2>/dev/null
    echo "✅ Firewall configured for Node.js (alternative path)"
fi

# Check if ports are in use
echo ""
echo "🔍 Checking port availability..."
if lsof -i :4000 >/dev/null 2>&1; then
    echo "✅ Port 4000 is in use (Mobile API Server)"
else
    echo "❌ Port 4000 is not in use"
fi

if lsof -i :5001 >/dev/null 2>&1; then
    echo "✅ Port 5001 is in use (Phone Test Server)"
else
    echo "❌ Port 5001 is not in use"
fi

# Test network connectivity
echo ""
echo "🌐 Testing network connectivity..."

for ip in $INTERFACES; do
    echo "Testing $ip:4000..."
    if nc -z -w2 $ip 4000 2>/dev/null; then
        echo "✅ $ip:4000 is accessible"
    else
        echo "❌ $ip:4000 is not accessible"
    fi
    
    echo "Testing $ip:5001..."
    if nc -z -w2 $ip 5001 2>/dev/null; then
        echo "✅ $ip:5001 is accessible"
    else
        echo "❌ $ip:5001 is not accessible"
    fi
done

# Start servers if not running
echo ""
echo "🚀 Starting servers..."

# Start mobile API server
if ! lsof -i :4000 >/dev/null 2>&1; then
    echo "Starting Mobile API Server on port 4000..."
    node mobile-api-server.js &
    MOBILE_PID=$!
    echo "Mobile API Server started with PID: $MOBILE_PID"
    sleep 2
else
    echo "Mobile API Server already running on port 4000"
fi

# Start phone test server
if ! lsof -i :5001 >/dev/null 2>&1; then
    echo "Starting Phone Test Server on port 5001..."
    node phone-test-server.js &
    PHONE_PID=$!
    echo "Phone Test Server started with PID: $PHONE_PID"
    sleep 2
else
    echo "Phone Test Server already running on port 5001"
fi

# Final connectivity test
echo ""
echo "📱 Final connectivity test..."
for ip in $INTERFACES; do
    echo "Testing Mobile API at $ip:4000/health..."
    if curl -s "http://$ip:4000/health" >/dev/null 2>&1; then
        echo "✅ Mobile API working at $ip:4000"
    else
        echo "❌ Mobile API not working at $ip:4000"
    fi
    
    echo "Testing Phone Test Server at $ip:5001/health..."
    if curl -s "http://$ip:5001/health" >/dev/null 2>&1; then
        echo "✅ Phone Test Server working at $ip:5001"
    else
        echo "❌ Phone Test Server not working at $ip:5001"
    fi
done

echo ""
echo "🎯 === NETWORK CONFIGURATION COMPLETE ==="
echo ""
echo "📱 Test URLs for your phone:"
for ip in $INTERFACES; do
    echo "• Mobile API: http://$ip:4000/health"
    echo "• Phone Test: http://$ip:5001"
done
echo ""
echo "🔧 If connectivity issues persist:"
echo "1. Make sure phone and computer are on same WiFi"
echo "2. Try turning off mobile data on phone"
echo "3. Check WiFi router settings"
echo "4. Try using mobile hotspot"
echo ""
echo "✅ Network configuration complete!" 