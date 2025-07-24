# Deploying Postiz with S3 Storage on Coolify

This guide explains how to deploy your S3-enabled Postiz branch on Coolify.

## Prerequisites

1. **Coolify instance** running and accessible
2. **Hetzner S3 bucket** with CORS configured
3. **Domain name** pointed to your Coolify instance

## Deployment Steps

### 1. Create the Application in Coolify

1. Go to your Coolify dashboard
2. Create a new **Application**
3. Choose **Git Repository** as source
4. Connect your repository: `https://github.com/toni-minge/postiz-app`
5. Select branch: `feat/s3-storage`
6. Set build pack to **Docker**
7. Use Dockerfile: `Dockerfile.production`

### 2. Configure Environment Variables

In Coolify's application settings, add these environment variables:

#### Required Database & Redis
```bash
# These will be auto-filled if you use Coolify's database services
DATABASE_URL="postgresql://username:password@postgres-host:5432/database-name"
REDIS_URL="redis://redis-host:6379"
```

#### Application Settings
```bash
JWT_SECRET="your-super-secret-jwt-key-for-production-make-it-long-and-random"
FRONTEND_URL="https://your-domain.com"
NEXT_PUBLIC_BACKEND_URL="https://your-domain.com" 
BACKEND_INTERNAL_URL="http://localhost:3000"
MAIN_URL="https://your-domain.com"
IS_GENERAL="true"
DISABLE_REGISTRATION="false"
NOT_SECURED="false"
```

#### S3 Storage Configuration
```bash
STORAGE_PROVIDER="s3"
AWS_REGION="hel1"
AWS_ACCESS_KEY_ID="your-hetzner-access-key"
AWS_SECRET_ACCESS_KEY="your-hetzner-secret-key"
AWS_S3_BUCKET="your-production-bucket"
AWS_S3_BUCKET_URL="https://your-production-bucket.hel1.your-objectstorage.com"
AWS_S3_ENDPOINT="https://hel1.your-objectstorage.com"
```

#### Email (Optional - for user verification)
```bash
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM_ADDRESS="noreply@your-domain.com"
EMAIL_FROM_NAME="Your App Name"
```

### 3. Configure Database & Redis Services

#### Option A: Use Coolify's Built-in Services
1. Create a **PostgreSQL** service in Coolify
2. Create a **Redis** service in Coolify  
3. Coolify will auto-generate the connection URLs

#### Option B: External Services
Use your own PostgreSQL and Redis instances, and set the URLs manually.

### 4. Configure Domain & SSL

1. In application settings, set your **Domain**
2. Enable **SSL** (Let's Encrypt)
3. Coolify will handle the SSL certificate automatically

### 5. Build & Deploy

1. Click **Deploy** in Coolify
2. Monitor the build logs
3. The application will be available at your domain after successful deployment

## Post-Deployment

### Verify S3 Integration
1. Log in to your deployed Postiz instance
2. Try uploading a media file
3. Verify files appear in your Hetzner S3 bucket

### Database Initialization
The application will automatically:
- Run Prisma migrations
- Set up the database schema
- Be ready for user registration

## Troubleshooting

### Common Issues

1. **Build fails**: Check that all environment variables are set correctly
2. **Database connection errors**: Verify DATABASE_URL format
3. **S3 upload errors**: Check CORS configuration on your Hetzner bucket
4. **Login issues**: Verify JWT_SECRET is set and FRONTEND_URL matches your domain

### S3 CORS Configuration
Your Hetzner S3 bucket should have CORS configured with:
```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigins>https://your-domain.com</AllowedOrigins>
    <AllowedMethods>GET</AllowedMethods>
    <AllowedMethods>PUT</AllowedMethods>
    <AllowedMethods>POST</AllowedMethods>
    <AllowedMethods>DELETE</AllowedMethods>
    <AllowedMethods>HEAD</AllowedMethods>
    <AllowedHeaders>*</AllowedHeaders>
  </CORSRule>
</CORSConfiguration>
```

## Architecture

Your deployed application will have:
- **Frontend**: Next.js app serving the UI
- **Backend**: NestJS API handling requests
- **Workers**: Background job processing  
- **Cron**: Scheduled task execution
- **Database**: PostgreSQL for data storage
- **Redis**: Caching and job queues
- **S3**: Hetzner Object Storage for media files

All services run in a single Docker container managed by PM2 and supervised by Caddy for reverse proxy.
