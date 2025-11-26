# 🗄️ CreatorPay Database Schema

## Complete PostgreSQL Schema for the Platform

---

## 📊 ENTITY RELATIONSHIP DIAGRAM (Conceptual)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     USERS       │       │   COMPANIES     │       │   INFLUENCERS   │
│─────────────────│       │─────────────────│       │─────────────────│
│ id              │       │ id              │       │ id              │
│ email           │◄──────│ owner_id        │       │ user_id         │──┐
│ password_hash   │       │ name            │       │ display_name    │  │
│ role            │       │ industry        │       │ bio             │  │
│ ...             │       │ ...             │       │ ...             │  │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘  │
         │                         │                         │           │
         │                         │                         │           │
         ▼                         ▼                         ▼           │
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐  │
│ USER_SESSIONS   │       │   CAMPAIGNS     │       │ SOCIAL_ACCOUNTS │  │
│─────────────────│       │─────────────────│       │─────────────────│  │
│ user_id         │       │ company_id      │       │ influencer_id   │◄─┘
│ token           │       │ name            │       │ platform        │
│ ...             │       │ budget          │       │ followers       │
└─────────────────┘       │ status          │       │ engagement_rate │
                          │ ...             │       │ ...             │
                          └────────┬────────┘       └─────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
          ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
          │ CAMPAIGN_       │ │  CAMPAIGN_  │ │   CAMPAIGN_     │
          │ INVITATIONS     │ │  CONTENT    │ │   ESCROW        │
          │─────────────────│ │─────────────│ │─────────────────│
          │ campaign_id     │ │ campaign_id │ │ campaign_id     │
          │ influencer_id   │ │ influencer_ │ │ amount          │
          │ offered_amount  │ │   id        │ │ status          │
          │ status          │ │ content_url │ │ ...             │
          │ ...             │ │ status      │ └─────────────────┘
          └─────────────────┘ │ ...         │
                              └──────┬──────┘
                                     │
                                     ▼
                          ┌─────────────────┐
                          │    PAYMENTS     │
                          │─────────────────│
                          │ influencer_id   │
                          │ campaign_id     │
                          │ amount          │
                          │ status          │
                          │ ...             │
                          └─────────────────┘
```

---

## 🔧 COMPLETE SQL SCHEMA

### 1. Core User Management

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- USERS TABLE
-- All users: influencers, brand managers, admins
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- Role & Status
    role VARCHAR(20) NOT NULL DEFAULT 'influencer' 
        CHECK (role IN ('influencer', 'brand', 'admin')),
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'suspended', 'deleted')),
    
    -- Preferences
    notification_preferences JSONB DEFAULT '{
        "email_campaigns": true,
        "email_payments": true,
        "push_campaigns": true,
        "push_payments": true
    }'::jsonb,
    
    -- OAuth tokens (encrypted)
    oauth_tokens JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ═══════════════════════════════════════════════════════════════
-- USER SESSIONS
-- Active login sessions for security
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB,
    ip_address INET,
    
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(refresh_token);
```

### 2. Influencer Profiles

