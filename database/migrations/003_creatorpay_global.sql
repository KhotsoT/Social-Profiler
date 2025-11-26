-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003: CreatorPay Global Platform Schema
-- Transforms Social Profiler into a global multi-currency influencer marketplace
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: CURRENCIES & COUNTRIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Currencies Table
CREATE TABLE IF NOT EXISTS currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    symbol_position VARCHAR(10) DEFAULT 'before' CHECK (symbol_position IN ('before', 'after')),
    decimal_places INTEGER DEFAULT 2,
    thousand_separator VARCHAR(1) DEFAULT ',',
    decimal_separator VARCHAR(1) DEFAULT '.',
    is_active BOOLEAN DEFAULT TRUE,
    is_payout_supported BOOLEAN DEFAULT TRUE,
    is_payment_supported BOOLEAN DEFAULT TRUE,
    min_payout_amount DECIMAL(12,2),
    min_campaign_amount DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert supported currencies
INSERT INTO currencies (code, name, symbol, symbol_position, min_payout_amount, min_campaign_amount) VALUES
    ('USD', 'US Dollar', '$', 'before', 50.00, 100.00),
    ('GBP', 'British Pound', '£', 'before', 40.00, 80.00),
    ('EUR', 'Euro', '€', 'before', 45.00, 90.00),
    ('ZAR', 'South African Rand', 'R', 'before', 500.00, 1000.00),
    ('NGN', 'Nigerian Naira', '₦', 'before', 25000.00, 50000.00),
    ('KES', 'Kenyan Shilling', 'KSh', 'before', 5000.00, 10000.00),
    ('GHS', 'Ghanaian Cedi', '₵', 'before', 300.00, 600.00),
    ('INR', 'Indian Rupee', '₹', 'before', 2000.00, 5000.00),
    ('BRL', 'Brazilian Real', 'R$', 'before', 200.00, 500.00),
    ('AUD', 'Australian Dollar', 'A$', 'before', 60.00, 120.00),
    ('CAD', 'Canadian Dollar', 'C$', 'before', 60.00, 120.00),
    ('AED', 'UAE Dirham', 'د.إ', 'after', 200.00, 400.00)
ON CONFLICT (code) DO NOTHING;

-- Countries Table
CREATE TABLE IF NOT EXISTS countries (
    code VARCHAR(2) PRIMARY KEY,
    code_alpha3 VARCHAR(3) UNIQUE,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    default_currency VARCHAR(3) REFERENCES currencies(code),
    region VARCHAR(50),
    subregion VARCHAR(50),
    languages TEXT[] DEFAULT '{}',
    timezone VARCHAR(50),
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    is_creator_available BOOLEAN DEFAULT FALSE,
    is_brand_available BOOLEAN DEFAULT FALSE,
    payment_providers TEXT[] DEFAULT '{}',
    payout_providers TEXT[] DEFAULT '{}',
    flag_emoji VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    launch_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert key countries
INSERT INTO countries (code, code_alpha3, name, default_currency, region, flag_emoji, is_creator_available, is_brand_available, payment_providers, payout_providers) VALUES
    ('ZA', 'ZAF', 'South Africa', 'ZAR', 'Africa', '🇿🇦', TRUE, TRUE, '{"stripe","payfast"}', '{"bank","paypal"}'),
    ('NG', 'NGA', 'Nigeria', 'NGN', 'Africa', '🇳🇬', TRUE, TRUE, '{"paystack","flutterwave"}', '{"bank","mobile"}'),
    ('KE', 'KEN', 'Kenya', 'KES', 'Africa', '🇰🇪', TRUE, TRUE, '{"flutterwave","mpesa"}', '{"bank","mpesa"}'),
    ('GH', 'GHA', 'Ghana', 'GHS', 'Africa', '🇬🇭', TRUE, TRUE, '{"paystack"}', '{"bank","momo"}'),
    ('US', 'USA', 'United States', 'USD', 'Americas', '🇺🇸', TRUE, TRUE, '{"stripe"}', '{"bank","paypal"}'),
    ('GB', 'GBR', 'United Kingdom', 'GBP', 'Europe', '🇬🇧', TRUE, TRUE, '{"stripe"}', '{"bank","paypal","wise"}'),
    ('DE', 'DEU', 'Germany', 'EUR', 'Europe', '🇩🇪', TRUE, TRUE, '{"stripe"}', '{"bank","paypal"}'),
    ('FR', 'FRA', 'France', 'EUR', 'Europe', '🇫🇷', TRUE, TRUE, '{"stripe"}', '{"bank","paypal"}'),
    ('IN', 'IND', 'India', 'INR', 'Asia', '🇮🇳', TRUE, TRUE, '{"razorpay","stripe"}', '{"bank","upi"}'),
    ('BR', 'BRA', 'Brazil', 'BRL', 'Americas', '🇧🇷', TRUE, TRUE, '{"stripe"}', '{"bank","pix"}'),
    ('AU', 'AUS', 'Australia', 'AUD', 'Oceania', '🇦🇺', TRUE, TRUE, '{"stripe"}', '{"bank","paypal"}'),
    ('CA', 'CAN', 'Canada', 'CAD', 'Americas', '🇨🇦', TRUE, TRUE, '{"stripe"}', '{"bank","paypal"}'),
    ('AE', 'ARE', 'United Arab Emirates', 'AED', 'Middle East', '🇦🇪', TRUE, TRUE, '{"stripe"}', '{"bank"}')
ON CONFLICT (code) DO NOTHING;

-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) DEFAULT 'USD',
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    rate DECIMAL(18,8) NOT NULL,
    source VARCHAR(50) DEFAULT 'api',
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_valid ON exchange_rates(valid_from, valid_until);

