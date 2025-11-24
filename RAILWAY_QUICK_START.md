# Railway Quick Start - 5 Minutes

## Step 1: Create Railway Account
1. Go to: **https://railway.app**
2. Click **"Start a New Project"**
3. Sign in with **GitHub**

## Step 2: Deploy Backend
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `social-profiler` repository
4. Railway will auto-detect Node.js

## Step 3: Configure Service
1. Click on the service
2. Go to **Settings** tab
3. Set these values:
   - **Root Directory:** `backend`
   - **Build Command:** `yarn install && yarn build`
   - **Start Command:** `yarn start`

## Step 4: Get Your HTTPS URL
1. Go to **Settings** → **Networking**
2. Railway gives you: `https://your-app-name.up.railway.app`
3. **Copy this URL!** You'll need it for OAuth callbacks

## Step 5: Set Environment Variables
Go to **Variables** tab and add:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=your_database_url_here
BACKEND_URL=https://your-app-name.up.railway.app
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

**Important:** Replace `your-app-name.up.railway.app` with your actual Railway URL!

## Step 6: Update Twitter OAuth
1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Select your app → **User authentication settings**
3. Update **Callback URI** to:
   ```
   https://your-app-name.up.railway.app/api/auth/twitter/callback
   ```
4. Update **Website URL** to:
   ```
   https://your-app-name.up.railway.app
   ```
5. **Save**

## Step 7: Update Frontend
In `frontend/next.config.js`, update:
```js
env: {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://your-app-name.up.railway.app',
}
```

Or create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app
```

## Step 8: Test
1. Railway will auto-deploy
2. Wait for deployment to finish (2-3 minutes)
3. Test: `curl https://your-app-name.up.railway.app/api/health`
4. Should return: `{"status":"ok"}`

## Done! 🚀

Your backend is now live with HTTPS for OAuth callbacks!

