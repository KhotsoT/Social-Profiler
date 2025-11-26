# 💱 Multi-Currency Database Schema

## Supporting Global Operations

---

## 🌍 CURRENCY INFRASTRUCTURE

### Currency Configuration Table

```sql
-- ═══════════════════════════════════════════════════════════════
-- CURRENCIES
-- Supported currencies and their configurations
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE currencies (
    code VARCHAR(3) PRIMARY KEY,  -- ISO 4217 code
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    symbol_position VARCHAR(10) DEFAULT 'before' 
        CHECK (symbol_position IN ('before', 'after')),
    decimal_places INTEGER DEFAULT 2,
    
    -- Display format
    thousand_separator VARCHAR(1) DEFAULT ',',
    decimal_separator VARCHAR(1) DEFAULT '.',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_payout_supported BOOLEAN DEFAULT TRUE,
    is_payment_supported BOOLEAN DEFAULT TRUE,
    
    -- Minimum amounts
    min_payout_amount DECIMAL(12,2),
    min_campaign_amount DECIMAL(12,2),
    
    -- Timestamps
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
    ('AED', 'UAE Dirham', 'د.إ', 'after', 200.00, 400.00);

-- ═══════════════════════════════════════════════════════════════
-- EXCHANGE RATES
-- Historical and current exchange rates
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Currency pair (always relative to USD as base)
    from_currency VARCHAR(3) DEFAULT 'USD',
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    
    -- Rate
    rate DECIMAL(18,8) NOT NULL,
    
    -- Source
    source VARCHAR(50) DEFAULT 'api',  -- 'api', 'manual', 'fallback'
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_valid ON exchange_rates(valid_from, valid_until);

-- ═══════════════════════════════════════════════════════════════
-- LOCKED EXCHANGE RATES
-- Rates locked at campaign creation for consistency
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE locked_exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference to what locked this rate
    campaign_id UUID REFERENCES campaigns(id),
    escrow_id UUID REFERENCES campaign_escrow(id),
    
    -- Currency pair
    from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    
    -- Locked rate
    locked_rate DECIMAL(18,8) NOT NULL,
    
    -- When it was locked
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Rate source at time of lock
    source_rate_id UUID REFERENCES exchange_rates(id)
);

CREATE INDEX idx_locked_rates_campaign ON locked_exchange_rates(campaign_id);
```

### Countries & Regions

```sql
-- ═══════════════════════════════════════════════════════════════
-- COUNTRIES
-- Country configurations with default currencies
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE countries (
    code VARCHAR(2) PRIMARY KEY,  -- ISO 3166-1 alpha-2
    code_alpha3 VARCHAR(3) UNIQUE, -- ISO 3166-1 alpha-3
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    
    -- Currency
    default_currency VARCHAR(3) REFERENCES currencies(code),
    
    -- Region
    region VARCHAR(50),
    subregion VARCHAR(50),
    
    -- Localization
    languages TEXT[] DEFAULT '{}',
    timezone VARCHAR(50),
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    
    -- Platform availability
    is_creator_available BOOLEAN DEFAULT FALSE,
    is_brand_available BOOLEAN DEFAULT FALSE,
    
    -- Payment providers available
    payment_providers TEXT[] DEFAULT '{}',
    payout_providers TEXT[] DEFAULT '{}',
    
    -- Flags & emoji
    flag_emoji VARCHAR(10),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    launch_date DATE,
    
    -- Timestamps
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
    ('AE', 'ARE', 'United Arab Emirates', 'AED', 'Middle East', '🇦🇪', TRUE, TRUE, '{"stripe"}', '{"bank"}');
```

---

## 👤 UPDATED USER SCHEMA

### User Currency Preferences

```sql
-- Add currency fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    preferred_currency VARCHAR(3) REFERENCES currencies(code),
    country_code VARCHAR(2) REFERENCES countries(code),
    timezone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en';

-- Add to influencers
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS
    payout_currency VARCHAR(3) REFERENCES currencies(code),
    country_code VARCHAR(2) REFERENCES countries(code);

-- Add to companies  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
    billing_currency VARCHAR(3) REFERENCES currencies(code),
    country_code VARCHAR(2) REFERENCES countries(code);
```

---

## 💰 MULTI-CURRENCY CAMPAIGNS