-- Insert initial exchange rates (approximate - will be updated by API)
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
    ('USD', 'ZAR', 18.50),
    ('USD', 'NGN', 1550.00),
    ('USD', 'KES', 153.00),
    ('USD', 'GHS', 14.50),
    ('USD', 'GBP', 0.79),
    ('USD', 'EUR', 0.92),
    ('USD', 'INR', 83.50),
    ('USD', 'BRL', 4.95),
    ('USD', 'AUD', 1.53),
    ('USD', 'CAD', 1.36),
    ('USD', 'AED', 3.67)
ON CONFLICT DO NOTHING;

-- Locked Exchange Rates (for campaigns)
CREATE TABLE IF NOT EXISTS locked_exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID,
    escrow_id UUID,
    from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    locked_rate DECIMAL(18,8) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_rate_id UUID REFERENCES exchange_rates(id)
);

CREATE INDEX IF NOT EXISTS idx_locked_rates_campaign ON locked_exchange_rates(campaign_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: UPDATE USERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) REFERENCES currencies(code) DEFAULT 'ZAR';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) REFERENCES countries(code);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_campaigns": true, "email_payments": true, "push_campaigns": true, "push_payments": true}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'));

-- Update role check to include 'influencer'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'brand', 'influencer'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: ENHANCED INFLUENCERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new columns to influencers
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) REFERENCES countries(code) DEFAULT 'ZA';
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS payout_currency VARCHAR(3) REFERENCES currencies(code) DEFAULT 'ZAR';
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS average_engagement_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS level VARCHAR(30) DEFAULT 'newcomer' CHECK (level IN ('newcomer', 'creator', 'rising_star', 'verified', 'pro', 'elite'));
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12,2) DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(4,2) DEFAULT 10.00;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS profile_strength INTEGER DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS min_campaign_value DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_influencers_username ON influencers(username);
CREATE INDEX IF NOT EXISTS idx_influencers_country ON influencers(country_code);
CREATE INDEX IF NOT EXISTS idx_influencers_level ON influencers(level);
CREATE INDEX IF NOT EXISTS idx_influencers_available ON influencers(is_available);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: COMPANIES (BRANDS)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50) CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
    city VARCHAR(100),
    province VARCHAR(100),
    country_code VARCHAR(2) REFERENCES countries(code) DEFAULT 'ZA',
    billing_currency VARCHAR(3) REFERENCES currencies(code) DEFAULT 'ZAR',
    billing_email VARCHAR(255),
    billing_address JSONB,
    tax_number VARCHAR(50),
    total_campaigns INTEGER DEFAULT 0,
    total_spent DECIMAL(14,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country_code);

