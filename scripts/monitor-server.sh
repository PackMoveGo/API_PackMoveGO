#!/bin/bash

# Server Monitoring Script for PackMoveGO
# This script provides better console output and monitoring capabilities

echo "🔍 === PackMoveGO Server Monitor ==="
echo "📡 Monitoring server on port 3000..."
echo ""

# Function to check server status
check_server() {
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Server is running"
        return 0
    else
        echo "❌ Server is not responding"
        return 1
    fi
}

# Function to show server info
show_server_info() {
    echo "📊 === Server Information ==="
    echo "🔧 Environment: $(curl -s http://localhost:3000/api/health | jq -r '.environment' 2>/dev/null || echo 'Unknown')"
    echo "🕐 Uptime: $(ps -p $(pgrep -f "ts-node src/server.ts") -o etime= 2>/dev/null || echo 'Unknown')"
    echo "💾 Memory: $(ps -p $(pgrep -f "ts-node src/server.ts") -o rss= 2>/dev/null | awk '{print $1/1024 " MB"}' || echo 'Unknown')"
    echo "📈 CPU: $(ps -p $(pgrep -f "ts-node src/server.ts") -o %cpu= 2>/dev/null || echo 'Unknown')%"
    echo ""
}

# Function to test endpoints
test_endpoints() {
    echo "🧪 === Testing Endpoints ==="
    
    endpoints=(
        "Health: /health"
        "API Health: /api/health"
        "About: /v0/about"
        "Services: /v0/services"
        "Contact: /v0/contact"
    )
    
    for endpoint in "${endpoints[@]}"; do
        name=$(echo $endpoint | cut -d: -f1)
        path=$(echo $endpoint | cut -d: -f2)
        
        if curl -s -H "Origin: http://localhost:5001" "http://localhost:3000$path" > /dev/null; then
            echo "✅ $name"
        else
            echo "❌ $name"
        fi
    done
    echo ""
}

# Function to show recent logs
show_logs() {
    echo "📝 === Recent Server Activity ==="
    # This would show recent log entries if you have log files
    echo "💡 Use 'npm run dev' to see real-time logs"
    echo ""
}

# Function to show system resources
show_resources() {
    echo "💻 === System Resources ==="
    echo "🖥️  CPU Usage: $(top -l 1 | grep "CPU usage" | awk '{print $3}' | cut -d'%' -f1)%"
    echo "💾 Memory Usage: $(memory_pressure | grep "System-wide memory free percentage" | awk '{print $5}' | cut -d'%' -f1)%"
    echo "🌐 Network: $(netstat -an | grep LISTEN | grep 3000 | wc -l) connections on port 3000"
    echo ""
}

# Main monitoring loop
monitor() {
    while true; do
        clear
        echo "🔄 === PackMoveGO Server Monitor ==="
        echo "⏰ $(date)"
        echo ""
        
        if check_server; then
            show_server_info
            test_endpoints
            show_resources
        else
            echo "❌ Server is not running!"
            echo "💡 Start the server with: npm run dev"
        fi
        
        echo "🔄 Refreshing in 10 seconds... (Press Ctrl+C to exit)"
        sleep 10
    done
}

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Install it with: brew install jq"
    echo "📝 Some features may not work without jq"
    echo ""
fi

# Start monitoring
monitor 