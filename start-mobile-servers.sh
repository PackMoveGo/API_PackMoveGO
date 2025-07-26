#!/bin/bash

echo "🚀 === MOBILE SERVERS STARTUP ==="
echo "Starting enhanced mobile API and phone test servers"
echo ""

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    lsof -ti :$1 | xargs kill -9 2>/dev/null
}

# Kill existing processes on ports 4000 and 5001
echo "🔧 Cleaning up existing processes..."
kill_port 4000
kill_port 5001
sleep 2

# Configure firewall
echo "🔧 Configuring firewall..."
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node 2>/dev/null
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node 2>/dev/null

# Get network IPs
echo "📡 Detecting network interfaces..."
IP_ADDRESSES=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
echo "Found IP addresses: $IP_ADDRESSES"
echo ""

# Start Mobile API Server
echo "🚀 Starting Enhanced Mobile API Server..."
if ! port_in_use 4000; then
    node mobile-api-server.js &
    MOBILE_PID=$!
    echo "✅ Mobile API Server started with PID: $MOBILE_PID"
    sleep 3
else
    echo "⚠️  Port 4000 already in use"
fi

# Start Phone Test Server
echo "📱 Starting Enhanced Phone Test Server..."
if ! port_in_use 5001; then
    node phone-test-server.js &
    PHONE_PID=$!
    echo "✅ Phone Test Server started with PID: $PHONE_PID"
    sleep 3
else
    echo "⚠️  Port 5001 already in use"
fi

# Test connectivity
echo ""
echo "🔍 Testing server connectivity..."
sleep 2

for ip in $IP_ADDRESSES; do
    echo "Testing Mobile API at $ip:4000..."
    if curl -s "http://$ip:4000/health" >/dev/null 2>&1; then
        echo "✅ Mobile API working at $ip:4000"
    else
        echo "❌ Mobile API not working at $ip:4000"
    fi
    
    echo "Testing Phone Test Server at $ip:5001..."
    if curl -s "http://$ip:5001/health" >/dev/null 2>&1; then
        echo "✅ Phone Test Server working at $ip:5001"
    else
        echo "❌ Phone Test Server not working at $ip:5001"
    fi
done

echo ""
echo "🎯 === SERVERS STARTED SUCCESSFULLY ==="
echo ""
echo "📱 Test URLs for your phone:"
for ip in $IP_ADDRESSES; do
    echo "• Mobile API Health: http://$ip:4000/health"
    echo "• Mobile API Test: http://$ip:4000/mobile-test"
    echo "• Phone Test Page: http://$ip:5001"
    echo "• Network Info: http://$ip:5001/network-info"
    echo ""
done

echo "🔧 Troubleshooting:"
echo "• If phone can't connect, run: ./fix-network.sh"
echo "• Make sure phone and computer are on same WiFi"
echo "• Try turning off mobile data on phone"
echo "• Check WiFi router settings"
echo ""

echo "✅ Enhanced mobile servers are ready!"
echo "📱 Open http://$ip:5001 on your phone to test connectivity" 