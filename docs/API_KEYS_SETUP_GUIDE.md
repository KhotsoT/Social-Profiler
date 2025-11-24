# API Keys Setup Guide - Social Profiler

Complete step-by-step guide to obtain API keys and access tokens for all supported social media platforms.

---

## 📋 Overview

This guide covers obtaining API credentials for:
- Instagram (Graph API)
- TikTok (Open API)
- Twitter/X (API v2)
- Facebook (Graph API)
- YouTube (Data API v3)
- LinkedIn (API v2)

**Note:** Some platforms require app review and approval before production use.

---

## 1. Instagram Graph API

### Requirements
- Facebook Business Account
- Instagram Business or Creator Account
- Facebook App

### Steps

1. **Create Facebook App**
   - Go to https://developers.facebook.com/
   - Click "My Apps" → "Create App"
   - Select "Business" as app type
   - Fill in app details and create

2. **Select Use Cases (NEW PROCESS)**
   - Meta now requires you to select specific use cases during app creation
   - You'll see a list of use cases to choose from:
     - **For Instagram/Content Management**: Select "Content management" use cases
     - **For Ads**: Select "Ads and monetization" use cases
     - **For Login**: Select "Authenticate and request data from users with Facebook Login"
   - Check the boxes for relevant use cases
   - Click "Next" to continue

3. **Add Instagram Product**
   - After selecting use cases, you'll configure products
   - In your app dashboard, click "Add Product" or find "Instagram"
   - Choose "Instagram Graph API" or "Instagram Basic Display API"

3. **Get Access Token**
   - Go to "Tools" → "Graph API Explorer"
   - Select your app from dropdown
   - Add permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
   - Click "Generate Access Token"
   - Copy the token (this is a short-lived token)

4. **Get Long-Lived Token**
   - Use Graph API Explorer or make API call:
   ```
   GET https://graph.facebook.com/v18.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={app-id}&
     client_secret={app-secret}&
     fb_exchange_token={short-lived-token}
   ```

5. **Add to .env**
   ```bash
   INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
   INSTAGRAM_APP_ID=your_app_id_here
   INSTAGRAM_APP_SECRET=your_app_secret_here
   ```

### Important Notes
- **NEW (2024/2025)**: Meta now requires selecting specific use cases during app creation
- Choose "Content management" use cases for Instagram follower/analytics data
- Tokens expire after 60 days (need refresh mechanism)
- Requires app review for production use
- Instagram Basic Display API is simpler but has limitations

### Documentation
- https://developers.facebook.com/docs/instagram-api

---

## 2. TikTok Open API

### Requirements
- TikTok Developer Account
- TikTok App (requires approval)

### Steps

1. **Register as Developer**
   - Go to https://developers.tiktok.com/
   - Sign up/Login with TikTok account
   - Complete developer registration

2. **Create App**
   - Click "Create App"
   - Fill in app information:
     - App Name
     - App Description
     - Category
     - Website URL
   - Submit for review (can take several days)

3. **Get Client Key and Secret**
   - Once approved, go to your app dashboard
   - Find "Client Key" and "Client Secret"
   - Copy both values

4. **Get Access Token**
   - Use OAuth 2.0 flow:
   ```
   POST https://open.tiktokapis.com/v2/oauth/token/
   {
     "client_key": "your_client_key",
     "client_secret": "your_client_secret",
     "grant_type": "client_credentials"
   }
   ```

5. **Add to .env**
   ```bash
   TIKTOK_ACCESS_TOKEN=your_access_token_here
   TIKTOK_CLIENT_KEY=your_client_key_here
   TIKTOK_CLIENT_SECRET=your_client_secret_here
   ```

### Important Notes
- App approval required (can take 5-7 business days)
- Access tokens expire (implement refresh)
- Limited API access for new developers

### Documentation
- https://developers.tiktok.com/doc/

---

## 3. Twitter/X API v2

### Requirements
- Twitter/X Developer Account
- Twitter/X App

### Steps

1. **Apply for Developer Account**
   - Go to https://developer.twitter.com/
   - Click "Sign Up" or "Apply"
   - Complete application form:
     - Use case description
     - Will you make Twitter content available to a government entity? (Usually No)
   - Wait for approval (usually instant to 24 hours)

2. **Create App/Project**
   - Once approved, go to Developer Portal
   - Click "Create Project" or "Create App"
   - Fill in details:
     - Project name
     - Use case
     - App name
   - Create

