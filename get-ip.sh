#!/bin/bash

# Get Mac's local IP address for mobile access

echo "🔍 Finding your Mac's IP address..."
echo ""

# Get the local IP address (works on macOS)
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$IP" ]; then
    echo "❌ Could not find IP address"
    echo "Please check your network connection"
    exit 1
fi

echo "✅ Your Mac's IP address: $IP"
echo ""
echo "📱 To access from iPhone:"
echo ""
echo "   PC Editor:      https://$IP:5173"
echo "   Mobile Upload:  https://$IP:5173/mobile"
echo ""
echo "⚠️  Note: You'll see a security warning on iPhone."
echo "   Tap 'Advanced' → 'Proceed' to continue."
echo ""
echo "💡 Make sure your iPhone and Mac are on the same WiFi network!"
echo ""
