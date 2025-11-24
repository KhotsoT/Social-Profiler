-- Migration: Add OAuth tokens and user accounts
-- This allows influencers to grant permissions to their own accounts

-- Users/Influencers Table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- For future password auth
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Tokens Table (stores user's own access tokens)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE, -- Link to influencer profile
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'twitter', 'facebook', 'youtube', 'linkedin')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    platform_user_id VARCHAR(255) NOT NULL, -- User's ID on the platform
    platform_username VARCHAR(255) NOT NULL, -- User's username on the platform
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform),
    UNIQUE(influencer_id, platform)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_influencer_id ON oauth_tokens(influencer_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_platform ON oauth_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

-- Link influencers to users (optional - for self-registered influencers)
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON influencers(user_id);



