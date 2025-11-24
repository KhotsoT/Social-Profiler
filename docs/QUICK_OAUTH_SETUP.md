# Quick OAuth Setup - Start Fresh

**Goal:** Get OAuth working so influencers can connect their accounts and grant permissions.

**Time:** 5-10 minutes per platform

**Start with:** Twitter (easiest) → YouTube → Instagram → TikTok → Facebook

---

## 🚀 Quick Start: Twitter (Easiest - Start Here!)

### Step 1: Create Twitter Developer Account
1. Go to: **https://developer.twitter.com/**
2. Sign in with your Twitter account
3. Click **"Sign up"** for Developer Portal (usually instant approval)

### Step 2: Create App
1. Once in dashboard, click **"Create Project"** or **"Create App"**
2. Fill in:
   - **Project name:** "Social Profiler"
   - **Use case:** "Making a bot" or "Exploring the API"
   - **App name:** "Social Profiler"
   - **App description:** "Influencer marketing platform"
3. Click **"Create"**

### Step 3: Get OAuth 2.0 Credentials
1. Go to your app → **"User authentication settings"**
2. Click **"Set up"**
3. Configure:
   - **App permissions:** Read
   - **Type of App:** Web App
   - **Callback URI / Redirect URL:** `http://localhost:3001/api/auth/twitter/callback`
   - **Website URL:** `http://localhost:3000` (or your domain)
4. Click **"Save"**
5. Go to **"Keys and tokens"** tab
6. Under **"OAuth 2.0 Client ID and Client Secret"**:
   - Copy **Client ID**
   - Copy **Client Secret** (click "Regenerate" if needed)

### Step 4: Add to .env
Open your `.env` file and add:
```env
TWITTER_CLIENT_ID=paste_client_id_here
TWITTER_CLIENT_SECRET=paste_client_secret_here
```

✅ **Twitter Done!** Test it at `http://localhost:3000/register`

---

## 🎥 YouTube (Easy - 2nd)

### Step 1: Google Cloud Console
1. Go to: **https://console.cloud.google.com/**
2. Sign in with Google account
3. Click **"Create Project"**
   - Name: "Social Profiler"
   - Click **"Create"**

### Step 2: Enable YouTube API
1. Wait for project to be created, then select it
2. Go to **"APIs & Services"** → **"Library"**
3. Search: **"YouTube Data API v3"**
4. Click it → Click **"Enable"**

### Step 3: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If asked to configure consent screen:
   - **User Type:** External
   - **App name:** "Social Profiler"
   - **User support email:** Your email
   - **Developer email:** Your email
   - Click **"Save and Continue"** through all steps
4. Back to credentials:
   - **Application type:** Web application
   - **Name:** "Social Profiler"
   - **Authorized redirect URIs:** 
     ```
     http://localhost:3001/api/auth/youtube/callback
     ```
5. Click **"Create"**
6. Copy **Client ID** and **Client Secret**

### Step 4: Add to .env
```env
YOUTUBE_CLIENT_ID=paste_client_id_here
YOUTUBE_CLIENT_SECRET=paste_client_secret_here
```

✅ **YouTube Done!**

---

## 📸 Instagram (Medium - 3rd)

### Step 1: Create Meta App
1. Go to: **https://developers.facebook.com/**
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in:
   - **App name:** "Social Profiler"
   - **App contact email:** Your email
5. Click **"Create App"**

### Step 2: Add Facebook Login
1. In app dashboard, find **"Add Product"** or **"Products"**
2. Find **"Facebook Login"** → Click **"Set Up"**
3. Choose **"Web"**
4. Go to **"Settings"** under Facebook Login
5. Add **Valid OAuth Redirect URIs:**
   ```
   http://localhost:3001/api/auth/instagram/callback
   ```
6. Click **"Save Changes"**

### Step 3: Add Instagram Product
1. Go to **"Products"** → Click **"+"** next to **"Instagram"**
2. Choose **"Basic Display"**
3. Click **"Create New App"**
4. Add **Valid OAuth Redirect URIs:**
   ```
   http://localhost:3001/api/auth/instagram/callback
   ```

### Step 4: Get Credentials
1. Go to **"Settings"** → **"Basic"**
2. Copy:
   - **App ID** → `INSTAGRAM_CLIENT_ID`
   - **App Secret** → `INSTAGRAM_CLIENT_SECRET` (click "Show")

