# ngrok Setup Guide

## Overview

ngrok allows you to expose your local blog writing assistant to the internet securely. This is perfect for:
- ✅ Using on large WiFi networks (cafes, airports, offices with 100k+ users)
- ✅ Accessing from anywhere (not just local network)
- ✅ Avoiding IP address conflicts
- ✅ Each user gets a unique URL

## Prerequisites

1. **Install ngrok**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Sign up for ngrok** (optional but recommended)
   - Visit https://dashboard.ngrok.com/signup
   - Get your auth token
   - Run: `ngrok config add-authtoken YOUR_TOKEN`

## Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
./start-ngrok.sh
```

This script will:
1. Build the application
2. Start the server
3. Create an ngrok tunnel
4. Display your public URL
5. Automatically configure the QR code

### Option 2: Manual Setup

1. **Start the application**
   ```bash
   npm run build
   node dist/server/server.js
   ```

2. **In a new terminal, start ngrok**
   ```bash
   ngrok http 3000
   ```

3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

4. **Restart the server with PUBLIC_URL**
   ```bash
   PUBLIC_URL=https://abc123.ngrok.io node dist/server/server.js
   ```

## Usage

1. **Open the PC editor**
   - Visit your ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Configure AWS credentials if needed

2. **Scan QR code on mobile**
   - The QR code will automatically use your ngrok URL
   - Your phone can be on any network (doesn't need same WiFi)

3. **Upload images**
   - Select an article
   - Take/upload photos
   - Images are uploaded to your S3 bucket

## Security

✅ **Safe for public use:**
- QR tokens expire after 5 minutes
- Session tokens expire after 1 hour
- Each user has a unique ngrok URL
- Authentication required for all operations

⚠️ **Important notes:**
- Your ngrok URL is public (anyone with the URL can access)
- Use QR code authentication to keep your session secure
- Don't share your QR code or session token
- Free ngrok URLs change on restart

## Troubleshooting

### ngrok not found
```bash
# Install ngrok
brew install ngrok

# Or download from https://ngrok.com/download
```

### Connection refused
- Make sure the server is running on port 3000
- Check `ngrok http 3000` is pointing to the correct port

### QR code shows localhost
- Make sure PUBLIC_URL environment variable is set
- Restart the server after setting PUBLIC_URL

### ngrok URL changes
- Free ngrok URLs are temporary
- Upgrade to ngrok paid plan for permanent URLs
- Or use a custom domain

## Advanced Configuration

### Custom Domain

If you have an ngrok paid plan:

```bash
ngrok http 3000 --domain=your-custom-domain.ngrok.io
```

Then set:
```bash
PUBLIC_URL=https://your-custom-domain.ngrok.io node dist/server/server.js
```

### Environment Variables

Create a `.env` file:
```bash
PUBLIC_URL=https://your-ngrok-url.ngrok.io
PORT=3000
```

### Production Deployment

For production, consider:
- Deploy to a cloud service (AWS, Heroku, Vercel)
- Use a real domain name
- Set up SSL certificates
- Configure proper CORS policies

## Comparison: Local Network vs ngrok

| Feature | Local Network | ngrok |
|---------|--------------|-------|
| Setup | Easy | Easy |
| Same WiFi required | Yes | No |
| Works on large networks | ❌ No | ✅ Yes |
| IP conflicts | ⚠️ Possible | ✅ None |
| Access from anywhere | ❌ No | ✅ Yes |
| Cost | Free | Free (with limits) |
| URL stability | Stable | Changes on restart |

## FAQ

**Q: Do I need ngrok for local use?**
A: No, if you're on a small home network, use `./start.sh` instead.

**Q: Is ngrok secure?**
A: Yes, ngrok uses HTTPS encryption. Combined with our QR code authentication, it's very secure.

**Q: Can multiple people use the same ngrok URL?**
A: No, each person should run their own instance with their own ngrok URL.

**Q: What happens if ngrok disconnects?**
A: You'll need to restart ngrok and update the PUBLIC_URL.

**Q: Can I use this in production?**
A: ngrok is great for development. For production, deploy to a proper hosting service.

## Support

- ngrok documentation: https://ngrok.com/docs
- ngrok dashboard: https://dashboard.ngrok.com
- Blog Writer issues: [GitHub Issues](your-repo-url)
