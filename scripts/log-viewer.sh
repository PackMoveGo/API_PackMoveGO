#!/bin/bash

# Log Viewer Script for PackMoveGO
# This script provides better console output for viewing server logs

echo "📝 === PackMoveGO Log Viewer ==="
echo "🔍 Viewing server logs with enhanced formatting..."
echo ""

# Function to colorize log levels
colorize_logs() {
    sed -E '
        s/ERROR/🔴 ERROR/g;
        s/WARN/🟡 WARN/g;
        s/INFO/🔵 INFO/g;
        s/DEBUG/🟢 DEBUG/g;
        s/✅/✅/g;
        s/❌/❌/g;
        s/⚠️/⚠️/g;
        s/🚀/🚀/g;
        s/📡/📡/g;
        s/🔧/🔧/g;
        s/📋/📋/g;
        s/⚙️/⚙️/g;
        s/🎯/🎯/g;
        s/🔌/🔌/g;
        s/🔐/🔐/g;
        s/👥/👥/g;
        s/📊/📊/g;
        s/📱/📱/g;
        s/👤/👤/g;
        s/🌍/🌍/g;
        s/🔑/🔑/g;
        s/📝/📝/g;
        s/💳/💳/g;
        s/📧/📧/g;
        s/📦/📦/g;
        s/🔒/🔒/g;
        s/🛑/🛑/g;
        s/🔥/🔥/g;
        s/📍/📍/g;
        s/🕐/🕐/g;
        s/💻/💻/g;
        s/💾/💾/g;
        s/📈/📈/g;
        s/🌐/🌐/g;
        s/🧪/🧪/g;
        s/🔄/🔄/g;
        s/⏰/⏰/g;
        s/💡/💡/g;
        s/🖥️/🖥️/g;
        s/⚡/⚡/g;
        s/📄/📄/g;
        s/🔍/🔍/g;
        s/📋/📋/g;
        s/🎯/🎯/g;
        s/==================================================/==================================================/g
    '
}

# Function to filter logs by level
filter_logs() {
    local level=$1
    case $level in
        "error"|"ERROR")
            grep -i "error\|❌\|🔥"
            ;;
        "warn"|"WARN")
            grep -i "warn\|⚠️"
            ;;
        "info"|"INFO")
            grep -i "info\|✅\|ℹ️"
            ;;
        "debug"|"DEBUG")
            grep -i "debug\|🟢"
            ;;
        "all")
            cat
            ;;
        *)
            echo "Invalid log level. Use: error, warn, info, debug, or all"
            exit 1
            ;;
    esac
}

# Function to show log statistics
show_stats() {
    echo "📊 === Log Statistics ==="
    echo "🔴 Errors: $(grep -c "ERROR\|❌\|🔥" 2>/dev/null || echo "0")"
    echo "🟡 Warnings: $(grep -c "WARN\|⚠️" 2>/dev/null || echo "0")"
    echo "🔵 Info: $(grep -c "INFO\|✅\|ℹ️" 2>/dev/null || echo "0")"
    echo "🟢 Debug: $(grep -c "DEBUG\|🟢" 2>/dev/null || echo "0")"
    echo ""
}

# Function to show recent activity
show_recent() {
    echo "🕐 === Recent Activity ==="
    echo "Last 10 log entries:"
    echo ""
}

# Main function
main() {
    local level=${1:-"all"}
    local follow=${2:-"false"}
    
    if [ "$follow" = "true" ]; then
        echo "🔄 Following logs in real-time..."
        echo "💡 Press Ctrl+C to stop"
        echo ""
        
        # Show recent logs first
        show_recent
        tail -n 10 -f /dev/null | colorize_logs | filter_logs $level
        
    else
        # Show log statistics
        show_stats
        
        # Show recent logs
        show_recent
        
        # Show last 50 log entries
        echo "Last 50 log entries:"
        echo ""
        tail -n 50 /dev/null | colorize_logs | filter_logs $level
    fi
}

# Help function
show_help() {
    echo "Usage: $0 [level] [follow]"
    echo ""
    echo "Levels:"
    echo "  error  - Show only error logs"
    echo "  warn   - Show only warning logs"
    echo "  info   - Show only info logs"
    echo "  debug  - Show only debug logs"
    echo "  all    - Show all logs (default)"
    echo ""
    echo "Follow:"
    echo "  true   - Follow logs in real-time"
    echo "  false  - Show recent logs only (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Show all recent logs"
    echo "  $0 error             # Show recent error logs"
    echo "  $0 info true         # Follow info logs in real-time"
    echo "  $0 all true          # Follow all logs in real-time"
}

# Parse arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        show_help
        exit 0
        ;;
    *)
        main "${1:-all}" "${2:-false}"
        ;;
esac 