3. **Get API Keys**
   - In your app settings, find:
     - **API Key** (Consumer Key)
     - **API Secret Key** (Consumer Secret)
   - Copy both

4. **Get Bearer Token**
   - Go to "Keys and Tokens" tab
   - Under "Bearer Token", click "Generate"
   - Copy the Bearer Token (starts with AAAA...)

5. **Set Permissions**
   - Go to "App Permissions"
   - Set to "Read" (for follower data)
   - Save changes

6. **Add to .env**
   ```bash
   TWITTER_BEARER_TOKEN=your_bearer_token_here
   TWITTER_API_KEY=your_api_key_here
   TWITTER_API_SECRET=your_api_secret_here
   ```

### Important Notes
- Free tier: 1,500 tweets/month, 15 requests/15min for followers
- Paid tiers available for higher limits
- Bearer Token is simplest for read-only access
- OAuth 2.0 required for user-specific data

### Documentation
- https://developer.twitter.com/en/docs/twitter-api

---

## 4. Facebook Graph API

### Requirements
- Facebook Developer Account
- Facebook App

### Steps

1. **Create Facebook App**
   - Go to https://developers.facebook.com/
   - Click "My Apps" → "Create App"
   - Select "Business" or "Other"
   - Fill in app details

2. **Select Use Cases (NEW PROCESS - 2024/2025)**
   - Meta now requires selecting specific use cases during app creation
   - You'll see categories:
     - **Featured** - Common use cases
     - **Ads and monetization** - For advertising features
     - **Content management** - For posting/managing content
     - **Business messaging** - For WhatsApp/Messenger
     - **Others** - Additional use cases
   - **For follower data/analytics**: Select "Content management" use cases
   - **For Facebook Login**: Select "Authenticate and request data from users with Facebook Login"
   - Check relevant boxes and click "Next"

2. **Add Facebook Login Product**
   - In app dashboard, click "Add Product"
   - Find "Facebook Login" and click "Set Up"
   - Configure OAuth redirect URIs

3. **Get App ID and Secret**
   - Go to "Settings" → "Basic"
   - Find "App ID" and "App Secret"
   - Copy both (click "Show" for secret)

4. **Get Access Token**
   - Go to "Tools" → "Graph API Explorer"
   - Select your app
   - Add permissions: `pages_read_engagement`, `pages_read_user_content`
   - Generate Access Token
   - Exchange for long-lived token (similar to Instagram)

5. **Add to .env**
   ```bash
   FACEBOOK_ACCESS_TOKEN=your_access_token_here
   FACEBOOK_APP_ID=your_app_id_here
   FACEBOOK_APP_SECRET=your_app_secret_here
   ```

### Important Notes
- **NEW (2024/2025)**: Meta now requires selecting specific use cases during app creation
- Choose appropriate use cases based on your needs (Content management, Ads, etc.)
- App review required for many permissions
- Tokens expire (implement refresh)
- Page access tokens needed for page data

### Documentation
- https://developers.facebook.com/docs/graph-api

---

## 5. YouTube Data API v3

### Requirements
- Google Cloud Account
- Google Cloud Project

### Steps

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Click "Create Project"
   - Enter project name (e.g., "Social Profiler")
   - Create

2. **Enable YouTube Data API**
   - In Google Cloud Console, go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

3. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

4. **Restrict API Key (Recommended)**
   - Click on the created API key
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3"
   - Save

5. **Add to .env**
   ```bash
   YOUTUBE_API_KEY=your_api_key_here
   ```

### Important Notes
- Free tier: 10,000 units/day (1 unit = 1 API call)
- Quota can be increased with request
- No OAuth needed for public channel data
- OAuth required for private channel data

### Documentation
- https://developers.google.com/youtube/v3

---

## 6. LinkedIn API v2

### Requirements
- LinkedIn Account
- LinkedIn Developer Account

### Steps

1. **Create LinkedIn App**
   - Go to https://www.linkedin.com/developers/
   - Sign in with LinkedIn account
   - Click "Create app"
   - Fill in:
     - App name
     - LinkedIn Page (create one if needed)
     - Privacy policy URL
     - App logo
   - Agree to terms and create

2. **Get Client ID and Secret**
   - In app dashboard, go to "Auth" tab
   - Find "Client ID" and "Client Secret"
   - Copy both

3. **Set Redirect URLs**
   - In "Auth" tab, add redirect URLs:
     - `http://localhost:3001/auth/linkedin/callback` (for development)
     - Your production callback URL