### Updated Campaign Schema

```sql
-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGNS (Multi-Currency Update)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS
    -- Brand's currency (what they pay in)
    brand_currency VARCHAR(3) REFERENCES currencies(code),
    
    -- Budget in brand's currency
    budget_brand_currency DECIMAL(12,2),
    platform_fee_brand_currency DECIMAL(10,2),
    total_brand_currency DECIMAL(12,2),
    
    -- Target markets (countries)
    target_countries TEXT[] DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGN INVITATIONS (Multi-Currency)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE campaign_invitations ADD COLUMN IF NOT EXISTS
    -- Creator sees amount in their currency
    creator_currency VARCHAR(3) REFERENCES currencies(code),
    offered_amount_creator_currency DECIMAL(10,2),
    
    -- Reference amount in brand's currency
    offered_amount_brand_currency DECIMAL(10,2),
    brand_currency VARCHAR(3) REFERENCES currencies(code),
    
    -- Locked exchange rate used
    locked_rate_id UUID REFERENCES locked_exchange_rates(id);
```

---

## 🏦 MULTI-CURRENCY PAYMENTS

### Updated Payment Tables

```sql
-- ═══════════════════════════════════════════════════════════════
-- CAMPAIGN ESCROW (Multi-Currency)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE campaign_escrow ADD COLUMN IF NOT EXISTS
    -- Funding currency (brand's currency)
    funding_currency VARCHAR(3) REFERENCES currencies(code),
    
    -- Amounts in funding currency
    campaign_amount_funding DECIMAL(12,2),
    platform_fee_funding DECIMAL(10,2),
    total_amount_funding DECIMAL(12,2);

-- ═══════════════════════════════════════════════════════════════
-- EARNINGS (Multi-Currency)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE earnings ADD COLUMN IF NOT EXISTS
    -- Creator's currency
    creator_currency VARCHAR(3) REFERENCES currencies(code),
    
    -- Amounts in creator's currency
    gross_amount_creator_currency DECIMAL(10,2),
    platform_fee_creator_currency DECIMAL(10,2),
    net_amount_creator_currency DECIMAL(10,2),
    
    -- Original brand amounts (for reference)
    gross_amount_brand_currency DECIMAL(10,2),
    brand_currency VARCHAR(3),
    
    -- Exchange rate used
    exchange_rate_used DECIMAL(18,8),
    locked_rate_id UUID REFERENCES locked_exchange_rates(id);

-- ═══════════════════════════════════════════════════════════════
-- INFLUENCER WALLETS (Multi-Currency)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE influencer_wallets ADD COLUMN IF NOT EXISTS
    -- Wallet currency
    currency VARCHAR(3) REFERENCES currencies(code);

-- ═══════════════════════════════════════════════════════════════
-- PAYOUTS (Multi-Currency)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS
    -- Payout currency
    currency VARCHAR(3) REFERENCES currencies(code);

-- ═══════════════════════════════════════════════════════════════
-- TRANSACTIONS (Multi-Currency)
-- ═══════════════════════════════════════════════════════════════
-- Already has currency field, but let's ensure it's there
ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
    -- For cross-border, track both currencies
    original_currency VARCHAR(3),
    original_amount DECIMAL(12,2),
    exchange_rate_used DECIMAL(18,8);
```

---

## 💱 CURRENCY CONVERSION FUNCTIONS

