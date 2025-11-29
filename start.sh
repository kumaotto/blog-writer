#!/bin/bash

# Blog Writing Assistant - Startup Script
# This script starts both the backend server and frontend client

echo "🚀 Starting Blog Writing Assistant..."
echo ""

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
    kill $SERVER_PID $CLIENT_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT TERM

# Start backend server in background
echo "🖥️  Starting backend server on https://localhost:3001..."
npm run dev:server &
SERVER_PID=$!

# Wait a bit for server to start
sleep 3

# Start frontend client in background
echo "🌐 Starting frontend client on https://localhost:5173..."
npm run dev:client &
CLIENT_PID=$!

echo ""
echo "✅ Application is running!"
echo ""
echo "📱 PC Editor:      https://localhost:5173"
echo "📱 Mobile Upload:  https://localhost:5173/mobile"
echo "🔧 API Server:     https://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
