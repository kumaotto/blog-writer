# Setup Checklist

Follow this checklist to get your Blog Writing Assistant up and running.

## ☑️ Before You Start

- [ ] I have Node.js v18+ installed (`node --version`)
- [ ] I have npm installed (`npm --version`)
- [ ] I have an AWS account (or I'm ready to create one)

## 📦 Step 1: AWS S3 Setup (REQUIRED)

**Time needed**: ~10 minutes

- [ ] Created AWS account (if needed)
- [ ] Logged into AWS Console
- [ ] Created S3 bucket
  - [ ] Chose unique bucket name (e.g., `my-blog-images-2024`)
  - [ ] Selected region (e.g., `us-east-1`)
  - [ ] Disabled "Block all public access"
  - [ ] Created bucket successfully
- [ ] Created IAM user
  - [ ] User name: `blog-assistant-user`
  - [ ] Attached `AmazonS3FullAccess` policy (or custom policy)
  - [ ] Created access keys
  - [ ] **Saved Access Key ID** (starts with `AKIA...`)
  - [ ] **Saved Secret Access Key** (long random string)
- [ ] Configured bucket policy (for public image access)
- [ ] Configured CORS (optional but recommended)

**📖 Need help?** See `AWS_SETUP_GUIDE.md` for detailed instructions.

## 🚀 Step 2: Install & Start Application

**Time needed**: ~2 minutes

- [ ] Cloned/downloaded the project
- [ ] Opened terminal in project directory
- [ ] Ran `npm install` (if not already done)
- [ ] Started application with `./start.sh` (or manual start)
- [ ] Saw "Application is running!" message
- [ ] Opened browser to `https://localhost:5173`
- [ ] Clicked "Advanced" → "Proceed" on security warning

## ⚙️ Step 3: Configure Application

**Time needed**: ~2 minutes

- [ ] Configuration modal appeared on first launch
- [ ] Entered AWS credentials:
  - [ ] Access Key ID (from Step 1)
  - [ ] Secret Access Key (from Step 1)
  - [ ] Region (from Step 1, e.g., `us-east-1`)
  - [ ] Bucket Name (from Step 1)
- [ ] Clicked "Test Connection"
- [ ] Saw "Connection successful" message
- [ ] Clicked "Save"
- [ ] Configuration modal closed

## 📱 Step 4: Connect Mobile Device

**Time needed**: ~1 minute

- [ ] QR code appeared on PC screen
- [ ] Opened phone browser
- [ ] Navigated to `https://localhost:5173/mobile`
  - Or `https://<YOUR_PC_IP>:5173/mobile` if on different network
- [ ] Clicked "Advanced" → "Proceed" on security warning
- [ ] Scanned QR code with phone camera
- [ ] Saw "Connected" message
- [ ] Can see article list on phone

## ✅ Step 5: Test Everything Works

**Time needed**: ~3 minutes

### Test PC Editor
- [ ] Created new article or opened existing file
- [ ] Typed some markdown text
- [ ] Saw live preview on right side
- [ ] Saved file (Ctrl+S or Cmd+S)
- [ ] File saved successfully

### Test Mobile Upload
- [ ] Selected article tab on phone
- [ ] Took or selected a photo
- [ ] Photo uploaded successfully
- [ ] Image appeared in PC editor
- [ ] Image URL is from S3 bucket

### Test Image Gallery
- [ ] Clicked "Gallery" tab on PC
- [ ] Saw uploaded images
- [ ] Clicked image to preview
- [ ] Copied image URL
- [ ] Deleted test image (optional)

## 🎉 You're Done!

If all checkboxes are checked, you're ready to start blogging!

## 🐛 Troubleshooting

If something didn't work:

### AWS Connection Failed
- [ ] Double-check credentials are correct
- [ ] Verify bucket name matches exactly
- [ ] Ensure region is correct
- [ ] Check IAM user has S3 permissions
- [ ] See `AWS_SETUP_GUIDE.md` troubleshooting section

### Can't Connect from Mobile
- [ ] Both devices on same network
- [ ] Used correct IP address
- [ ] Accepted security certificate on phone
- [ ] QR code not expired (regenerate if needed)

### Port Already in Use
- [ ] Check what's using port: `lsof -i :3001` or `lsof -i :5173`
- [ ] Kill process: `kill -9 <PID>`
- [ ] Restart application

### Images Not Uploading
- [ ] AWS credentials configured correctly
- [ ] S3 bucket policy allows uploads
- [ ] Network connection working
- [ ] Check browser console for errors

## 📚 Next Steps

Now that everything is working:

1. **Write your first blog post**
   - Use markdown syntax
   - Upload images from phone
   - See live preview

2. **Explore features**
   - Multiple article tabs
   - Image gallery
   - WordPress export
   - Auto-save

3. **Read documentation**
   - `README.md` - Overview
   - `QUICKSTART.md` - Detailed guide
   - `AWS_SETUP_GUIDE.md` - AWS help

## 💡 Tips

- **QR codes expire after 5 minutes** - regenerate if needed
- **Session tokens last 1 hour** - you'll need to re-authenticate
- **Images are auto-compressed** - saves bandwidth and storage
- **Changes auto-save** - but manual save is recommended
- **Works offline** - local storage backup for unsaved changes

---

**Happy blogging!** 📝✨

Need help? Check the troubleshooting sections in:
- `README.md`
- `QUICKSTART.md`
- `AWS_SETUP_GUIDE.md`
