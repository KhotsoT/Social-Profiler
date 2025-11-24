import { Influencer, SocialAccount } from './influencerService';
import { logger } from '../utils/logger';

/**
 * Service for categorizing influencers based on multiple dimensions:
 * - Follower count tiers
 * - Growth rate
 * - Engagement quality
 * - Platform presence
 * - Niche/industry
 * - Authenticity
 */
export class InfluencerCategorizationService {
  private readonly FOLLOWER_TIERS = {
    NANO: { min: 0, max: 10000 },
    MICRO: { min: 10000, max: 100000 },
    MACRO: { min: 100000, max: 1000000 },
    MEGA: { min: 1000000, max: 10000000 },
    CELEBRITY: { min: 10000000, max: Infinity },
  };

  private readonly ENGAGEMENT_THRESHOLDS = {
    HIGH: 5.0,
    MEDIUM: 2.0,
    LOW: 0.0,
  };

  /**
   * Categorize an influencer across all dimensions
   */
  async categorize(influencer: Influencer): Promise<string[]> {
    const categories: string[] = [];

    // Follower count category
    const followerCategory = this.categorizeByFollowerCount(influencer);
    if (followerCategory) categories.push(followerCategory);

    // Growth rate category
    const growthCategory = await this.categorizeByGrowthRate(influencer);
    if (growthCategory) categories.push(growthCategory);

    // Engagement category
    const engagementCategory = this.categorizeByEngagement(influencer);
    if (engagementCategory) categories.push(engagementCategory);

    // Platform category
    const platformCategories = this.categorizeByPlatform(influencer);
    categories.push(...platformCategories);

    // Niche category (would need content analysis in real implementation)
    const nicheCategories = await this.categorizeByNiche(influencer);
    categories.push(...nicheCategories);

    // Authenticity category
    const authenticityCategory = await this.categorizeByAuthenticity(influencer);
    if (authenticityCategory) categories.push(authenticityCategory);

    // Cross-platform category
    if (influencer.socialAccounts.length > 1) {
      categories.push('cross-platform');
    }

    // Rising star detection
    if (await this.isRisingStar(influencer)) {
      categories.push('rising-star');
    }

    logger.info(`Categorized influencer ${influencer.id} with ${categories.length} categories`);
    return [...new Set(categories)]; // Remove duplicates
  }

  /**
   * Categorize by total follower count
   */
  private categorizeByFollowerCount(influencer: Influencer): string | null {
    const totalFollowers = influencer.trueFollowerCount || 
      influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0);

    for (const [tier, range] of Object.entries(this.FOLLOWER_TIERS)) {
      if (totalFollowers >= range.min && totalFollowers < range.max) {
        return `tier-${tier.toLowerCase()}`;
      }
    }

    return null;
  }

  /**
   * Categorize by growth rate (requires historical data)
   */
  private async categorizeByGrowthRate(influencer: Influencer): Promise<string | null> {
    // In real implementation, would fetch historical data
    // For now, return based on recent account activity
    const recentAccounts = influencer.socialAccounts.filter(
      acc => new Date(acc.lastSyncedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    if (recentAccounts.length === 0) return null;

    // Would calculate actual growth rate from historical data
    // Placeholder logic
    return 'growth-stable'; // or 'growth-rising', 'growth-declining'
  }

  /**
   * Categorize by engagement rate
   */
  private categorizeByEngagement(influencer: Influencer): string | null {
    const avgEngagement = influencer.socialAccounts.reduce(
      (sum, acc) => sum + acc.engagementRate, 0
    ) / influencer.socialAccounts.length;

    if (avgEngagement >= this.ENGAGEMENT_THRESHOLDS.HIGH) {
      return 'engagement-high';
    } else if (avgEngagement >= this.ENGAGEMENT_THRESHOLDS.MEDIUM) {
      return 'engagement-medium';
    } else {
      return 'engagement-low';
    }
  }

  /**
   * Categorize by platform presence
   */
  private categorizeByPlatform(influencer: Influencer): string[] {
    const categories: string[] = [];
    
    influencer.socialAccounts.forEach(account => {
      categories.push(`platform-${account.platform}`);
      
      if (account.verified) {
        categories.push('verified');
      }
    });

    return categories;
  }

  /**
   * Categorize by niche/industry (requires content analysis)
   */
  private async categorizeByNiche(influencer: Influencer): Promise<string[]> {
    // In real implementation, would analyze:
    // - Bio content
    // - Post content
    // - Hashtags used
    // - Audience demographics
    
    // Placeholder - would use NLP/AI to determine niche
    const commonNiches = [
      'fashion', 'beauty', 'tech', 'food', 'travel', 'fitness',
      'lifestyle', 'business', 'entertainment', 'gaming', 'sports'
    ];

    // For now, return empty - would be populated by content analysis service
    return [];
  }

  /**
   * Categorize by authenticity (detect fake followers, bots)
   */
  private async categorizeByAuthenticity(influencer: Influencer): Promise<string | null> {
    // Check for suspicious patterns:
    // - Very high follower count but low engagement
    // - Sudden follower spikes
    // - Suspicious follower-to-following ratio
    
    const avgEngagement = influencer.socialAccounts.reduce(
      (sum, acc) => sum + acc.engagementRate, 0
    ) / influencer.socialAccounts.length;

    const totalFollowers = influencer.socialAccounts.reduce(
      (sum, acc) => sum + acc.followerCount, 0
    );

    // Simple heuristic: if engagement is very low relative to follower count
    if (totalFollowers > 100000 && avgEngagement < 1.0) {
      return 'authenticity-suspicious';
    }

    if (influencer.socialAccounts.some(acc => acc.verified)) {
      return 'authenticity-verified';
    }

    return 'authenticity-organic';
  }

  /**
   * Detect if influencer is a rising star
   */
  private async isRisingStar(influencer: Influencer): Promise<boolean> {
    // Would check:
    // - Recent rapid growth
    // - Increasing engagement
    // - New platform presence
    
    // Placeholder logic
    const recentAccounts = influencer.socialAccounts.filter(
      acc => new Date(acc.lastSyncedAt).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
    );

    return recentAccounts.length > 0 && 
           influencer.socialAccounts.some(acc => acc.followerCount < 500000);
  }
}