-- Company Team Members
CREATE TABLE IF NOT EXISTS company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID REFERENCES users(id),
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: ENHANCED CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new columns to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS objective VARCHAR(50) CHECK (objective IN ('awareness', 'product_launch', 'event', 'app_install', 'store_opening', 'giveaway', 'sales', 'engagement', 'other'));
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_platforms TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_categories TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_countries TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_follower_min INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_follower_max INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_engagement_min DECIMAL(5,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_requirements JSONB DEFAULT '{}'::jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS key_messages TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS dos TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS donts TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_assets JSONB DEFAULT '[]'::jsonb;

-- Multi-currency budget fields
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_currency VARCHAR(3) REFERENCES currencies(code) DEFAULT 'ZAR';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget_brand_currency DECIMAL(12,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_with_fees DECIMAL(12,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS per_influencer_budget DECIMAL(10,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS influencer_count INTEGER DEFAULT 1;

-- Campaign stats
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS invites_sent INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS invites_accepted INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_submitted INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_approved INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_published INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_reach INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_impressions INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_engagements INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS average_engagement_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_deadline DATE;

-- Update status options
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check CHECK (status IN ('draft', 'pending_payment', 'active', 'in_progress', 'review', 'completed', 'cancelled', 'paused'));

CREATE INDEX IF NOT EXISTS idx_campaigns_company ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_countries ON campaigns USING GIN(target_countries);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: CAMPAIGN INVITATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campaign_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    
    -- Multi-currency offer
    offered_amount DECIMAL(10,2) NOT NULL,
    creator_currency VARCHAR(3) REFERENCES currencies(code),
    offered_amount_creator_currency DECIMAL(10,2),
    brand_currency VARCHAR(3) REFERENCES currencies(code),
    offered_amount_brand_currency DECIMAL(10,2),
    locked_rate_id UUID REFERENCES locked_exchange_rates(id),
    
    content_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn')),
    response_deadline TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    decline_reason TEXT,
    counter_offer_amount DECIMAL(10,2),
    counter_offer_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_campaign ON campaign_invitations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invitations_influencer ON campaign_invitations(influencer_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON campaign_invitations(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 7: CAMPAIGN CONTENT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campaign_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    invitation_id UUID REFERENCES campaign_invitations(id),
    
    platform VARCHAR(30) NOT NULL,
    content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('story', 'post', 'reel', 'carousel', 'video', 'short', 'live', 'tweet')),
    content_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    published_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'in_review', 'revision_requested', 'approved', 'rejected', 'published')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    revision_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    submitted_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_campaign ON campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_influencer ON campaign_content(influencer_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON campaign_content(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 8: INFLUENCER RATE CARDS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS influencer_rate_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    currency VARCHAR(3) REFERENCES currencies(code) DEFAULT 'ZAR',
    story_rate DECIMAL(10,2),
    post_rate DECIMAL(10,2),
    reel_rate DECIMAL(10,2),
    video_rate DECIMAL(10,2),
    live_rate DECIMAL(10,2),
    carousel_rate DECIMAL(10,2),
    custom_packages JSONB DEFAULT '[]'::jsonb,
    is_auto_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(influencer_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_rate_cards_influencer ON influencer_rate_cards(influencer_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 9: PAYMENTS & WALLETS
-- ═══════════════════════════════════════════════════════════════════════════

-- Campaign Escrow
CREATE TABLE IF NOT EXISTS campaign_escrow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Multi-currency amounts
    funding_currency VARCHAR(3) REFERENCES currencies(code),
    campaign_amount DECIMAL(12,2) NOT NULL,
    campaign_amount_funding DECIMAL(12,2),
    platform_fee DECIMAL(10,2) NOT NULL,
    platform_fee_funding DECIMAL(10,2),
    total_amount DECIMAL(12,2) NOT NULL,
    total_amount_funding DECIMAL(12,2),
    
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'partially_released', 'fully_released', 'refunded', 'disputed')),
    amount_released DECIMAL(12,2) DEFAULT 0,
    amount_remaining DECIMAL(12,2),
    
    payment_provider VARCHAR(30),
    payment_reference VARCHAR(255),
    payment_method VARCHAR(50),
    
    funded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_campaign ON campaign_escrow(campaign_id);
CREATE INDEX IF NOT EXISTS idx_escrow_company ON campaign_escrow(company_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON campaign_escrow(status);

-- Influencer Wallets
CREATE TABLE IF NOT EXISTS influencer_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL UNIQUE REFERENCES influencers(id),
    currency VARCHAR(3) REFERENCES currencies(code) DEFAULT 'ZAR',
    available_balance DECIMAL(12,2) DEFAULT 0,
    pending_balance DECIMAL(12,2) DEFAULT 0,
    total_earned DECIMAL(14,2) DEFAULT 0,
    total_withdrawn DECIMAL(14,2) DEFAULT 0,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_influencer ON influencer_wallets(influencer_id);

-- Earnings
CREATE TABLE IF NOT EXISTS earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    content_id UUID REFERENCES campaign_content(id),
    escrow_id UUID REFERENCES campaign_escrow(id),
    
    -- Amounts in creator's currency
    creator_currency VARCHAR(3) REFERENCES currencies(code),
    gross_amount DECIMAL(10,2) NOT NULL,
    gross_amount_creator_currency DECIMAL(10,2),
    platform_fee DECIMAL(10,2) NOT NULL,
    platform_fee_creator_currency DECIMAL(10,2),
    platform_fee_percentage DECIMAL(4,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    net_amount_creator_currency DECIMAL(10,2),
    
    -- Original brand amounts
    brand_currency VARCHAR(3),
    gross_amount_brand_currency DECIMAL(10,2),
    exchange_rate_used DECIMAL(18,8),
    locked_rate_id UUID REFERENCES locked_exchange_rates(id),
    
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'available', 'withdrawn', 'cancelled')),
    available_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_influencer ON earnings(influencer_id);
CREATE INDEX IF NOT EXISTS idx_earnings_campaign ON earnings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);

-- Payout Accounts
CREATE TABLE IF NOT EXISTS payout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('bank_account', 'paypal', 'mobile_money')),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(200),
    account_number_last4 VARCHAR(4),
    account_number_encrypted TEXT,
    branch_code VARCHAR(20),
    account_type_bank VARCHAR(20),
    paypal_email VARCHAR(255),
    mobile_number VARCHAR(20),
    mobile_provider VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_influencer ON payout_accounts(influencer_id);

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    payout_account_id UUID NOT NULL REFERENCES payout_accounts(id),
    currency VARCHAR(3) REFERENCES currencies(code),
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    is_instant BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    payment_provider VARCHAR(30),
    payment_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_influencer ON payouts(influencer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- Transactions (Audit Log)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    influencer_id UUID REFERENCES influencers(id),
    company_id UUID REFERENCES companies(id),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'campaign_funding', 'campaign_refund',
        'earning_credited', 'earning_available',
        'payout_requested', 'payout_completed', 'payout_failed',
        'platform_fee', 'instant_payout_fee'
    )),
    campaign_id UUID REFERENCES campaigns(id),
    escrow_id UUID REFERENCES campaign_escrow(id),
    earning_id UUID REFERENCES earnings(id),
    payout_id UUID REFERENCES payouts(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    original_currency VARCHAR(3),
    original_amount DECIMAL(12,2),
    exchange_rate_used DECIMAL(18,8),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('credit', 'debit')),
    balance_after DECIMAL(12,2),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_influencer ON transactions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 10: MESSAGING & NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    influencer_id UUID NOT NULL REFERENCES influencers(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    influencer_unread_count INTEGER DEFAULT 0,
    company_unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_influencer ON conversations(influencer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_campaign ON conversations(campaign_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    campaign_id UUID REFERENCES campaigns(id),
    influencer_id UUID REFERENCES influencers(id),
    company_id UUID REFERENCES companies(id),
    action_url TEXT,
    action_text VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 11: CATEGORIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    parent_id UUID REFERENCES categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Insert default categories
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
    ('Photography', 'photography', '📸')
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 12: ANALYTICS
-- ═══════════════════════════════════════════════════════════════════════════

-- Cross-Border Analytics
CREATE TABLE IF NOT EXISTS cross_border_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    brand_country VARCHAR(2) REFERENCES countries(code),
    creator_country VARCHAR(2) REFERENCES countries(code),
    campaigns_count INTEGER DEFAULT 0,
    total_value_usd DECIMAL(14,2) DEFAULT 0,
    creators_count INTEGER DEFAULT 0,
    total_reach INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, brand_country, creator_country)
);

CREATE INDEX IF NOT EXISTS idx_cross_border_date ON cross_border_analytics(date);
CREATE INDEX IF NOT EXISTS idx_cross_border_corridor ON cross_border_analytics(brand_country, creator_country);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 13: HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get current exchange rate
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS DECIMAL(18,8) AS $$
DECLARE
    v_rate DECIMAL(18,8);
    v_from_usd_rate DECIMAL(18,8);
    v_to_usd_rate DECIMAL(18,8);
BEGIN
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
    IF p_from_currency = 'USD' THEN
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE from_currency = 'USD' AND to_currency = p_to_currency
          AND valid_from <= NOW()
          AND (valid_until IS NULL OR valid_until > NOW())
        ORDER BY valid_from DESC LIMIT 1;
        RETURN COALESCE(v_rate, 1.0);
    END IF;
    
    IF p_to_currency = 'USD' THEN
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE from_currency = 'USD' AND to_currency = p_from_currency
          AND valid_from <= NOW()
          AND (valid_until IS NULL OR valid_until > NOW())
        ORDER BY valid_from DESC LIMIT 1;
        RETURN COALESCE(1.0 / NULLIF(v_rate, 0), 1.0);
    END IF;
    
    -- Cross rate via USD
    SELECT rate INTO v_from_usd_rate
    FROM exchange_rates
    WHERE from_currency = 'USD' AND to_currency = p_from_currency
      AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY valid_from DESC LIMIT 1;
    
    SELECT rate INTO v_to_usd_rate
    FROM exchange_rates
    WHERE from_currency = 'USD' AND to_currency = p_to_currency
      AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY valid_from DESC LIMIT 1;
    
    IF v_from_usd_rate IS NOT NULL AND v_to_usd_rate IS NOT NULL AND v_from_usd_rate != 0 THEN
        RETURN v_to_usd_rate / v_from_usd_rate;
    END IF;
    
    RETURN 1.0;
END;
$$ LANGUAGE plpgsql;

-- Convert currency
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(12,2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS DECIMAL(12,2) AS $$
BEGIN
    RETURN ROUND(p_amount * get_exchange_rate(p_from_currency, p_to_currency), 2);
END;
$$ LANGUAGE plpgsql;

-- Update influencer level based on earnings
CREATE OR REPLACE FUNCTION update_creator_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level VARCHAR(30);
    new_fee DECIMAL(4,2);
BEGIN
    IF NEW.total_earnings >= 1000000 THEN
        new_level := 'elite'; new_fee := 5.00;
    ELSIF NEW.total_earnings >= 500000 THEN
        new_level := 'pro'; new_fee := 6.00;
    ELSIF NEW.total_earnings >= 250000 THEN
        new_level := 'verified'; new_fee := 7.00;
    ELSIF NEW.total_earnings >= 100000 THEN
        new_level := 'rising_star'; new_fee := 8.00;
    ELSIF NEW.total_earnings >= 25000 THEN
        new_level := 'creator'; new_fee := 9.00;
    ELSE
        new_level := 'newcomer'; new_fee := 10.00;
    END IF;
    
    IF NEW.level IS DISTINCT FROM new_level THEN
        NEW.level := new_level;
        NEW.platform_fee_percentage := new_fee;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_level_on_earnings ON influencers;
CREATE TRIGGER update_level_on_earnings 
BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_creator_level();

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_content_updated_at BEFORE UPDATE ON campaign_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_escrow_updated_at BEFORE UPDATE ON campaign_escrow
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencer_wallets_updated_at BEFORE UPDATE ON influencer_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_cards_updated_at BEFORE UPDATE ON influencer_rate_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_accounts_updated_at BEFORE UPDATE ON payout_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════


