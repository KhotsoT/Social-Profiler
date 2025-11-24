# Deploy Backend to Render (Free HTTPS)

**Why Render?**
- ✅ Free tier with HTTPS
- ✅ Stable URL (doesn't change)
- ✅ Easy GitHub integration
- ✅ Automatic deployments

## Quick Setup (5 minutes)

### Step 1: Create Render Account
1. Go to: https://render.com
2. Click "Get Started for Free"
3. Sign in with GitHub

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select `social-profiler` repository

### Step 3: Configure Service
- **Name:** `social-profiler-backend`
- **Region:** Choose closest to you
- **Branch:** `main` (or your main branch)
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** `yarn install && yarn build`
- **Start Command:** `yarn start`
- **Plan:** Free

### Step 4: Set Environment Variables
Click "Add Environment Variable" and add:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=your_database_url_here
BACKEND_URL=https://your-app-name.onrender.com
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
# Add all other OAuth credentials...
```

**Important:** Render will give you a URL like `https://your-app-name.onrender.com`
- Use this for `BACKEND_URL`
- Update Twitter OAuth callback to: `https://your-app-name.onrender.com/api/auth/twitter/callback`

### Step 5: Deploy
Click "Create Web Service"
Render will build and deploy automatically (takes 2-3 minutes)

### Step 6: Get Your HTTPS URL
1. Once deployed, you'll see: `https://your-app-name.onrender.com`
2. Copy this URL

### Step 7: Update OAuth Settings
Go to Twitter Developer Portal:
- Callback URI: `https://your-app-name.onrender.com/api/auth/twitter/callback`
- Website URL: `https://your-app-name.onrender.com`

### Step 8: Update Frontend
In `frontend/next.config.js` or `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-app-name.onrender.com
```

## Note: Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds (cold start)
- For production, consider upgrading to paid plan

## Done! 🚀

Your backend now has a stable HTTPS URL for OAuth callbacks.