```sql
-- ═══════════════════════════════════════════════════════════════
-- INFLUENCERS
-- Extended profile for content creators
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Display Info
    display_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    bio TEXT,
    profile_image_url TEXT,
    cover_image_url TEXT,
    
    -- Location
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'South Africa',
    
    -- Categories (array of category slugs)
    categories TEXT[] DEFAULT '{}',
    
    -- Calculated Stats (updated by triggers/jobs)
    total_followers INTEGER DEFAULT 0,
    true_followers INTEGER DEFAULT 0,  -- Deduplicated across platforms
    average_engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Creator Level
    level VARCHAR(30) DEFAULT 'newcomer'
        CHECK (level IN ('newcomer', 'creator', 'rising_star', 
                         'verified', 'pro', 'elite')),
    total_earnings DECIMAL(12,2) DEFAULT 0,
    
    -- Platform Fee (based on level, default 10%)
    platform_fee_percentage DECIMAL(4,2) DEFAULT 10.00,
    
    -- Profile Status
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    profile_complete BOOLEAN DEFAULT FALSE,
    profile_strength INTEGER DEFAULT 0,  -- 0-100
    
    -- Settings
    is_available BOOLEAN DEFAULT TRUE,
    min_campaign_value DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_influencers_user ON influencers(user_id);
CREATE INDEX idx_influencers_username ON influencers(username);
CREATE INDEX idx_influencers_categories ON influencers USING GIN(categories);
CREATE INDEX idx_influencers_level ON influencers(level);
CREATE INDEX idx_influencers_available ON influencers(is_available);

-- ═══════════════════════════════════════════════════════════════
-- SOCIAL ACCOUNTS
-- Connected social media platforms
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    
    -- Platform Info
    platform VARCHAR(30) NOT NULL
        CHECK (platform IN ('instagram', 'tiktok', 'youtube', 
                            'twitter', 'linkedin', 'facebook')),
    platform_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    profile_url TEXT,
    
    -- Stats (refreshed periodically)
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    avg_likes INTEGER DEFAULT 0,
    avg_comments INTEGER DEFAULT 0,
    avg_views INTEGER DEFAULT 0,
    
    -- Audience Demographics
    audience_demographics JSONB DEFAULT '{
        "age_ranges": {},
        "gender": {},
        "locations": {},
        "interests": []
    }'::jsonb,
    
    -- OAuth (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_connected BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(influencer_id, platform)
);

CREATE INDEX idx_social_accounts_influencer ON social_accounts(influencer_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);

-- ═══════════════════════════════════════════════════════════════
-- INFLUENCER RATE CARDS
-- Pricing for different content types
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE influencer_rate_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    
    -- Platform specific rates
    platform VARCHAR(30) NOT NULL,
    
    -- Content Type Rates (in ZAR)
    story_rate DECIMAL(10,2),
    post_rate DECIMAL(10,2),
    reel_rate DECIMAL(10,2),
    video_rate DECIMAL(10,2),
    live_rate DECIMAL(10,2),
    carousel_rate DECIMAL(10,2),
    
    -- Custom packages (JSONB for flexibility)
    custom_packages JSONB DEFAULT '[]'::jsonb,
    
    -- Is this auto-calculated or manually set?
    is_auto_generated BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(influencer_id, platform)
);

CREATE INDEX idx_rate_cards_influencer ON influencer_rate_cards(influencer_id);

-- ═══════════════════════════════════════════════════════════════
-- INFLUENCER PORTFOLIO
-- Past work samples
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE influencer_portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(200),
    description TEXT,
    platform VARCHAR(30),
    content_type VARCHAR(30),
    content_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Stats
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    
    -- Brand (optional)
    brand_name VARCHAR(200),
    
    -- Display order
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_portfolio_influencer ON influencer_portfolio(influencer_id);
```

### 3. Brand/Company Management

```sql
-- ═══════════════════════════════════════════════════════════════
-- COMPANIES
-- Brands/businesses that create campaigns
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Owner (user who created the company)
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Company Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    
    -- Industry & Category
    industry VARCHAR(100),
    company_size VARCHAR(50)
        CHECK (company_size IN ('1-10', '11-50', '51-200', 
                                '201-500', '501-1000', '1000+')),
    
    -- Location
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'South Africa',
    
    -- Billing
    billing_email VARCHAR(255),
    billing_address JSONB,
    tax_number VARCHAR(50),
    
    -- Stats
    total_campaigns INTEGER DEFAULT 0,
    total_spent DECIMAL(14,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deleted')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_industry ON companies(industry);

-- ═══════════════════════════════════════════════════════════════
-- COMPANY TEAM MEMBERS
-- Multiple users can manage a company
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role within company
    role VARCHAR(30) DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    
    -- Invitation
    invited_by UUID REFERENCES users(id),
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('pending', 'active', 'removed')),
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
```

### 4. Campaigns

