/**
 * CreatorPay Rate Calculator Service
 * Calculates influencer rates based on followers, engagement, and platform
 */

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { currencyService } from './currencyService';

// Platform CPM rates (Cost per 1000 followers) in USD
// These are base rates that get adjusted by engagement multiplier
const PLATFORM_CPM_USD: Record<string, Record<string, { min: number; max: number }>> = {
  instagram: {
    story: { min: 0.80, max: 1.20 },
    post: { min: 2.50, max: 4.00 },
    reel: { min: 4.00, max: 6.50 },
    carousel: { min: 3.00, max: 5.00 },
    live: { min: 3.00, max: 4.50 },
  },
  tiktok: {
    video: { min: 3.00, max: 5.00 },
    series: { min: 8.00, max: 12.00 },
  },
  youtube: {
    video: { min: 8.00, max: 20.00 },
    short: { min: 2.00, max: 4.00 },
  },
  twitter: {
    post: { min: 1.00, max: 2.00 },
    thread: { min: 2.00, max: 4.00 },
  },
  linkedin: {
    post: { min: 4.00, max: 8.00 },
    article: { min: 6.00, max: 12.00 },
  },
  facebook: {
    post: { min: 1.50, max: 3.00 },
    video: { min: 3.00, max: 6.00 },
  },
};

// Engagement rate multipliers
const ENGAGEMENT_MULTIPLIERS: Array<{ min: number; max: number; multiplier: number; label: string }> = [
  { min: 0, max: 1, multiplier: 0.6, label: 'Below Average' },
  { min: 1, max: 2, multiplier: 0.8, label: 'Average' },
  { min: 2, max: 4, multiplier: 1.0, label: 'Good' },
  { min: 4, max: 6, multiplier: 1.3, label: 'Great' },
  { min: 6, max: 10, multiplier: 1.6, label: 'Excellent' },
  { min: 10, max: 100, multiplier: 2.0, label: 'Exceptional' },
];

// Influencer tiers
const INFLUENCER_TIERS = [
  { min: 0, max: 1000, name: 'Nano', label: 'Nano (0-1K)' },
  { min: 1000, max: 10000, name: 'Micro', label: 'Micro (1K-10K)' },
  { min: 10000, max: 50000, name: 'Small', label: 'Small (10K-50K)' },
  { min: 50000, max: 100000, name: 'Mid', label: 'Mid (50K-100K)' },
  { min: 100000, max: 500000, name: 'Macro', label: 'Macro (100K-500K)' },
  { min: 500000, max: 1000000, name: 'Mega', label: 'Mega (500K-1M)' },
  { min: 1000000, max: Infinity, name: 'Celebrity', label: 'Celebrity (1M+)' },
];

export interface RateCard {
  platform: string;
  currency: string;
  rates: {
    story?: { min: number; max: number };
    post?: { min: number; max: number };
    reel?: { min: number; max: number };
    carousel?: { min: number; max: number };
    video?: { min: number; max: number };
    live?: { min: number; max: number };
    short?: { min: number; max: number };
    thread?: { min: number; max: number };
    article?: { min: number; max: number };
    series?: { min: number; max: number };
  };
}

export interface InfluencerRateProfile {
  influencer_id: string;
  display_name: string;
  username: string;
  tier: string;
  tier_label: string;
  total_followers: number;
  average_engagement_rate: number;
  engagement_label: string;
  engagement_percentile: string;
  currency: string;
  rate_cards: RateCard[];
  monthly_earning_potential: {
    min: number;
    max: number;
    formatted_min: string;
    formatted_max: string;
    campaigns_estimate: string;
  };
}

class RateCalculatorService {
  /**
   * Get engagement multiplier based on engagement rate
   */
  getEngagementMultiplier(engagementRate: number): { multiplier: number; label: string } {
    const tier = ENGAGEMENT_MULTIPLIERS.find(
      t => engagementRate >= t.min && engagementRate < t.max
    );
    return tier || { multiplier: 1.0, label: 'Average' };
  }

  /**
   * Get influencer tier based on follower count
   */
  getInfluencerTier(followers: number): { name: string; label: string } {
    const tier = INFLUENCER_TIERS.find(
      t => followers >= t.min && followers < t.max
    );
    return tier || { name: 'Nano', label: 'Nano (0-1K)' };
  }