```sql
-- ═══════════════════════════════════════════════════════════════
-- GET CURRENT EXCHANGE RATE
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS DECIMAL(18,8) AS $$
DECLARE
    v_rate DECIMAL(18,8);
    v_from_usd_rate DECIMAL(18,8);
    v_to_usd_rate DECIMAL(18,8);
BEGIN
    -- Same currency
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
    -- Direct rate from USD
    IF p_from_currency = 'USD' THEN
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE from_currency = 'USD' 
          AND to_currency = p_to_currency
          AND valid_from <= NOW()
          AND (valid_until IS NULL OR valid_until > NOW())
        ORDER BY valid_from DESC
        LIMIT 1;
        
        RETURN COALESCE(v_rate, 1.0);
    END IF;
    
    -- Direct rate to USD
    IF p_to_currency = 'USD' THEN
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE from_currency = 'USD' 
          AND to_currency = p_from_currency
          AND valid_from <= NOW()
          AND (valid_until IS NULL OR valid_until > NOW())
        ORDER BY valid_from DESC
        LIMIT 1;
        
        RETURN COALESCE(1.0 / v_rate, 1.0);
    END IF;
    
    -- Cross rate via USD
    SELECT rate INTO v_from_usd_rate
    FROM exchange_rates
    WHERE from_currency = 'USD' 
      AND to_currency = p_from_currency
      AND valid_from <= NOW()
      AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY valid_from DESC
    LIMIT 1;
    
    SELECT rate INTO v_to_usd_rate
    FROM exchange_rates
    WHERE from_currency = 'USD' 
      AND to_currency = p_to_currency
      AND valid_from <= NOW()
      AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY valid_from DESC
    LIMIT 1;
    
    IF v_from_usd_rate IS NOT NULL AND v_to_usd_rate IS NOT NULL THEN
        RETURN v_to_usd_rate / v_from_usd_rate;
    END IF;
    
    RETURN 1.0;  -- Fallback
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- CONVERT AMOUNT BETWEEN CURRENCIES
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(12,2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_rate DECIMAL(18,8);
BEGIN
    v_rate := get_exchange_rate(p_from_currency, p_to_currency);
    RETURN ROUND(p_amount * v_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- LOCK EXCHANGE RATE FOR CAMPAIGN
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION lock_campaign_exchange_rate(
    p_campaign_id UUID,
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS UUID AS $$
DECLARE
    v_rate DECIMAL(18,8);
    v_locked_id UUID;
BEGIN
    v_rate := get_exchange_rate(p_from_currency, p_to_currency);
    
    INSERT INTO locked_exchange_rates (
        campaign_id, from_currency, to_currency, locked_rate
    ) VALUES (
        p_campaign_id, p_from_currency, p_to_currency, v_rate
    ) RETURNING id INTO v_locked_id;
    
    RETURN v_locked_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- FORMAT CURRENCY FOR DISPLAY
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION format_currency(
    p_amount DECIMAL(12,2),
    p_currency_code VARCHAR(3)
) RETURNS TEXT AS $$
DECLARE
    v_currency RECORD;
    v_formatted TEXT;
BEGIN
    SELECT * INTO v_currency FROM currencies WHERE code = p_currency_code;
    
    IF v_currency IS NULL THEN
        RETURN p_amount::TEXT;
    END IF;
    
    -- Format number with separators
    v_formatted := TO_CHAR(p_amount, 'FM999,999,999.00');
    
    -- Apply currency symbol
    IF v_currency.symbol_position = 'before' THEN
        RETURN v_currency.symbol || v_formatted;
    ELSE
        RETURN v_formatted || ' ' || v_currency.symbol;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 MULTI-CURRENCY RATE CARDS

```sql
-- ═══════════════════════════════════════════════════════════════
-- INFLUENCER RATE CARDS (Multi-Currency)
-- Now rates are stored in creator's local currency
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE influencer_rate_cards ADD COLUMN IF NOT EXISTS
    currency VARCHAR(3) REFERENCES currencies(code);

-- View for displaying rates in any currency
CREATE OR REPLACE VIEW influencer_rates_multi_currency AS
SELECT 
    rc.id,
    rc.influencer_id,
    rc.platform,
    rc.currency as native_currency,
    rc.story_rate,
    rc.post_rate,
    rc.reel_rate,
    rc.video_rate,
    -- USD equivalents
    convert_currency(rc.story_rate, rc.currency, 'USD') as story_rate_usd,
    convert_currency(rc.post_rate, rc.currency, 'USD') as post_rate_usd,
    convert_currency(rc.reel_rate, rc.currency, 'USD') as reel_rate_usd,
    convert_currency(rc.video_rate, rc.currency, 'USD') as video_rate_usd,
    i.country_code