4. **Request Products**
   - Go to "Products" tab
   - Request access to:
     - Sign In with LinkedIn
     - Marketing Developer Platform (for follower data)
   - Wait for approval

5. **Get Access Token (OAuth 2.0)**
   - Use OAuth 2.0 flow:
   ```
   Step 1: Redirect user to:
   https://www.linkedin.com/oauth/v2/authorization?
     response_type=code&
     client_id={client_id}&
     redirect_uri={redirect_uri}&
     state={state}&
     scope=r_liteprofile%20r_emailaddress
   
   Step 2: Exchange code for token:
   POST https://www.linkedin.com/oauth/v2/accessToken
   {
     "grant_type": "authorization_code",
     "code": "{code}",
     "client_id": "{client_id}",
     "client_secret": "{client_secret}",
     "redirect_uri": "{redirect_uri}"
   }
   ```

6. **Add to .env**
   ```bash
   LINKEDIN_CLIENT_ID=your_client_id_here
   LINKEDIN_CLIENT_SECRET=your_client_secret_here
   LINKEDIN_ACCESS_TOKEN=your_access_token_here
   ```

### Important Notes
- Product approval required (can take time)
- Access tokens expire (implement refresh)
- Limited follower data access
- Requires OAuth flow (can't use simple API key)

### Documentation
- https://learn.microsoft.com/en-us/linkedin/

---

## 🔐 Security Best Practices

### 1. Never Commit API Keys
- ✅ Add `.env` to `.gitignore` (already done)
- ✅ Use `.env.example` for templates
- ✅ Use environment variables in production

### 2. Rotate Keys Regularly
- Change API keys every 90 days
- Revoke old keys when rotating
- Update all environments simultaneously

### 3. Restrict API Keys
- Use IP restrictions when possible
- Limit API key permissions to minimum required
- Use different keys for dev/staging/prod

### 4. Monitor Usage
- Set up alerts for unusual API usage
- Monitor rate limits
- Track API costs

### 5. Store Securely
- Use secret management services (AWS Secrets Manager, Azure Key Vault)
- Encrypt secrets at rest
- Use different keys per environment

---

## 🚀 Quick Start Checklist

For **development/testing**, you can start with minimal setup:

### Minimum Required (for basic functionality):
- [ ] Twitter Bearer Token (easiest to get, best for testing)
- [ ] YouTube API Key (simple, no OAuth needed)
- [ ] Database connection string

### Full Setup (for production):
- [ ] Instagram Access Token
- [ ] TikTok Access Token
- [ ] Twitter Bearer Token
- [ ] Facebook Access Token
- [ ] YouTube API Key
- [ ] LinkedIn Access Token

---

## 📝 Testing Your API Keys

### Test Twitter
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.twitter.com/2/users/by/username/elonmusk"
```

### Test YouTube
```bash
curl "https://www.googleapis.com/youtube/v3/channels?part=statistics&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=YOUR_KEY"
```

### Test Instagram
```bash
curl "https://graph.instagram.com/me?fields=id,username&access_token=YOUR_TOKEN"
```

---

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid Token"**
   - Token may have expired
   - Check token format
   - Regenerate token

2. **"Rate Limit Exceeded"**
   - Wait for rate limit window to reset
   - Implement exponential backoff
   - Consider upgrading API tier

3. **"App Not Approved"**
   - Complete app review process
   - Provide detailed use case
   - Wait for approval (can take days/weeks)

4. **"Permission Denied"**
   - Request required permissions
   - Complete app review if needed
   - Check OAuth scopes

---

## 📚 Additional Resources

- **Instagram**: https://developers.facebook.com/docs/instagram-api
- **TikTok**: https://developers.tiktok.com/doc/
- **Twitter**: https://developer.twitter.com/en/docs
- **Facebook**: https://developers.facebook.com/docs
- **YouTube**: https://developers.google.com/youtube/v3
- **LinkedIn**: https://learn.microsoft.com/en-us/linkedin/

---

## 💡 Pro Tips

1. **Start with Twitter** - Easiest to set up, good for testing
2. **Use Test Accounts** - Create test accounts for each platform
3. **Monitor Quotas** - Set up alerts before hitting limits
4. **Cache Responses** - Use our built-in caching to reduce API calls
5. **Use Minimal Mode** - Start with `API_CALL_MODE=minimal` to save quota

---

**Last Updated:** January 2025

