# Blog Writing Assistant - Quick Start Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- **AWS S3 account (REQUIRED)**
  - You must create an S3 bucket before using the app
  - See `AWS_SETUP_GUIDE.md` for detailed setup instructions

## Installation

Already done! Dependencies are installed.

## Running the Application

### Development Mode (Recommended)

Open **two terminal windows**:

#### Terminal 1: Start Backend Server
```bash
npm run dev:server
```

The server will start on `https://localhost:3001`

#### Terminal 2: Start Frontend Client
```bash
npm run dev:client
```

The client will start on `https://localhost:5173` (or another port if 5173 is busy)

### Access the Application

**Local Network Mode (Default)**
1. **PC Editor**: Open `https://localhost:5173` in your browser
2. **Mobile Upload**: Open `https://localhost:5173/mobile` on your phone

**Public Internet Mode (with ngrok)**
```bash
./start.sh --ngrok
```
- Access from anywhere using the displayed ngrok URL
- Perfect for large public WiFi networks
- See `NGROK_SETUP.md` for details

**Note**: You'll see a security warning because we use self-signed certificates. Click "Advanced" and "Proceed" to continue.

## First Time Setup

### Step 0: Set Up AWS S3 (Do This First!)

**⚠️ BEFORE starting the application**, you MUST:

1. Create an AWS S3 bucket
2. Create an IAM user with S3 permissions
3. Generate access keys

📖 **See `AWS_SETUP_GUIDE.md` for complete instructions**

This takes about 10 minutes if you're new to AWS.

### Step 1: Configure AWS Credentials

When you first open the app, you'll see a configuration modal:

1. Enter your AWS credentials:
   - Access Key ID
   - Secret Access Key
   - Region (e.g., `us-east-1`)
   - S3 Bucket Name

2. Click "Test Connection" to verify your credentials
3. Click "Save" to store them securely in your OS keychain

**Security Note**: Credentials are stored in:
- macOS: Keychain
- Windows: Credential Manager
- Linux: libsecret

### Step 2: Connect Mobile Device

1. On your PC, you'll see a QR code in the editor
2. Open `https://localhost:5173/mobile` on your phone
3. Scan the QR code to authenticate
4. Your phone is now connected!

**Note**: Make sure your phone and PC are on the same network.

## Using the Application

### PC Editor

1. **Create/Open Article**: Click "New Article" or open an existing markdown file
2. **Write Content**: Use the markdown editor on the left
3. **Preview**: See live preview on the right
4. **Save**: Click "Save" or use Ctrl+S (Cmd+S on Mac)

### Mobile Upload

1. **Select Article Tab**: Choose which article to insert images into
2. **Take/Select Photo**: Use camera or photo library
3. **Upload**: Image is automatically uploaded to S3 and inserted into the article

### Image Gallery

- View all uploaded images
- Copy image URLs
- Delete images
- Preview full-size images

### WordPress Export

1. Write your article in markdown
2. Click "Copy for WordPress"
3. Paste into WordPress (Jetpack Markdown compatible)

## Features

✅ **Real-time Sync**: Changes sync instantly between PC and mobile via WebSocket
✅ **Secure Authentication**: QR code authentication with session tokens
✅ **Image Compression**: Automatic image optimization before upload
✅ **Offline Support**: Local storage backup for unsaved changes
✅ **Multiple Articles**: Work on multiple articles with tabs
✅ **Markdown Preview**: Live preview with syntax highlighting
✅ **Network Status**: Visual indicator for connection status

## Troubleshooting

### Server Won't Start

```bash
# Check if port 3001 is already in use
lsof -i :3001

# Kill the process if needed
kill -9 <PID>
```

### Client Won't Start

```bash
# Check if port 5173 is already in use
lsof -i :5173

# Vite will automatically use another port if 5173 is busy
```

### Can't Connect from Mobile

1. Make sure both devices are on the same network
2. Find your PC's local IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```
3. Use `https://<YOUR_IP>:5173/mobile` instead of localhost

### AWS S3 Connection Failed

1. Verify your AWS credentials are correct
2. Check that your S3 bucket exists
3. Ensure your IAM user has these permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`
   - `s3:ListBucket`

### QR Code Won't Scan

1. QR codes expire after 5 minutes - generate a new one
2. Make sure your phone camera has permission
3. Try increasing screen brightness

## Testing

Run all tests:
```bash
npm test
```

Run specific test suite:
```bash
npm test -- server/__tests__/AuthService.test.ts
```

Run with coverage:
```bash
npm test -- --coverage
```

## Building for Production

```bash
npm run build
```

This creates:
- `dist/server/` - Compiled backend
- `dist/client/` - Compiled frontend

To run production build:
```bash
node dist/server/index.js
```

## Configuration

### Change Server Port

Edit `server/index.ts`:
```typescript
const port = process.env.PORT || 3001; // Change 3001 to your port
```

### Change Client Port

Edit `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5173, // Change to your port
  },
});
```

## Security Notes

- ✅ HTTPS only (self-signed cert in development)
- ✅ CORS restricted to localhost
- ✅ Session tokens expire after 1 hour
- ✅ QR tokens expire after 5 minutes
- ✅ Rate limiting on sensitive endpoints
- ✅ Credentials stored in OS keychain (never in files)

## Support

For issues or questions:
1. Check the test files for usage examples
2. Review the design document: `.kiro/specs/blog-writing-assistant/design.md`
3. Check requirements: `.kiro/specs/blog-writing-assistant/requirements.md`

## Next Steps

- Configure your AWS S3 bucket
- Start writing your first blog post
- Upload images from your phone
- Export to WordPress

Happy blogging! 📝✨