```sql
-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGNS
-- Marketing campaigns created by brands
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100),
    description TEXT,
    
    -- Objective
    objective VARCHAR(50) NOT NULL
        CHECK (objective IN ('awareness', 'product_launch', 'event', 
                             'app_install', 'store_opening', 'giveaway', 
                             'sales', 'engagement', 'other')),
    
    -- Target Audience
    target_platforms TEXT[] DEFAULT '{}',
    target_categories TEXT[] DEFAULT '{}',
    target_locations TEXT[] DEFAULT '{}',
    target_follower_min INTEGER,
    target_follower_max INTEGER,
    target_engagement_min DECIMAL(5,2),
    target_age_groups TEXT[] DEFAULT '{}',
    target_gender VARCHAR(20),
    
    -- Content Requirements
    content_requirements JSONB DEFAULT '{
        "instagram_story": 0,
        "instagram_post": 0,
        "instagram_reel": 0,
        "instagram_carousel": 0,
        "tiktok_video": 0,
        "youtube_video": 0,
        "twitter_post": 0
    }'::jsonb,
    
    -- Brief
    key_messages TEXT,
    hashtags TEXT[] DEFAULT '{}',
    mentions TEXT[] DEFAULT '{}',
    dos TEXT[] DEFAULT '{}',
    donts TEXT[] DEFAULT '{}',
    
    -- Brand Assets
    brand_assets JSONB DEFAULT '[]'::jsonb,
    
    -- Budget
    total_budget DECIMAL(12,2) NOT NULL,
    per_influencer_budget DECIMAL(10,2),
    influencer_count INTEGER NOT NULL DEFAULT 1,
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_with_fees DECIMAL(12,2) NOT NULL,
    
    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    content_deadline DATE,
    
    -- Status
    status VARCHAR(30) DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_payment', 'active', 
                          'in_progress', 'review', 'completed', 
                          'cancelled', 'paused')),
    
    -- Stats (updated by triggers)
    invites_sent INTEGER DEFAULT 0,
    invites_accepted INTEGER DEFAULT 0,
    content_submitted INTEGER DEFAULT 0,
    content_approved INTEGER DEFAULT 0,
    content_published INTEGER DEFAULT 0,
    
    -- Performance (aggregated from content)
    total_reach INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    average_engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    published_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_company ON campaigns(company_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_platforms ON campaigns USING GIN(target_platforms);
CREATE INDEX idx_campaigns_categories ON campaigns USING GIN(target_categories);

-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGN INVITATIONS
-- Invites sent to influencers for campaigns
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE campaign_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    
    -- Offer
    offered_amount DECIMAL(10,2) NOT NULL,
    content_requirements JSONB NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'viewed', 'accepted', 
                          'declined', 'expired', 'withdrawn')),
    
    -- Response
    response_deadline TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    decline_reason TEXT,
    
    -- Negotiation (optional)
    counter_offer_amount DECIMAL(10,2),
    counter_offer_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, influencer_id)
);

CREATE INDEX idx_invitations_campaign ON campaign_invitations(campaign_id);
CREATE INDEX idx_invitations_influencer ON campaign_invitations(influencer_id);
CREATE INDEX idx_invitations_status ON campaign_invitations(status);

-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGN CONTENT
-- Content submitted by influencers
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE campaign_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    invitation_id UUID REFERENCES campaign_invitations(id),
    
    -- Content Details
    platform VARCHAR(30) NOT NULL,
    content_type VARCHAR(30) NOT NULL
        CHECK (content_type IN ('story', 'post', 'reel', 'carousel', 
                                 'video', 'short', 'live', 'tweet')),
    
    -- Submitted Content
    content_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    
    -- Published Content (once live)
    published_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'in_review', 
                          'revision_requested', 'approved', 
                          'rejected', 'published')),
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    revision_count INTEGER DEFAULT 0,
    
    -- Performance (scraped after publish)
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_campaign ON campaign_content(campaign_id);
CREATE INDEX idx_content_influencer ON campaign_content(influencer_id);
CREATE INDEX idx_content_status ON campaign_content(status);
```

### 5. Payments & Transactions

