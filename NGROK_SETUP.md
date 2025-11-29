# ngrok Setup Guide

## Overview

The Blog Writing Assistant **automatically uses ngrok** for external access. When you start the server, it will:
- ✅ Automatically detect if PUBLIC_URL is not set
- ✅ Start ngrok tunnel on port 3001
- ✅ Configure QR codes with ngrok URL
- ✅ Work on any network (home, office, public WiFi)
- ✅ Accessible from anywhere via HTTPS

**No manual configuration needed!** Just install ngrok and start the server.

## Prerequisites

**Install ngrok** (required):
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

**Optional: Sign up for ngrok** (for persistent URLs):
- Visit https://dashboard.ngrok.com/signup
- Get your auth token
- Run: `ngrok config add-authtoken YOUR_TOKEN`

## Quick Start

### Automatic Mode (Default)

Simply start the server:

```bash
npm run dev:server
```

The server will:
1. ✅ Check if ngrok is installed
2. ✅ Automatically start ngrok tunnel
3. ✅ Retrieve the public URL
4. ✅ Configure QR codes
5. ✅ Display the ngrok URL in logs

**Example output:**
```
🚀 Starting Blog Writing Assistant Server
📡 PUBLIC_URL not set, starting ngrok automatically...
📡 Starting ngrok tunnel on port 3001...
✅ ngrok tunnel established: https://abc123.ngrok.io
📱 Server will use ngrok URL for QR codes and external access
```

### Manual Mode (Custom Configuration)

If you want to use your own ngrok configuration:

```bash
# Terminal 1: Start ngrok with custom settings
ngrok http 3001 --domain=your-custom-domain.ngrok.io

# Terminal 2: Start server with custom URL
PUBLIC_URL=https://your-custom-domain.ngrok.io npm run dev:server
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

### ngrok not installed

**Error message:**
```
❌ ngrok is not installed. Please install it:
   brew install ngrok  # macOS
   or visit: https://ngrok.com/download
```

**Solution:**
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### ngrok fails to start

**Possible causes:**
1. Port 3001 is already in use
2. ngrok API (port 4040) is blocked
3. Network firewall blocking ngrok

**Solutions:**
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill the process if needed
kill -9 <PID>

# Check ngrok logs
# The server will show detailed error messages
```

### QR code shows localhost instead of ngrok URL

**This should not happen with automatic mode**, but if it does:
1. Check server logs for ngrok startup errors
2. Verify ngrok is installed: `ngrok version`
3. Restart the server
4. Check if PUBLIC_URL is being set correctly

### ngrok URL changes on restart

**This is normal for free ngrok accounts:**
- Free ngrok URLs are temporary and change on restart
- Upgrade to ngrok paid plan for permanent URLs
- Or use a custom domain with paid plan

### Server takes long to start

**Normal behavior:**
- ngrok startup adds 2-3 seconds to server startup
- The server waits for ngrok API to be available
- You'll see progress messages in the logs

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

**Q: Do I need to manually start ngrok?**
A: No! The server automatically starts ngrok when PUBLIC_URL is not set.

**Q: Can I skip ngrok and use localhost only?**
A: Yes, set PUBLIC_URL to your local address:
```bash
PUBLIC_URL=https://localhost:3001 npm run dev:server
```

**Q: Is ngrok secure?**
A: Yes, ngrok uses HTTPS encryption. Combined with our QR code authentication, it's very secure.

**Q: Can multiple people use the same ngrok URL?**
A: No, each person should run their own instance with their own ngrok URL.

**Q: What happens if ngrok disconnects?**
A: The server will continue running, but external access will be lost. Restart the server to get a new ngrok URL.

**Q: Can I use this in production?**
A: ngrok is great for development. For production, deploy to a proper hosting service.

**Q: How do I use a persistent ngrok URL?**
A: Upgrade to ngrok paid plan, then:
```bash
# Start ngrok manually with your domain
ngrok http 3001 --domain=your-domain.ngrok.io

# Start server with custom URL
PUBLIC_URL=https://your-domain.ngrok.io npm run dev:server
```

**Q: Does ngrok work behind corporate firewalls?**
A: Usually yes, but some strict firewalls may block it. Check with your IT department.

## Support

- ngrok documentation: https://ngrok.com/docs
- ngrok dashboard: https://dashboard.ngrok.com
- Blog Writer issues: [GitHub Issues](your-repo-url)
