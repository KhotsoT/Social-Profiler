# Local Development Setup

## Prerequisites
- Node.js 18+
- Yarn
- PostgreSQL database (local or remote)

## Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   yarn install
   ```

2. **Set up environment variables:**
   Create `.env` file in root directory:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_profiler
   PORT=3001
   BACKEND_URL=http://localhost:3001
   FRONTEND_URL=http://localhost:3000
   
   # OAuth Credentials (get from developer portals)
   TWITTER_CLIENT_ID=your_twitter_client_id
   TWITTER_CLIENT_SECRET=your_twitter_client_secret
   # ... other OAuth credentials
   ```

3. **Start backend:**
   ```bash
   cd backend
   yarn dev
   ```
   Backend runs on: http://localhost:3001

## Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   yarn install
   ```

2. **Set up environment variables (optional):**
   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
   (Defaults to localhost if not set)

3. **Start frontend:**
   ```bash
   cd frontend
   yarn dev
   ```
   Frontend runs on: http://localhost:3000

## OAuth Callback URLs

For local development, update OAuth app settings:

**Twitter:**
- Callback URI: `http://localhost:3001/api/auth/twitter/callback`

**Instagram:**
- Callback URI: `http://localhost:3001/api/auth/instagram/callback`

**YouTube:**
- Callback URI: `http://localhost:3001/api/auth/youtube/callback`

(And so on for other platforms)

## Testing

1. Start backend: `cd backend && yarn dev`
2. Start frontend: `cd frontend && yarn dev`
3. Go to: http://localhost:3000/register
4. Test OAuth flow

## Notes

- All code defaults to localhost for local development
- No Fly.io dependencies in code
- Can run completely locally
- OAuth callbacks work with localhost (if platform allows it)


