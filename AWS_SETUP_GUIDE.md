# AWS S3 Setup Guide

Before using the Blog Writing Assistant, you need to set up an AWS S3 bucket for image storage.

## Step 1: Create AWS Account

If you don't have an AWS account:
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the registration process

## Step 2: Create S3 Bucket

### Using AWS Console (Recommended for beginners)

1. **Sign in to AWS Console**
   - Go to https://console.aws.amazon.com
   - Sign in with your credentials

2. **Navigate to S3**
   - Search for "S3" in the top search bar
   - Click on "S3" service

3. **Create Bucket**
   - Click "Create bucket" button
   - Enter bucket details:
     - **Bucket name**: Choose a unique name (e.g., `my-blog-images-2024`)
       - Must be globally unique
       - Use lowercase letters, numbers, and hyphens only
       - Example: `kumao-blog-images`
     - **AWS Region**: Choose closest to you (e.g., `us-east-1`, `ap-northeast-1`)
   
4. **Configure Bucket Settings**
   - **Object Ownership**: Keep default (ACLs disabled)
   - **Block Public Access**: 
     - ⚠️ **UNCHECK** "Block all public access"
     - Check the acknowledgment box
     - This allows your blog images to be publicly accessible
   - **Bucket Versioning**: Disabled (optional)
   - **Encryption**: Keep default (SSE-S3)
   - **Object Lock**: Disabled

5. **Create Bucket**
   - Click "Create bucket" at the bottom
   - Your bucket is now created!

### Using AWS CLI (Advanced)

```bash
# Set your bucket name and region
BUCKET_NAME="my-blog-images-2024"
REGION="us-east-1"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Make bucket publicly readable
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
    }
  ]
}'
```

## Step 3: Create IAM User

You need an IAM user with programmatic access to use the S3 bucket.

1. **Navigate to IAM**
   - Search for "IAM" in AWS Console
   - Click on "IAM" service

2. **Create User**
   - Click "Users" in left sidebar
   - Click "Create user"
   - **User name**: `blog-assistant-user`
   - Click "Next"

3. **Set Permissions**
   - Select "Attach policies directly"
   - Search for and select: **AmazonS3FullAccess**
     - Or create a custom policy (see below for minimal permissions)
   - Click "Next"

4. **Review and Create**
   - Review the settings
   - Click "Create user"

5. **Create Access Key**
   - Click on the newly created user
   - Go to "Security credentials" tab
   - Scroll to "Access keys"
   - Click "Create access key"
   - Select "Application running outside AWS"
   - Click "Next"
   - Add description: "Blog Writing Assistant"
   - Click "Create access key"
   - **⚠️ IMPORTANT**: Copy both:
     - **Access Key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
     - **Secret Access Key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   - **Save these securely!** You won't be able to see the secret key again

### Custom IAM Policy (Minimal Permissions)

For better security, use this custom policy instead of `AmazonS3FullAccess`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

## Step 4: Configure CORS (Optional but Recommended)

To allow uploads from your browser:

1. Go to your S3 bucket
2. Click "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Click "Edit"
5. Paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://localhost:*", "https://127.0.0.1:*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

6. Click "Save changes"

## Step 5: Make Bucket Public (For Image Access)

1. Go to your S3 bucket
2. Click "Permissions" tab
3. Scroll to "Bucket policy"
4. Click "Edit"
5. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

6. Click "Save changes"

## Step 6: Enter Credentials in Application

Now you have everything you need:

1. **Access Key ID**: From Step 3
2. **Secret Access Key**: From Step 3
3. **Region**: From Step 2 (e.g., `us-east-1`)
4. **Bucket Name**: From Step 2 (e.g., `my-blog-images-2024`)

Enter these in the application's configuration modal on first launch.

## Verification Checklist

Before using the application, verify:

- ✅ S3 bucket is created
- ✅ Bucket is in the correct region
- ✅ IAM user is created with S3 permissions
- ✅ Access keys are generated and saved
- ✅ Bucket policy allows public read access
- ✅ CORS is configured (optional)
- ✅ Block public access is disabled

## Cost Estimation

AWS S3 pricing (as of 2024):

- **Storage**: ~$0.023 per GB/month
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer out**: First 100 GB/month free, then $0.09/GB

**Example**: 
- 1,000 images (average 500 KB each) = 500 MB storage
- Monthly cost: ~$0.01 storage + minimal request costs
- **Total: Less than $1/month for typical blog usage**

## Security Best Practices

1. **Never commit credentials to git**
   - The app stores them in OS keychain
   - Never put them in code or config files

2. **Use minimal IAM permissions**
   - Only grant S3 access
   - Restrict to specific bucket

3. **Enable MFA for AWS account**
   - Protect your AWS console access

4. **Rotate access keys regularly**
   - Change keys every 90 days
   - Delete unused keys

5. **Monitor usage**
   - Check AWS billing dashboard
   - Set up billing alerts

## Troubleshooting

### "Access Denied" Error

- Check IAM user has correct permissions
- Verify bucket policy allows access
- Ensure access keys are correct

### "Bucket Not Found" Error

- Verify bucket name is correct
- Check you're using the correct region
- Ensure bucket exists in your AWS account

### Images Not Loading in Blog

- Check bucket policy allows public read
- Verify "Block public access" is disabled
- Test image URL directly in browser

### CORS Errors

- Add CORS configuration to bucket
- Include your localhost URLs in AllowedOrigins
- Clear browser cache and retry

## Alternative: Use AWS Free Tier

AWS offers a free tier that includes:
- 5 GB of S3 storage
- 20,000 GET requests
- 2,000 PUT requests
- Valid for 12 months

Perfect for testing and small blogs!

## Need Help?

- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- AWS IAM Documentation: https://docs.aws.amazon.com/iam/
- AWS Support: https://console.aws.amazon.com/support/

---

**Ready?** Once you have your credentials, start the application and enter them in the configuration modal! 🚀
