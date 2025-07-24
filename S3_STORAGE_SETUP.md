# AWS S3 Storage Support

This document explains how to configure and use AWS S3 storage in the Postiz application.

## Overview

The application now supports AWS S3 as a storage provider alongside the existing Local and Cloudflare R2 storage options. This allows you to store uploaded media files directly in your AWS S3 bucket.

## Configuration

To use S3 storage, you need to set up the following environment variables:

### Required Environment Variables

```bash
# Storage provider setting
STORAGE_PROVIDER=s3

# AWS S3 Configuration
AWS_REGION=us-east-1                          # Your AWS region
AWS_ACCESS_KEY_ID=your-access-key-id          # Your AWS access key ID
AWS_SECRET_ACCESS_KEY=your-secret-access-key  # Your AWS secret access key
AWS_S3_BUCKET=your-bucket-name                # Your S3 bucket name
AWS_S3_BUCKET_URL=https://your-bucket-name.s3.amazonaws.com  # Your S3 bucket URL

# Optional: Custom S3 endpoint (for S3-compatible services)
AWS_S3_ENDPOINT=https://custom-s3-endpoint.com
```

### AWS IAM Permissions

Your AWS IAM user/role needs the following permissions for the S3 bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:CreateMultipartUpload",
                "s3:CompleteMultipartUpload",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

## S3 Bucket Configuration

### Bucket Policy for Public Read Access

If you want uploaded files to be publicly accessible, configure your S3 bucket with the following bucket policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### CORS Configuration

For frontend uploads to work properly, configure CORS on your S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

## Features

### Supported Operations

- **File Upload**: Single file uploads via REST API
- **Multipart Upload**: Large file uploads using S3 multipart upload
- **File Deletion**: Remove files from S3 bucket
- **Simple Upload**: Upload files from URLs

### File Management

- Files are uploaded with random filenames to prevent conflicts
- Original file extensions are preserved
- Content-Type headers are properly set
- Public read access is enabled by default

## Usage

Once configured, the S3 storage provider will be used automatically for all file operations:

1. **Media uploads** through the frontend will use S3 multipart upload
2. **API uploads** will store files directly in your S3 bucket
3. **Generated images** from AI tools will be stored in S3
4. **File serving** will be done directly from S3 URLs

## Implementation Details

### Files Added/Modified

1. **`libraries/nestjs-libraries/src/upload/s3.storage.ts`**
   - Main S3 storage implementation
   - Implements the `IUploadProvider` interface
   - Handles simple uploads and file management

2. **`libraries/nestjs-libraries/src/upload/s3.uploader.ts`**
   - S3 multipart upload handler
   - Provides endpoints for multipart upload operations
   - Handles presigned URL generation

3. **`libraries/nestjs-libraries/src/upload/upload.factory.ts`**
   - Updated to include S3 storage option
   - Creates S3Storage instance when `STORAGE_PROVIDER=s3`

4. **`libraries/react-shared-libraries/src/helpers/uppy.upload.ts`**
   - Added S3 support for frontend uploads
   - Uses AWS S3 Multipart plugin for Uppy

5. **`apps/backend/src/api/routes/media.controller.ts`**
   - Updated to route to S3 uploader when using S3 storage

### Dependencies

The implementation uses the following AWS SDK packages that are already installed:

- `@aws-sdk/client-s3`: Main S3 client for AWS operations
- `@aws-sdk/s3-request-presigner`: For generating presigned URLs

## Troubleshooting

### Common Issues

1. **Access Denied Errors**: Check your AWS credentials and IAM permissions
2. **CORS Errors**: Verify your S3 bucket CORS configuration
3. **Upload Failures**: Ensure your bucket policy allows public uploads if needed
4. **File Not Found**: Check that `AWS_S3_BUCKET_URL` matches your actual bucket URL

### Testing

You can test the S3 integration by:

1. Setting the environment variables
2. Restarting the application
3. Uploading a file through the media interface
4. Verifying the file appears in your S3 bucket
5. Checking that the file is accessible via the S3 URL

## Migration

To migrate from another storage provider to S3:

1. Set up your S3 bucket and configure the environment variables
2. Change `STORAGE_PROVIDER` to `s3`
3. Restart the application
4. New uploads will use S3 (existing files will remain in the old storage)
5. Optionally migrate existing files to S3 manually
