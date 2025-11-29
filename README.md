# Blog Writing Assistant

A powerful blog writing tool that enables seamless image uploads from mobile devices to your PC editor, with real-time synchronization and AWS S3 integration.

## ✨ Features

- 📱 **Mobile Image Upload**: Take photos on your phone and instantly insert them into your blog posts
- 🖥️ **PC Markdown Editor**: Full-featured markdown editor with live preview and syntax highlighting
- 🔄 **Real-time Sync**: WebSocket-based synchronization between mobile and PC
- 🔐 **Secure Authentication**: QR code authentication with session tokens
- ☁️ **AWS S3 Integration**: Automatic image upload and management
- 🎨 **Image Compression**: Automatic optimization before upload
- 📝 **WordPress Compatible**: Export markdown compatible with WordPress Jetpack
- 💾 **Auto-save**: Local storage backup for unsaved changes
- 🌐 **Offline Support**: Continue working even without internet connection
- 🔒 **Secure Storage**: Credentials stored in OS keychain (macOS Keychain, Windows Credential Manager)

## 🚀 Quick Start

### Option 1: Use the Startup Script (Easiest)

```bash
./start.sh
```

This will:
1. Install dependencies (if needed)
2. Build the project
3. Start both backend and frontend servers
4. Open the application automatically

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```

### Access the Application

- **PC Editor**: https://localhost:5173
- **Mobile Upload**: https://localhost:5173/mobile
- **API Server**: https://localhost:3001

**Note**: You'll see a security warning for self-signed certificates. Click "Advanced" → "Proceed" to continue.

## 📋 Prerequisites

- Node.js v18 or higher
- npm or yarn
- **ngrok** (automatically used for external access)
  - Install: `brew install ngrok` (macOS)
  - Or visit: https://ngrok.com/download
- **AWS S3 account** (required for image storage)
  - S3 Bucket (you need to create this first)
  - IAM User with Access Keys
  - Required permissions: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`

**⚠️ IMPORTANT**: You must set up AWS S3 before using the application. See `AWS_SETUP_GUIDE.md` for detailed instructions.

## 🔧 Initial Setup

### Step 1: Set Up AWS S3 (Required First!)

**Before starting the application**, you need to:
1. Create an AWS S3 bucket
2. Create an IAM user with S3 access
3. Generate access keys

📖 **See `AWS_SETUP_GUIDE.md` for complete step-by-step instructions**

You'll need:
- ✅ S3 Bucket Name
- ✅ AWS Region (e.g., `us-east-1`)
- ✅ Access Key ID
- ✅ Secret Access Key

### Step 2: Start the Application

```bash
npm run dev:server
```

**🎉 Automatic ngrok Setup**

The server automatically starts ngrok for external access when `PUBLIC_URL` is not set:
- ✅ No manual configuration needed
- ✅ Works on any network (home, office, public WiFi)
- ✅ Accessible from anywhere via HTTPS
- ✅ QR codes automatically use ngrok URL

**Optional: Use Custom PUBLIC_URL**

If you want to use your own ngrok configuration or alternative tunneling service:

```bash
PUBLIC_URL=https://your-custom-url.ngrok.io npm run dev:server
```

> 💡 **Note**: ngrok must be installed first. If not installed, you'll see clear installation instructions.

### Step 3: Configure AWS Credentials

- On first launch, you'll see a configuration modal
- Enter your AWS credentials from Step 1
- Click "Test Connection" to verify
- Click "Save" to store securely in OS keychain

### Step 4: Connect Mobile Device

- A QR code will appear on the PC editor
- Open `https://localhost:5173/mobile` on your phone
- Scan the QR code to authenticate
- Start uploading images!

## 📖 Usage Guide

### Writing on PC

1. **Create Article**: Click "New Article" or open existing file
2. **Write**: Use markdown syntax in the left editor
3. **Preview**: See live preview on the right
4. **Save**: Auto-saves or use Ctrl+S (Cmd+S on Mac)
5. **Export**: Click "Copy for WordPress" when ready

### Uploading from Mobile

1. **Select Article**: Choose which article tab to insert images into
2. **Take/Select Photo**: Use camera or photo library
3. **Upload**: Image automatically uploads and inserts into article
4. **Done**: Image appears in PC editor instantly

### Managing Images

- **View Gallery**: See all uploaded images
- **Copy URL**: Click to copy image URL
- **Delete**: Remove images from S3
- **Preview**: View full-size images

## 🏗️ Project Structure

