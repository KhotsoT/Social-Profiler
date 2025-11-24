-- Social Profiler Database Schema
-- PostgreSQL Database Schema for Influencer Marketing Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Influencers Table
CREATE TABLE influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    true_follower_count INTEGER,
    categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Social Media Accounts Table
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'twitter', 'facebook', 'youtube', 'linkedin')),
    username VARCHAR(255) NOT NULL,
    platform_id VARCHAR(255) NOT NULL,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2) DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    profile_url TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(influencer_id, platform),
    UNIQUE(platform, platform_id)
);

-- Followers Table (for deduplication)
CREATE TABLE followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    profile_image_hash VARCHAR(64),
    bio TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(social_account_id, platform_user_id)
);

-- Follower Matches Table (for tracking duplicate followers across platforms)
CREATE TABLE follower_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id_1 UUID NOT NULL REFERENCES followers(id) ON DELETE CASCADE,
    follower_id_2 UUID NOT NULL REFERENCES followers(id) ON DELETE CASCADE,
    match_confidence DECIMAL(5, 2) NOT NULL,
    match_method VARCHAR(50) NOT NULL, -- 'username', 'email', 'image', 'bio', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id_1, follower_id_2)
);

-- Campaigns Table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand_id UUID,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    budget DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Influencers (Many-to-Many)
CREATE TABLE campaign_influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    payment_amount DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, influencer_id)
);

-- Influencer Analytics (Historical data)
CREATE TABLE influencer_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    follower_count INTEGER,
    following_count INTEGER,
    post_count INTEGER,
    engagement_rate DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(influencer_id, social_account_id, date)
);

-- Indexes for performance
CREATE INDEX idx_influencers_categories ON influencers USING GIN(categories);
CREATE INDEX idx_social_accounts_influencer_id ON social_accounts(influencer_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_follower_count ON social_accounts(follower_count);
CREATE INDEX idx_followers_social_account_id ON followers(social_account_id);
CREATE INDEX idx_followers_username ON followers(username);
CREATE INDEX idx_followers_email ON followers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_follower_matches_follower_1 ON follower_matches(follower_id_1);
CREATE INDEX idx_follower_matches_follower_2 ON follower_matches(follower_id_2);
CREATE INDEX idx_campaign_influencers_campaign_id ON campaign_influencers(campaign_id);
CREATE INDEX idx_campaign_influencers_influencer_id ON campaign_influencers(influencer_id);
CREATE INDEX idx_influencer_analytics_influencer_id ON influencer_analytics(influencer_id);
CREATE INDEX idx_influencer_analytics_date ON influencer_analytics(date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();





