# Setup Guide: Social Profiler

## Prerequisites

- Node.js 18+ and Yarn 1.22+
- PostgreSQL 14+ (for production)
- Redis (optional, for caching)
- Git

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
yarn install

# Install backend dependencies
cd backend && yarn install && cd ..

# Install frontend dependencies
cd frontend && yarn install && cd ..
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# At minimum, set:
# - DATABASE_URL (or use in-memory for development)
# - Social media API keys (optional for initial testing)
```

### 3. Database Setup (Optional for MVP)

For the MVP, the backend uses in-memory storage. For production:

```bash
# Create PostgreSQL database
createdb social_profiler

# Run migrations
cd backend
yarn migrate:up
```

Or use the provided schema:
```bash
psql -U postgres -d social_profiler -f database/schema.sql
```

### 4. Run Development Servers

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

## Social Media API Setup

### Instagram
1. Go to https://developers.facebook.com/
2. Create a Facebook App
3. Add Instagram Basic Display product
4. Get Access Token
5. Add to `.env`: `INSTAGRAM_ACCESS_TOKEN=your_token`

### TikTok
1. Go to https://developers.tiktok.com/
2. Create an app
3. Get Client Key and Client Secret
4. Add to `.env`: `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`

### Twitter
1. Go to https://developer.twitter.com/
2. Create a project and app
3. Get Bearer Token
4. Add to `.env`: `TWITTER_BEARER_TOKEN=your_token`

### Facebook
1. Go to https://developers.facebook.com/
2. Create an app
3. Get Access Token
4. Add to `.env`: `FACEBOOK_ACCESS_TOKEN=your_token`

### YouTube
1. Go to https://console.cloud.google.com/
2. Enable YouTube Data API v3
3. Create API Key
4. Add to `.env`: `YOUTUBE_API_KEY=your_key`

### LinkedIn
1. Go to https://www.linkedin.com/developers/
2. Create an app
3. Get Client ID and Secret
4. Add to `.env`: `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`

## Project Structure

```
social-profiler/
├── backend/              # Express API server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Data access
│   │   ├── routes/       # API routes
│   │   └── middleware/   # Express middleware
│   └── package.json
├── frontend/             # Next.js web app
│   ├── src/
│   │   ├── app/         # Next.js app router
│   │   ├── components/  # React components
│   │   └── types/       # TypeScript types
│   └── package.json
├── database/            # Database schemas
├── docs/                # Documentation
└── package.json         # Root workspace config
```

## Development Workflow

### Backend Development

```bash
cd backend
yarn dev  # Watch mode with tsx
yarn build  # Compile TypeScript
yarn test  # Run tests
```

### Frontend Development

```bash
cd frontend
yarn dev  # Next.js dev server
yarn build  # Production build
yarn lint  # ESLint
```

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:3001/api/health

# Search influencers
curl "http://localhost:3001/api/influencers/search?query=tech"

# Get influencer
curl http://localhost:3001/api/influencers/inf_123
```

### Using Postman/Insomnia

Import the API endpoints from `docs/API_DOCUMENTATION.md`

## Production Deployment

### Build

```bash
yarn build
```

### Environment Variables

Ensure all production environment variables are set:
- Database connection strings
- API keys for social media platforms
- JWT secrets
- AWS/GCP credentials (if using cloud storage)

### Run

```bash
# Backend
cd backend && yarn start

# Frontend
cd frontend && yarn start
```

## Docker (Coming Soon)

Docker setup will be added in a future update for easier deployment.

## Troubleshooting

### Port Already in Use

```bash
# Change ports in .env or package.json
PORT=3002  # Backend
# Frontend: edit frontend/package.json scripts
```

### Database Connection Issues

- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in .env
- Check database exists: `psql -l | grep social_profiler`

### API Key Issues

- Verify API keys are correct in .env
- Check API key permissions/scopes
- Some APIs require OAuth flow (will be added)

## Next Steps

1. Set up social media API keys
2. Test influencer search and discovery
3. Test true follower deduplication
4. Explore the frontend UI
5. Review documentation in `docs/` folder

## Support

For issues or questions:
- Check `docs/` folder for detailed documentation
- Review `docs/API_DOCUMENTATION.md` for API details
- See `docs/COMPETITIVE_ANALYSIS.md` for market context