FROM influencer_rate_cards rc
JOIN influencers i ON rc.influencer_id = i.id;
```

---

## 🌍 GLOBAL ANALYTICS TABLES

```sql
-- ═══════════════════════════════════════════════════════════════
-- CROSS-BORDER ANALYTICS
-- Track campaigns flowing between countries
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE cross_border_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Date
    date DATE NOT NULL,
    
    -- Corridor
    brand_country VARCHAR(2) REFERENCES countries(code),
    creator_country VARCHAR(2) REFERENCES countries(code),
    
    -- Metrics
    campaigns_count INTEGER DEFAULT 0,
    total_value_usd DECIMAL(14,2) DEFAULT 0,
    creators_count INTEGER DEFAULT 0,
    
    -- Aggregated performance
    total_reach INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, brand_country, creator_country)
);

CREATE INDEX idx_cross_border_date ON cross_border_analytics(date);
CREATE INDEX idx_cross_border_corridor ON cross_border_analytics(brand_country, creator_country);

-- ═══════════════════════════════════════════════════════════════
-- CURRENCY CONVERSION ANALYTICS
-- Track FX volumes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE fx_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Date
    date DATE NOT NULL,
    
    -- Currency pair
    from_currency VARCHAR(3) REFERENCES currencies(code),
    to_currency VARCHAR(3) REFERENCES currencies(code),
    
    -- Volumes
    conversion_count INTEGER DEFAULT 0,
    volume_from_currency DECIMAL(14,2) DEFAULT 0,
    volume_to_currency DECIMAL(14,2) DEFAULT 0,
    volume_usd DECIMAL(14,2) DEFAULT 0,
    
    -- Rate used (average for the day)
    avg_rate DECIMAL(18,8),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, from_currency, to_currency)
);

CREATE INDEX idx_fx_analytics_date ON fx_analytics(date);
CREATE INDEX idx_fx_analytics_pair ON fx_analytics(from_currency, to_currency);
```

---

## 🔄 EXCHANGE RATE SYNC JOB

```sql
-- ═══════════════════════════════════════════════════════════════
-- PROCEDURE: Sync Exchange Rates from External API
-- Called by scheduled job every hour
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE PROCEDURE sync_exchange_rates(
    p_rates JSONB  -- {"ZAR": 18.92, "NGN": 1625.50, ...}
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_currency VARCHAR(3);
    v_rate DECIMAL(18,8);
BEGIN
    -- Loop through provided rates
    FOR v_currency, v_rate IN 
        SELECT key, value::DECIMAL(18,8) 
        FROM jsonb_each_text(p_rates)
    LOOP
        -- Insert new rate
        INSERT INTO exchange_rates (
            from_currency, to_currency, rate, source
        ) VALUES (
            'USD', v_currency, v_rate, 'api'
        );
        
        -- Update previous rate's validity
        UPDATE exchange_rates
        SET valid_until = NOW()
        WHERE from_currency = 'USD'
          AND to_currency = v_currency
          AND valid_until IS NULL
          AND id != (
              SELECT id FROM exchange_rates
              WHERE from_currency = 'USD' AND to_currency = v_currency
              ORDER BY created_at DESC
              LIMIT 1
          );
    END LOOP;
END;
$$;
```

---

## 📋 SUMMARY

### New Tables Added

| Table | Purpose |
|-------|---------|
| `currencies` | Supported currencies configuration |
| `exchange_rates` | Historical and current FX rates |
| `locked_exchange_rates` | Campaign-specific locked rates |
| `countries` | Country configurations |
| `cross_border_analytics` | Track cross-border flows |
| `fx_analytics` | Track currency conversion volumes |

### Key Fields Added to Existing Tables

| Table | New Fields |
|-------|------------|
| `users` | `preferred_currency`, `country_code`, `timezone`, `language` |
| `influencers` | `payout_currency`, `country_code` |
| `companies` | `billing_currency`, `country_code` |
| `campaigns` | `brand_currency`, `budget_brand_currency`, `target_countries` |
| `campaign_invitations` | `creator_currency`, `offered_amount_creator_currency` |
| `earnings` | Multi-currency amounts and locked rates |
| `wallets` | `currency` |
| `payouts` | `currency` |
| `transactions` | `original_currency`, `original_amount`, `exchange_rate_used` |

### Key Functions

| Function | Purpose |
|----------|---------|
| `get_exchange_rate()` | Get current rate between currencies |
| `convert_currency()` | Convert amount between currencies |
| `lock_campaign_exchange_rate()` | Lock rate for a campaign |
| `format_currency()` | Format amount for display |

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Purpose:** Support multi-currency global operations


