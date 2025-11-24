# Deploy Frontend to Firebase Hosting

## Quick Setup

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```
(Opens browser to sign in)

### 3. Create Firebase Project
1. Go to: https://console.firebase.google.com/
2. Click "Add project"
3. Name: "social-profiler" (or your choice)
4. Follow prompts to create

### 4. Initialize Firebase in Project Root
```bash
# From project root (not frontend folder)
firebase init hosting
```

**When prompted:**
- ✅ Use an existing project → Select your Firebase project
- Public directory: `frontend/out`
- Configure as single-page app: **Yes**
- Set up automatic builds: **No** (for now)
- Overwrite index.html: **No**

### 5. Update .firebaserc
Edit `.firebaserc` and replace `your-firebase-project-id` with your actual Firebase project ID.

### 6. Build and Deploy
```bash
cd frontend
yarn build
cd ..
firebase deploy --only hosting
```

**Or use the script:**
```bash
yarn deploy
```

## Your Frontend Will Be Live At:
```
https://your-project-id.web.app
```
or
```
https://your-project-id.firebaseapp.com
```

## Update Backend CORS
After deploying, update `backend/src/index.ts` to allow your Firebase domain:
```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-project-id.web.app',
    'https://your-project-id.firebaseapp.com'
  ],
  credentials: true,
}));
```

## Environment Variables
Set in Firebase Console → Hosting → Environment Variables:
- `NEXT_PUBLIC_API_URL=https://social-profiler-backend.fly.dev`