```sql
-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGN ESCROW
-- Funds held for campaigns
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE campaign_escrow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Amounts
    campaign_amount DECIMAL(12,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'funded', 'partially_released', 
                          'fully_released', 'refunded', 'disputed')),
    
    -- Release tracking
    amount_released DECIMAL(12,2) DEFAULT 0,
    amount_remaining DECIMAL(12,2),
    
    -- Payment Reference
    payment_provider VARCHAR(30),
    payment_reference VARCHAR(255),
    payment_method VARCHAR(50),
    
    -- Timestamps
    funded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escrow_campaign ON campaign_escrow(campaign_id);
CREATE INDEX idx_escrow_company ON campaign_escrow(company_id);
CREATE INDEX idx_escrow_status ON campaign_escrow(status);

-- ═══════════════════════════════════════════════════════════════
-- INFLUENCER WALLETS
-- Balance tracking for influencers
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE influencer_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL UNIQUE REFERENCES influencers(id),
    
    -- Balances
    available_balance DECIMAL(12,2) DEFAULT 0,
    pending_balance DECIMAL(12,2) DEFAULT 0,
    total_earned DECIMAL(14,2) DEFAULT 0,
    total_withdrawn DECIMAL(14,2) DEFAULT 0,
    
    -- Timestamps
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallets_influencer ON influencer_wallets(influencer_id);

-- ═══════════════════════════════════════════════════════════════
-- EARNINGS
-- Individual payment records for influencers
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    content_id UUID REFERENCES campaign_content(id),
    escrow_id UUID REFERENCES campaign_escrow(id),
    
    -- Amounts
    gross_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    platform_fee_percentage DECIMAL(4,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'available', 
                          'withdrawn', 'cancelled')),
    
    -- When available
    available_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_earnings_influencer ON earnings(influencer_id);
CREATE INDEX idx_earnings_campaign ON earnings(campaign_id);
CREATE INDEX idx_earnings_status ON earnings(status);

-- ═══════════════════════════════════════════════════════════════
-- PAYOUT ACCOUNTS
-- Bank accounts / payment methods for withdrawals
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE payout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    
    -- Account Type
    account_type VARCHAR(30) NOT NULL
        CHECK (account_type IN ('bank_account', 'paypal', 'mobile_money')),
    
    -- Bank Account Details (encrypted in production)
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(200),
    account_number_last4 VARCHAR(4),
    account_number_encrypted TEXT,
    branch_code VARCHAR(20),
    account_type_bank VARCHAR(20),
    
    -- PayPal
    paypal_email VARCHAR(255),
    
    -- Mobile Money
    mobile_number VARCHAR(20),
    mobile_provider VARCHAR(50),
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payout_accounts_influencer ON payout_accounts(influencer_id);

-- ═══════════════════════════════════════════════════════════════
-- PAYOUTS
-- Withdrawal requests and completions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    payout_account_id UUID NOT NULL REFERENCES payout_accounts(id),
    
    -- Amounts
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    
    -- Type
    is_instant BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 
                          'failed', 'cancelled')),
    
    -- Processing
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    
    -- External Reference
    payment_provider VARCHAR(30),
    payment_reference VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payouts_influencer ON payouts(influencer_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- ═══════════════════════════════════════════════════════════════
-- TRANSACTIONS
-- Complete transaction log for auditing
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who
    user_id UUID REFERENCES users(id),
    influencer_id UUID REFERENCES influencers(id),
    company_id UUID REFERENCES companies(id),
    
    -- What
    transaction_type VARCHAR(50) NOT NULL
        CHECK (transaction_type IN (
            'campaign_funding', 'campaign_refund',
            'earning_credited', 'earning_available',
            'payout_requested', 'payout_completed', 'payout_failed',
            'platform_fee', 'instant_payout_fee'
        )),
    
    -- Related entities
    campaign_id UUID REFERENCES campaigns(id),
    escrow_id UUID REFERENCES campaign_escrow(id),
    earning_id UUID REFERENCES earnings(id),
    payout_id UUID REFERENCES payouts(id),
    
    -- Amounts
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Direction
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('credit', 'debit')),
    
    -- Balance after (for wallet transactions)
    balance_after DECIMAL(12,2),
    
    -- Description
    description TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_influencer ON transactions(influencer_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_created ON transactions(created_at);
```

### 6. Messaging & Notifications