  /**
   * Calculate rates for a specific platform
   */
  async calculatePlatformRates(
    followers: number,
    engagementRate: number,
    platform: string,
    currency: string
  ): Promise<RateCard> {
    const platformRates = PLATFORM_CPM_USD[platform.toLowerCase()];
    if (!platformRates) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const { multiplier } = this.getEngagementMultiplier(engagementRate);
    const exchangeRate = await currencyService.getExchangeRate('USD', currency);

    const rates: RateCard['rates'] = {};

    for (const [contentType, cpm] of Object.entries(platformRates)) {
      const followersK = followers / 1000;
      const minRate = Math.round(followersK * cpm.min * multiplier * exchangeRate);
      const maxRate = Math.round(followersK * cpm.max * multiplier * exchangeRate);

      rates[contentType as keyof RateCard['rates']] = { min: minRate, max: maxRate };
    }

    return {
      platform,
      currency,
      rates,
    };
  }

  /**
   * Calculate complete rate profile for an influencer
   */
  async calculateInfluencerRates(influencerId: string): Promise<InfluencerRateProfile> {
    try {
      // Get influencer details
      const influencerResult = await pool.query(
        `SELECT i.*, 
                COALESCE(i.display_name, i.name) as display_name,
                i.payout_currency as currency
         FROM influencers i
         WHERE i.id = $1`,
        [influencerId]
      );

      if (!influencerResult.rows[0]) {
        throw new Error('Influencer not found');
      }

      const influencer = influencerResult.rows[0];
      const currency = influencer.currency || 'ZAR';

      // Get social accounts
      const accountsResult = await pool.query(
        `SELECT platform, follower_count, engagement_rate
         FROM social_accounts
         WHERE influencer_id = $1 AND is_connected = TRUE`,
        [influencerId]
      );

      // Calculate total followers and average engagement
      const accounts = accountsResult.rows;
      const totalFollowers = accounts.reduce((sum: number, a: { follower_count: number }) => 
        sum + (a.follower_count || 0), 0);
      const avgEngagement = accounts.length > 0
        ? accounts.reduce((sum: number, a: { engagement_rate: number }) => 
            sum + (a.engagement_rate || 0), 0) / accounts.length
        : 0;

      const tier = this.getInfluencerTier(totalFollowers);
      const { multiplier, label: engagementLabel } = this.getEngagementMultiplier(avgEngagement);

      // Calculate rates for each connected platform
      const rateCards: RateCard[] = [];
      for (const account of accounts) {
        try {
          const rateCard = await this.calculatePlatformRates(
            account.follower_count,
            account.engagement_rate || avgEngagement,
            account.platform,
            currency
          );
          rateCards.push(rateCard);
        } catch (error) {
          logger.warn(`Could not calculate rates for platform ${account.platform}`);
        }
      }

      // Calculate monthly earning potential (assuming 3-5 campaigns)
      const avgRatePerCampaign = rateCards.reduce((sum, card) => {
        const rates = Object.values(card.rates);
        const avgRate = rates.reduce((s, r) => s + ((r.min + r.max) / 2), 0) / rates.length;
        return sum + avgRate;
      }, 0) / (rateCards.length || 1);

      const minMonthly = Math.round(avgRatePerCampaign * 3);
      const maxMonthly = Math.round(avgRatePerCampaign * 5);
      const currencyData = await currencyService.getCurrency(currency);

      // Determine engagement percentile
      let percentile = 'average';
      if (avgEngagement >= 6) percentile = 'top 15%';
      else if (avgEngagement >= 4) percentile = 'top 30%';
      else if (avgEngagement >= 2) percentile = 'top 50%';

      return {
        influencer_id: influencerId,
        display_name: influencer.display_name,
        username: influencer.username || '',
        tier: tier.name,
        tier_label: tier.label,
        total_followers: totalFollowers,
        average_engagement_rate: Math.round(avgEngagement * 100) / 100,
        engagement_label: engagementLabel,
        engagement_percentile: percentile,
        currency,
        rate_cards: rateCards,
        monthly_earning_potential: {
          min: minMonthly,
          max: maxMonthly,
          formatted_min: currencyService.formatAmount(minMonthly, currencyData),
          formatted_max: currencyService.formatAmount(maxMonthly, currencyData),
          campaigns_estimate: '3-5 campaigns',
        },
      };
    } catch (error) {
      logger.error('Error calculating influencer rates:', error);
      throw error;
    }
  }