```
blog-writer/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── dist/              # Built frontend
├── server/                # Backend Express server
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── utils/             # Server utilities
│   ├── __tests__/         # Unit tests
│   └── dist/              # Built backend
├── tests/                 # Integration & E2E tests
├── .kiro/specs/           # Project specifications
│   ├── requirements.md    # Feature requirements
│   ├── design.md          # System design
│   └── tasks.md           # Implementation tasks
├── QUICKSTART.md          # Detailed setup guide
└── README.md              # This file
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- server/__tests__/AuthService.test.ts

# Run with coverage
npm test -- --coverage

# Run integration tests
npm test -- tests/integration.test.ts
```

**Test Coverage**: 77/78 tests passing (98.7%)

## 🔒 Security Features

- ✅ HTTPS-only communication
- ✅ CORS restricted to localhost
- ✅ QR tokens expire after 5 minutes
- ✅ Session tokens expire after 1 hour
- ✅ Rate limiting on sensitive endpoints
- ✅ Credentials stored in OS keychain (never in files)
- ✅ Input validation and sanitization
- ✅ WebSocket authentication required

## 🛠️ Development

### Build for Production

```bash
npm run build
```

Output:
- `dist/server/` - Compiled backend
- `dist/client/` - Compiled frontend

### Run Production Build

```bash
node dist/server/index.js
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format
```

## 📱 Mobile Access

### Same Network

If your phone and PC are on the same network:

1. Find your PC's IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Access from mobile: `https://<YOUR_IP>:5173/mobile`

### Different Network

The server automatically uses ngrok for remote access, so you can access from anywhere:
- ✅ Automatic HTTPS tunnel
- ✅ No router configuration needed
- ✅ Works behind firewalls
- ✅ QR codes include ngrok URL

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3001  # or :5173

# Kill the process
kill -9 <PID>
```

### AWS Connection Failed

1. Verify credentials are correct
2. Check S3 bucket exists and is accessible
3. Verify IAM permissions
4. Check region matches bucket region

### QR Code Won't Scan

1. Generate a new QR code (they expire after 5 minutes)
2. Increase screen brightness
3. Ensure camera has permission
4. Try a different QR code scanner app

### ngrok Not Starting

1. Check if ngrok is installed: `ngrok version`
2. Install if missing: `brew install ngrok` (macOS)
3. Check if port 3001 is available
4. Look for error messages in server logs

### Images Not Uploading

1. Check AWS credentials are configured
2. Verify S3 bucket permissions
3. Check network connection
4. Look for errors in browser console

### AWS Credentials Won't Save

If you get an error when trying to save AWS credentials:

1. **Rebuild native modules** (keytar):
   ```bash
   npm rebuild keytar
   ```

2. **Check keytar installation**:
   ```bash
   node -e "const keytar = require('keytar'); console.log('keytar OK');"
   ```

3. **macOS Keychain Access**:
   - Open "Keychain Access" app
   - Check if you have permission to add items
   - Look for "blog-writing-assistant" entries

4. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **Check server logs** for detailed error messages:
   - Look for "Failed to save credentials" messages
   - Check the error details in the console

6. **Alternative: Use environment variables** (temporary workaround):
   ```bash
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   export AWS_REGION=us-east-1
   export AWS_BUCKET_NAME=your-bucket
   npm run dev:server
   ```

## 📚 Documentation

- **Quick Start**: See `QUICKSTART.md` for detailed setup instructions
- **Requirements**: See `.kiro/specs/blog-writing-assistant/requirements.md`
- **Design**: See `.kiro/specs/blog-writing-assistant/design.md`
- **Tasks**: See `.kiro/specs/blog-writing-assistant/tasks.md`
- **Tests**: See `tests/README.md`

## 🎯 Roadmap

Completed:
- ✅ Core backend infrastructure
- ✅ WebSocket real-time communication
- ✅ Frontend PC editor
- ✅ Mobile upload interface
- ✅ AWS S3 integration
- ✅ QR code authentication
- ✅ Image compression
- ✅ Comprehensive testing

Future enhancements:
- [ ] WordPress direct publishing API
- [ ] Multiple user support
- [ ] Cloud sync for articles
- [ ] Image editing tools
- [ ] Collaborative editing
- [ ] Plugin system

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- React + Vite
- Express + Socket.IO
- AWS SDK
- CodeMirror
- Marked (markdown parser)
- QRCode generator
- And many other great open source libraries

---

**Ready to start blogging?** Run `./start.sh` and open https://localhost:5173 🚀