```sql
-- ═══════════════════════════════════════════════════════════════
-- CONVERSATIONS
-- Chat threads between brands and influencers
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Participants
    campaign_id UUID REFERENCES campaigns(id),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'archived', 'blocked')),
    
    -- Last message preview
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    
    -- Read status
    influencer_unread_count INTEGER DEFAULT 0,
    company_unread_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_influencer ON conversations(influencer_id);
CREATE INDEX idx_conversations_company ON conversations(company_id);
CREATE INDEX idx_conversations_campaign ON conversations(campaign_id);

-- ═══════════════════════════════════════════════════════════════
-- MESSAGES
-- Individual messages in conversations
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    
    -- Content
    message_type VARCHAR(20) DEFAULT 'text'
        CHECK (message_type IN ('text', 'image', 'file', 'system')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- System notifications for users
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    campaign_id UUID REFERENCES campaigns(id),
    influencer_id UUID REFERENCES influencers(id),
    company_id UUID REFERENCES companies(id),
    
    -- Action
    action_url TEXT,
    action_text VARCHAR(100),
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

### 7. Analytics & Reporting

```sql
-- ═══════════════════════════════════════════════════════════════
-- INFLUENCER ANALYTICS
-- Daily stats for influencers
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE influencer_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    
    -- Date
    date DATE NOT NULL,
    
    -- Stats
    profile_views INTEGER DEFAULT 0,
    campaign_invites INTEGER DEFAULT 0,
    campaigns_accepted INTEGER DEFAULT 0,
    content_published INTEGER DEFAULT 0,
    
    -- Earnings
    earnings_gross DECIMAL(10,2) DEFAULT 0,
    earnings_net DECIMAL(10,2) DEFAULT 0,
    
    -- Social growth
    followers_instagram INTEGER DEFAULT 0,
    followers_tiktok INTEGER DEFAULT 0,
    followers_youtube INTEGER DEFAULT 0,
    followers_twitter INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(influencer_id, date)
);

CREATE INDEX idx_influencer_analytics_influencer ON influencer_analytics(influencer_id);
CREATE INDEX idx_influencer_analytics_date ON influencer_analytics(date);

-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGN ANALYTICS
-- Daily stats for campaigns
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    
    -- Date
    date DATE NOT NULL,
    
    -- Engagement
    total_reach INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    
    -- Content
    content_published INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, date)
);

CREATE INDEX idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_date ON campaign_analytics(date);

-- ═══════════════════════════════════════════════════════════════
-- PLATFORM ANALYTICS
-- Platform-wide stats for admin dashboard
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE platform_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Date
    date DATE NOT NULL UNIQUE,
    
    -- Users
    new_influencers INTEGER DEFAULT 0,
    new_companies INTEGER DEFAULT 0,
    active_influencers INTEGER DEFAULT 0,
    active_companies INTEGER DEFAULT 0,
    
    -- Campaigns
    campaigns_created INTEGER DEFAULT 0,
    campaigns_completed INTEGER DEFAULT 0,
    
    -- Revenue
    total_campaign_value DECIMAL(14,2) DEFAULT 0,
    platform_revenue DECIMAL(12,2) DEFAULT 0,
    payouts_processed DECIMAL(14,2) DEFAULT 0,
    
    -- Content
    content_pieces_created INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_platform_analytics_date ON platform_analytics(date);
```

### 8. Categories & Tags

```sql
-- ═══════════════════════════════════════════════════════════════
-- CATEGORIES
-- Content categories for matching
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Info
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    
    -- Hierarchy
    parent_id UUID REFERENCES categories(id),
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Initial categories
INSERT INTO categories (name, slug, icon) VALUES
    ('Fashion & Style', 'fashion-style', '👗'),
    ('Beauty', 'beauty', '💄'),
    ('Fitness & Health', 'fitness-health', '💪'),
    ('Food & Drink', 'food-drink', '🍔'),
    ('Travel', 'travel', '✈️'),
    ('Lifestyle', 'lifestyle', '🌟'),
    ('Technology', 'technology', '📱'),
    ('Gaming', 'gaming', '🎮'),
    ('Parenting', 'parenting', '👶'),
    ('Finance', 'finance', '💰'),
    ('Education', 'education', '📚'),
    ('Entertainment', 'entertainment', '🎬'),
    ('Sports', 'sports', '⚽'),
    ('Business', 'business', '💼'),
    ('Art & Design', 'art-design', '🎨'),
    ('Music', 'music', '🎵'),
    ('Automotive', 'automotive', '🚗'),
    ('Home & Garden', 'home-garden', '🏡'),
    ('Pets', 'pets', '🐕'),
    ('Photography', 'photography', '📸');
