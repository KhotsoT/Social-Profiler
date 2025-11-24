# Docker Quick Start - Simple Guide

**You're new to Docker? No problem!** This is the simplest guide.

## What is Docker?

Think of Docker like a shipping container for your app:
- Your app + all its dependencies = one package
- Works the same on your computer, your friend's computer, and the cloud
- No "it works on my machine" problems!

## What We're Doing

1. **Package your backend** into a Docker container
2. **Deploy it to Fly.io** (free, gives you HTTPS)
3. **Get a URL** like `https://your-app.fly.dev`
4. **Use that URL** for OAuth callbacks

## Step-by-Step

### 1. Install Fly CLI

Open PowerShell and run:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Wait for it to finish. Close and reopen PowerShell.

### 2. Login to Fly.io

```powershell
fly auth login
```

This opens your browser. Sign in (or create free account).

### 3. Go to Backend Folder

```powershell
cd backend
```

### 4. Launch Your App

```powershell
fly launch
```

**Questions it asks:**
- App name? (Press Enter for default, or type: `social-profiler-backend`)
- Region? (Press Enter for closest one)
- PostgreSQL? (Type `n` for now, we'll add database later)
- Redis? (Type `n` for now)

### 5. Set Your Secrets (Environment Variables)

```powershell
fly secrets set DATABASE_URL=postgresql://user:pass@host:5432/dbname
fly secrets set BACKEND_URL=https://your-app-name.fly.dev
fly secrets set TWITTER_CLIENT_ID=your_twitter_client_id
fly secrets set TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

**Get your app name from the URL Fly gave you!**

### 6. Deploy!

```powershell
fly deploy
```

Wait 2-3 minutes. You'll see:
```
✓ Deployed successfully!
https://your-app-name.fly.dev
```

### 7. Test It

```powershell
curl https://your-app-name.fly.dev/api/health
```

Should return: `{"status":"ok"}`

### 8. Update OAuth Settings

Go to Twitter Developer Portal:
- Callback URI: `https://your-app-name.fly.dev/api/auth/twitter/callback`

Do the same for Instagram, YouTube, etc.

## That's It! 🎉

Your backend is now live with HTTPS!

## Common Commands

```powershell
# Check status
fly status

# View logs
fly logs

# Update secrets
fly secrets set KEY=value

# Redeploy
fly deploy

# Open dashboard
fly dashboard
```

## Troubleshooting

**"Command not found: fly"**
- Close and reopen PowerShell
- Or restart your computer

**"Deploy failed"**
- Check `fly logs` for errors
- Make sure all secrets are set

**"Can't connect to database"**
- Make sure `DATABASE_URL` secret is set correctly
- Check database is accessible from internet (if using external DB)

## Need Help?

- Fly.io docs: https://fly.io/docs/
- Your app dashboard: https://fly.io/dashboard


