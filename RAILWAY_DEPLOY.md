# Deploy Backend to Railway (Free HTTPS)

**Why Railway?**
- ✅ Free tier with HTTPS
- ✅ Stable URL (doesn't change)
- ✅ Easy GitHub integration
- ✅ Automatic deployments

## Quick Setup (5 minutes)

### Step 1: Create Railway Account
1. Go to: https://railway.app
2. Click "Start a New Project"
3. Sign in with GitHub

### Step 2: Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `social-profiler` repository
4. Railway will detect it's a Node.js project

### Step 3: Configure Service
1. Click on the service
2. Go to **Settings** tab
3. Set **Root Directory** to: `backend`
4. Set **Build Command** to: `yarn install && yarn build`
5. Set **Start Command** to: `yarn start`

### Step 4: Set Environment Variables
Go to **Variables** tab and add:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=your_database_url_here
BACKEND_URL=https://your-app-name.up.railway.app
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
# Add all other OAuth credentials...
```

**Important:** Railway will give you a URL like `https://your-app-name.up.railway.app`
- Use this for `BACKEND_URL`
- Update Twitter OAuth callback to: `https://your-app-name.up.railway.app/api/auth/twitter/callback`

### Step 5: Deploy
Railway will automatically deploy when you push to GitHub, or click "Deploy" button.

### Step 6: Get Your HTTPS URL
1. Go to **Settings** → **Domains**
2. Railway gives you: `https://your-app-name.up.railway.app`
3. Copy this URL

### Step 7: Update OAuth Settings
Go to Twitter Developer Portal:
- Callback URI: `https://your-app-name.up.railway.app/api/auth/twitter/callback`
- Website URL: `https://your-app-name.up.railway.app`

### Step 8: Update Frontend
In `frontend/next.config.js` or `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app
```

## Done! 🚀

Your backend now has a stable HTTPS URL for OAuth callbacks.