  /**
   * Save rate card to database
   */
  async saveRateCard(influencerId: string, rateCard: RateCard): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO influencer_rate_cards (
           influencer_id, platform, currency,
           story_rate, post_rate, reel_rate, carousel_rate,
           video_rate, live_rate, is_auto_generated
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (influencer_id, platform) 
         DO UPDATE SET
           currency = EXCLUDED.currency,
           story_rate = EXCLUDED.story_rate,
           post_rate = EXCLUDED.post_rate,
           reel_rate = EXCLUDED.reel_rate,
           carousel_rate = EXCLUDED.carousel_rate,
           video_rate = EXCLUDED.video_rate,
           live_rate = EXCLUDED.live_rate,
           is_auto_generated = TRUE,
           updated_at = NOW()`,
        [
          influencerId,
          rateCard.platform,
          rateCard.currency,
          rateCard.rates.story?.max || null,
          rateCard.rates.post?.max || null,
          rateCard.rates.reel?.max || null,
          rateCard.rates.carousel?.max || null,
          rateCard.rates.video?.max || null,
          rateCard.rates.live?.max || null,
        ]
      );

      logger.info(`Saved rate card for influencer ${influencerId}, platform ${rateCard.platform}`);
    } catch (error) {
      logger.error('Error saving rate card:', error);
      throw error;
    }
  }

  /**
   * Generate and save rate cards for an influencer
   */
  async generateAndSaveRateCards(influencerId: string): Promise<InfluencerRateProfile> {
    const profile = await this.calculateInfluencerRates(influencerId);

    for (const rateCard of profile.rate_cards) {
      await this.saveRateCard(influencerId, rateCard);
    }

    // Update influencer profile completeness
    await pool.query(
      `UPDATE influencers 
       SET average_engagement_rate = $1, 
           true_follower_count = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [profile.average_engagement_rate, profile.total_followers, influencerId]
    );

    return profile;
  }

  /**
   * Quick rate estimate without database lookup (for landing page)
   */
  async quickRateEstimate(params: {
    platform: string;
    followers: number;
    engagement_rate?: number;
    currency?: string;
  }): Promise<{
    platform: string;
    followers: number;
    tier: string;
    engagement_label: string;
    currency: string;
    rates: Record<string, { min: number; max: number; formatted: string }>;
    monthly_potential: { min: number; max: number; formatted: string };
  }> {
    const engagement = params.engagement_rate || 3.0; // Default 3%
    const currency = params.currency || 'ZAR';

    const tier = this.getInfluencerTier(params.followers);
    const { label: engagementLabel } = this.getEngagementMultiplier(engagement);
    const rateCard = await this.calculatePlatformRates(
      params.followers,
      engagement,
      params.platform,
      currency
    );

    const currencyData = await currencyService.getCurrency(currency);
    const rates: Record<string, { min: number; max: number; formatted: string }> = {};

    for (const [type, rate] of Object.entries(rateCard.rates)) {
      rates[type] = {
        min: rate.min,
        max: rate.max,
        formatted: `${currencyService.formatAmount(rate.min, currencyData)} - ${currencyService.formatAmount(rate.max, currencyData)}`,
      };
    }

    // Calculate monthly potential
    const avgRate = Object.values(rateCard.rates).reduce(
      (sum, r) => sum + (r.min + r.max) / 2,
      0
    ) / Object.values(rateCard.rates).length;

    const monthlyMin = Math.round(avgRate * 3);
    const monthlyMax = Math.round(avgRate * 5);

    return {
      platform: params.platform,
      followers: params.followers,
      tier: tier.label,
      engagement_label: engagementLabel,
      currency,
      rates,
      monthly_potential: {
        min: monthlyMin,
        max: monthlyMax,
        formatted: `${currencyService.formatAmount(monthlyMin, currencyData)} - ${currencyService.formatAmount(monthlyMax, currencyData)}`,
      },
    };
  }
}

export const rateCalculatorService = new RateCalculatorService();
export default rateCalculatorService;


