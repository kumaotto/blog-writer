#!/bin/bash

# Blog Writing Assistant - Startup Script
# This script starts both the backend server and frontend client
#
# Usage:
#   ./start.sh           - Start with local network access
#   ./start.sh --ngrok   - Start with ngrok (public internet access)

echo "🚀 Starting Blog Writing Assistant..."
echo ""

# Check for ngrok flag
USE_NGROK=false
if [ "$1" == "--ngrok" ]; then
    USE_NGROK=true
    echo "🌐 ngrok mode enabled - public internet access"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Build the project
echo "🔨 Building project..."
npm run build
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $SERVER_PID $CLIENT_PID $NGROK_PID 2>/dev/null
    rm -f ngrok.log 2>/dev/null
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT TERM

# Start ngrok first if requested
NGROK_PID=""
NGROK_URL=""
if [ "$USE_NGROK" = true ]; then
    # Check if ngrok is installed
    if ! command -v ngrok &> /dev/null; then
        echo "❌ ngrok is not installed"
        echo ""
        echo "To install ngrok:"
        echo "  brew install ngrok"
        echo "  or visit https://ngrok.com/download"
        echo ""
        echo "Falling back to local network mode..."
        USE_NGROK=false
    else
        echo "🔗 Starting ngrok tunnel..."
        ngrok http 3000 --log=stdout > ngrok.log 2>&1 &
        NGROK_PID=$!
        
        # Wait for ngrok to start
        sleep 3
        
        # Get ngrok URL
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
        
        if [ -n "$NGROK_URL" ]; then
            echo "✅ ngrok tunnel established!"
            echo "🌐 Public URL: $NGROK_URL"
            echo ""
        else
            echo "⚠️  Failed to get ngrok URL, falling back to local network"
            USE_NGROK=false
        fi
    fi
fi

# Start backend server with PUBLIC_URL if ngrok is enabled
echo "🖥️  Starting backend server on https://localhost:3001..."
if [ "$USE_NGROK" = true ] && [ -n "$NGROK_URL" ]; then
    PUBLIC_URL="$NGROK_URL" npm run dev:server &
else
    npm run dev:server &
fi
SERVER_PID=$!

# Wait a bit for server to start
sleep 3

# Start frontend client in background
echo "🌐 Starting frontend client on https://localhost:3000..."
npm run dev:client &
CLIENT_PID=$!

# Wait for client to be ready
sleep 2

echo ""
echo "✅ Application is running!"
echo ""

if [ "$USE_NGROK" = true ] && [ -n "$NGROK_URL" ]; then
    echo "🌍 PUBLIC ACCESS (via ngrok):"
    echo "   Mobile Upload:  $NGROK_URL/mobile"
    echo ""
    echo "   ⚠️  This URL is accessible from anywhere on the internet"
    echo "   ✅ QR code authentication keeps your session secure"
    echo ""
    echo "💻 PC Editor (local): http://localhost:3000"
    echo ""
    
    # Open browser with localhost (PC always uses local Vite server)
    echo "🌐 Opening PC editor in browser..."
    if command -v open &> /dev/null; then
        # macOS
        open "http://localhost:3000"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "http://localhost:3000"
    elif command -v start &> /dev/null; then
        # Windows
        start "http://localhost:3000"
    fi
else
    # Get local IP
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    
    echo "🏠 LOCAL NETWORK ACCESS:"
    echo "   PC Editor:      http://localhost:3000"
    echo "   Mobile Upload:  http://localhost:3000/mobile"
    echo ""
    if [ -n "$LOCAL_IP" ]; then
        echo "📱 From other devices on same WiFi:"
        echo "   PC Editor:      http://$LOCAL_IP:3000"
        echo "   Mobile Upload:  http://$LOCAL_IP:3000/mobile"
        echo ""
    fi
    
    # Open browser with localhost
    echo "🌐 Opening PC editor in browser..."
    if command -v open &> /dev/null; then
        # macOS
        open "http://localhost:3000"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "http://localhost:3000"
    elif command -v start &> /dev/null; then
        # Windows
        start "http://localhost:3000"
    fi
fi

echo "🔧 API Server:     https://localhost:3001"
echo ""
echo "💡 Tip: Use './start.sh --ngrok' for public internet access"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