### Step 5: Add to .env
```env
INSTAGRAM_CLIENT_ID=paste_app_id_here
INSTAGRAM_CLIENT_SECRET=paste_app_secret_here
```

**Note:** Instagram OAuth requires the account to be Business or Creator account.

✅ **Instagram Done!**

---

## 🎵 TikTok (Medium - 4th)

### Step 1: Create TikTok Developer Account
1. Go to: **https://developers.tiktok.com/**
2. Sign in with TikTok account
3. Click **"Get Started"** or **"Create an app"**

### Step 2: Create App
1. Click **"Create an app"**
2. Fill in:
   - **App name:** "Social Profiler"
   - **App description:** "Influencer marketing platform"
   - **Category:** Business/Marketing
   - **Website:** `http://localhost:3000`
   - **Redirect URI:** `http://localhost:3001/api/auth/tiktok/callback`
3. Click **"Submit"**

### Step 3: Get Credentials
1. After app is created, go to **"Basic Information"**
2. Copy:
   - **Client Key** → `TIKTOK_CLIENT_KEY`
   - **Client Secret** → `TIKTOK_CLIENT_SECRET`

### Step 4: Add to .env
```env
TIKTOK_CLIENT_KEY=paste_client_key_here
TIKTOK_CLIENT_SECRET=paste_client_secret_here
```

✅ **TikTok Done!**

---

## 👥 Facebook (Uses Same Meta App as Instagram)

### Step 1: Use Your Existing Meta App
If you already created the Meta app for Instagram, use the same one!

### Step 2: Configure Facebook Login
1. In your Meta app dashboard
2. Go to **"Facebook Login"** → **"Settings"**
3. Add **Valid OAuth Redirect URIs:**
   ```
   http://localhost:3001/api/auth/facebook/callback
   ```
4. Save

### Step 3: Get Credentials
Same as Instagram:
- **App ID** → `FACEBOOK_APP_ID` (same as Instagram Client ID)
- **App Secret** → `FACEBOOK_APP_SECRET` (same as Instagram Client Secret)

### Step 4: Add to .env
```env
FACEBOOK_APP_ID=paste_app_id_here
FACEBOOK_APP_SECRET=paste_app_secret_here
```

✅ **Facebook Done!**

---

## 📝 Complete .env File

After setting up all platforms, your `.env` should look like:

```env
# Backend
PORT=3001
BACKEND_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_profiler

# Twitter OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# YouTube OAuth
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# Instagram OAuth
INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret

# TikTok OAuth
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Facebook OAuth (same as Instagram)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

---

## 🗄️ Run Database Migration

After setting up OAuth credentials:

```bash
cd backend
# Apply migration to create OAuth tables
psql -U postgres -d social_profiler -f ../database/migrations/001_add_oauth_tokens.sql
```

Or if you prefer using the init script:
```bash
cd backend
yarn init-db
```

---

## ✅ Test It!

1. **Start backend:**
   ```bash
   cd backend
   yarn dev
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   yarn dev
   ```

3. **Test registration:**
   - Go to: **http://localhost:3000/register**
   - Enter name and email
   - Click **"Connect"** on Twitter (start with this one!)
   - You should be redirected to Twitter to authorize
   - After authorizing, you'll be redirected back
   - Your influencer profile should be created with real data!

---

## 🎯 Recommended Order

1. **Twitter** (5 min) - Easiest, instant approval
2. **YouTube** (10 min) - Google Cloud setup
3. **Instagram** (15 min) - Meta app setup
4. **TikTok** (10 min) - Developer account
5. **Facebook** (2 min) - Uses same Meta app as Instagram

**Total time:** ~40 minutes for all platforms

---

## 🆘 Quick Troubleshooting

**"Redirect URI mismatch"**
- Make sure the redirect URI in your app settings EXACTLY matches: `http://localhost:3001/api/auth/[platform]/callback`
- Check for typos, trailing slashes, http vs https

**"Invalid credentials"**
- Double-check you copied the right values
- Make sure no extra spaces in `.env` file
- Restart backend after changing `.env`

**"App not approved"**
- For development, this is usually fine
- Add test users in OAuth consent screen (YouTube/Google)
- Some platforms work in "development mode"

---

## 📚 Need More Details?

See the full guide: `docs/OAUTH_SETUP_GUIDE.md`

**Ready? Start with Twitter - it's the quickest!** 🚀