```

### 9. Triggers & Functions

```sql
-- ═══════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- Auto-update updated_at timestamp
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- INFLUENCER STATS UPDATE
-- Recalculate influencer stats when social accounts change
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_influencer_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE influencers 
    SET 
        total_followers = (
            SELECT COALESCE(SUM(followers), 0) 
            FROM social_accounts 
            WHERE influencer_id = NEW.influencer_id AND is_connected = TRUE
        ),
        average_engagement_rate = (
            SELECT COALESCE(AVG(engagement_rate), 0) 
            FROM social_accounts 
            WHERE influencer_id = NEW.influencer_id AND is_connected = TRUE
        ),
        updated_at = NOW()
    WHERE id = NEW.influencer_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_influencer_stats_trigger 
AFTER INSERT OR UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_influencer_stats();

-- ═══════════════════════════════════════════════════════════════
-- WALLET BALANCE UPDATE
-- Update wallet when earnings status changes
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- When earning becomes available
    IF NEW.status = 'available' AND OLD.status != 'available' THEN
        UPDATE influencer_wallets
        SET 
            available_balance = available_balance + NEW.net_amount,
            pending_balance = pending_balance - NEW.net_amount,
            last_transaction_at = NOW(),
            updated_at = NOW()
        WHERE influencer_id = NEW.influencer_id;
    END IF;
    
    -- When earning is first credited (pending)
    IF NEW.status = 'pending' AND OLD IS NULL THEN
        UPDATE influencer_wallets
        SET 
            pending_balance = pending_balance + NEW.net_amount,
            total_earned = total_earned + NEW.net_amount,
            last_transaction_at = NOW(),
            updated_at = NOW()
        WHERE influencer_id = NEW.influencer_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wallet_on_earning 
AFTER INSERT OR UPDATE ON earnings
    FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();

-- ═══════════════════════════════════════════════════════════════
-- CREATOR LEVEL UPDATE
-- Update creator level based on total earnings
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_creator_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level VARCHAR(30);
    new_fee DECIMAL(4,2);
BEGIN
    -- Determine level based on total earnings
    IF NEW.total_earned >= 1000000 THEN
        new_level := 'elite';
        new_fee := 5.00;
    ELSIF NEW.total_earned >= 500000 THEN
        new_level := 'pro';
        new_fee := 6.00;
    ELSIF NEW.total_earned >= 250000 THEN
        new_level := 'verified';
        new_fee := 7.00;
    ELSIF NEW.total_earned >= 100000 THEN
        new_level := 'rising_star';
        new_fee := 8.00;
    ELSIF NEW.total_earned >= 25000 THEN
        new_level := 'creator';
        new_fee := 9.00;
    ELSE
        new_level := 'newcomer';
        new_fee := 10.00;
    END IF;
    
    -- Only update if level changed
    IF NEW.level != new_level THEN
        NEW.level := new_level;
        NEW.platform_fee_percentage := new_fee;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_level_on_earnings 
BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_creator_level();
```

---

## 📋 SUMMARY

### Table Count: 25 Tables

| Category | Tables |
|----------|--------|
| Users & Auth | 2 |
| Influencers | 4 |
| Companies | 2 |
| Campaigns | 3 |
| Payments | 6 |
| Messaging | 3 |
| Analytics | 3 |
| Categories | 1 |
| **Total** | **24** |

### Key Relationships

1. **User → Influencer** (1:1)
2. **User → Company Member** (Many:Many through company_members)
3. **Influencer → Social Accounts** (1:Many)
4. **Company → Campaigns** (1:Many)
5. **Campaign → Invitations → Influencers** (Many:Many)
6. **Campaign → Content** (1:Many)
7. **Campaign → Escrow** (1:1)
8. **Influencer → Wallet** (1:1)
9. **Influencer → Earnings** (1:Many)
10. **Influencer → Payouts** (1:Many)

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Database:** PostgreSQL 14+


