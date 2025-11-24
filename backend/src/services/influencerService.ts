import { InfluencerRepository } from '../repositories/influencerRepository';
import { FollowerDeduplicationService } from './followerDeduplicationService';
import { InfluencerCategorizationService } from './influencerCategorizationService';
import { SocialMediaService } from './socialMediaService';
import { FollowerCollectionService } from './followerCollectionService';
import { logger } from '../utils/logger';

export interface Influencer {
  id: string;
  name: string;
  email?: string;
  socialAccounts: SocialAccount[];
  trueFollowerCount?: number;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialAccount {
  platform: 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'youtube' | 'linkedin';
  username: string;
  platformId: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  engagementRate: number;
  verified: boolean;
  profileUrl: string;
  lastSyncedAt: Date;
}

export interface SearchFilters {
  query?: string;
  platform?: string;
  minFollowers?: number;
  maxFollowers?: number;
  niche?: string;
  location?: string;
}

export class InfluencerService {
  private repository: InfluencerRepository;
  private deduplicationService: FollowerDeduplicationService;
  private categorizationService: InfluencerCategorizationService;
  private socialMediaService: SocialMediaService;
  private followerCollectionService: FollowerCollectionService;

  constructor() {
    this.repository = new InfluencerRepository();
    this.deduplicationService = new FollowerDeduplicationService();
    this.categorizationService = new InfluencerCategorizationService();
    this.socialMediaService = new SocialMediaService();
    this.followerCollectionService = new FollowerCollectionService();
  }

  async search(filters: SearchFilters): Promise<Influencer[]> {
    return this.repository.search(filters);
  }

  async discover(category?: string, limit: number = 50): Promise<Influencer[]> {
    if (category) {
      return this.repository.getByCategory(category, limit);
    }
    return this.repository.getTopInfluencers(limit);
  }

  async getById(id: string): Promise<Influencer | null> {
    return this.repository.getById(id);
  }

  async create(data: Partial<Influencer>, skipSync: boolean = false): Promise<Influencer> {
    // Sync social media accounts only if skipSync is false
    // This allows manual data entry without API calls
    if (data.socialAccounts && !skipSync) {
      const syncedAccounts = await Promise.all(
        data.socialAccounts.map(account => 
          this.socialMediaService.syncAccount(account)
        )
      );
      data.socialAccounts = syncedAccounts;
    } else if (data.socialAccounts && skipSync) {
      // For manual entry, ensure all required fields are set
      data.socialAccounts = data.socialAccounts.map(account => ({
        ...account,
        platformId: account.platformId || account.username,
        followerCount: account.followerCount || 0,
        followingCount: account.followingCount || 0,
        postCount: account.postCount || 0,
        engagementRate: account.engagementRate || 0,
        verified: account.verified || false,
        profileUrl: account.profileUrl || this.getDefaultProfileUrl(account.platform, account.username),
        lastSyncedAt: account.lastSyncedAt || new Date(),
      }));
    }

    // Create influencer first
    const influencer = await this.repository.create(data);

    // Schedule follower collection (async, non-blocking)
    if (data.socialAccounts && data.socialAccounts.length > 0) {
      this.collectFollowersAsync(influencer.id, data.socialAccounts).catch(err => {
        logger.error('Error collecting followers asynchronously', err);
      });
    }

    // Calculate true followers (will use cached data if available)
    if (data.socialAccounts && data.socialAccounts.length > 1) {
      data.trueFollowerCount = await this.deduplicationService.calculateTrueFollowers(
        data.socialAccounts
      );
      await this.repository.update(influencer.id, { trueFollowerCount: data.trueFollowerCount });
    }

    // Categorize influencer (handle errors gracefully)
    try {
      const categories = await this.categorizationService.categorize(influencer);
      influencer.categories = categories;
      await this.repository.update(influencer.id, { categories });
    } catch (error: any) {
      logger.error('Error categorizing influencer, using default categories', error);
      // Use default categories if categorization fails
      influencer.categories = ['new-influencer'];
      await this.repository.update(influencer.id, { categories: influencer.categories });
    }

    return influencer;
  }

  private getDefaultProfileUrl(platform: string, username: string): string {
    const urls: Record<string, string> = {
      instagram: `https://instagram.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      tiktok: `https://tiktok.com/@${username}`,
      facebook: `https://facebook.com/${username}`,
      youtube: `https://youtube.com/@${username}`,
      linkedin: `https://linkedin.com/in/${username}`,
    };
    return urls[platform] || `https://${platform}.com/${username}`;
  }

  /**
   * Collect followers asynchronously (non-blocking)
   */
  private async collectFollowersAsync(influencerId: string, accounts: SocialAccount[]): Promise<void> {
    try {
      for (const account of accounts) {
        await this.followerCollectionService.collectFollowers(account);
      }

      // Recalculate true followers after collection
      const influencer = await this.repository.getById(influencerId);
      if (influencer && influencer.socialAccounts.length > 1) {
        const trueFollowers = await this.deduplicationService.calculateTrueFollowers(
          influencer.socialAccounts
        );
        await this.repository.update(influencerId, { trueFollowerCount: trueFollowers });
        await this.deduplicationService.cacheDeduplicationResult(influencerId, trueFollowers);
      }
    } catch (error) {
      logger.error('Error in async follower collection', error);
    }
  }

  /**
   * Manually trigger follower collection for an influencer
   * @param influencerId - The influencer ID
   * @param force - Force collection even if cache is valid (default: false)
   */
  async collectFollowers(influencerId: string, force: boolean = false): Promise<{ collected: number; accounts: number }> {
    const influencer = await this.repository.getById(influencerId);
    if (!influencer) {
      throw new Error('Influencer not found');
    }

    let totalCollected = 0;
    for (const account of influencer.socialAccounts) {
      try {
        const count = await this.followerCollectionService.collectFollowers(account, force);
        totalCollected += count;
      } catch (error) {
        logger.error(`Error collecting followers for ${account.platform}`, error);
      }
    }

    // Recalculate true followers
    if (influencer.socialAccounts.length > 1) {
      const trueFollowers = await this.deduplicationService.calculateTrueFollowers(
        influencer.socialAccounts
      );
      await this.repository.update(influencerId, { trueFollowerCount: trueFollowers });
      await this.deduplicationService.cacheDeduplicationResult(influencerId, trueFollowers);
    }

    return {
      collected: totalCollected,
      accounts: influencer.socialAccounts.length,
    };
  }

  async update(id: string, data: Partial<Influencer>): Promise<Influencer> {
    const influencer = await this.repository.getById(id);
    if (!influencer) {
      throw new Error('Influencer not found');
    }

    // If social accounts are updated, recalculate true followers
    if (data.socialAccounts) {
      const syncedAccounts = await Promise.all(
        data.socialAccounts.map(account => 
          this.socialMediaService.syncAccount(account)
        )
      );
      data.socialAccounts = syncedAccounts;

      if (syncedAccounts.length > 1) {
        data.trueFollowerCount = await this.deduplicationService.calculateTrueFollowers(
          syncedAccounts
        );
      }

      // Re-categorize
      const updatedInfluencer = { ...influencer, ...data };
      const categories = await this.categorizationService.categorize(updatedInfluencer);
      data.categories = categories;
    }

    return this.repository.update(id, data);
  }

  /**
   * Sync social media accounts to update follower counts and metrics
   * This uses free tier APIs (public_metrics) and doesn't require elevated access
   * Forces sync by bypassing cache and time restrictions
   */
  async syncSocialAccounts(influencerId: string): Promise<Influencer> {
    const influencer = await this.repository.getById(influencerId);
    if (!influencer) {
      throw new Error('Influencer not found');
    }

    // Force sync all social accounts bypassing all cache and time checks
    const syncedAccounts = await Promise.all(
      influencer.socialAccounts.map(account => 
        this.socialMediaService.forceSyncAccount(account)
      )
    );

    // Log synced accounts before updating
    logger.info(`Synced accounts data:`, JSON.stringify(syncedAccounts, null, 2));

    // Update influencer with synced accounts
    const updatedInfluencer = await this.repository.update(influencerId, {
      socialAccounts: syncedAccounts,
    });

    logger.info(`Updated influencer, reading back from database...`);

    // Recalculate true followers if multiple platforms
    if (syncedAccounts.length > 1) {
      const trueFollowers = await this.deduplicationService.calculateTrueFollowers(
        syncedAccounts
      );
      await this.repository.update(influencerId, { trueFollowerCount: trueFollowers });
    }

    // Re-categorize based on updated metrics
    const categories = await this.categorizationService.categorize(updatedInfluencer);
    await this.repository.update(influencerId, { categories });

    return await this.repository.getById(influencerId) || updatedInfluencer;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async addSocialAccount(influencerId: string, account: Partial<SocialAccount>): Promise<Influencer> {
    // Add the account to the database
    await this.repository.addSocialAccount(influencerId, account);

    // Sync the account to get real data
    const syncedAccount = await this.socialMediaService.syncAccount(account);
    
    // Update with synced data
    await this.repository.addSocialAccount(influencerId, syncedAccount);

    // Get updated influencer
    const influencer = await this.repository.getById(influencerId);
    if (!influencer) {
      throw new Error('Influencer not found');
    }

    // Recalculate true followers if multiple platforms
    if (influencer.socialAccounts.length > 1) {
      const trueFollowers = await this.deduplicationService.calculateTrueFollowers(
        influencer.socialAccounts
      );
      await this.repository.update(influencerId, { trueFollowerCount: trueFollowers });
    }

    // Re-categorize
    const categories = await this.categorizationService.categorize(influencer);
    await this.repository.update(influencerId, { categories });

    return await this.repository.getById(influencerId) || influencer;
  }

  async getAnalytics(id: string) {
    const influencer = await this.repository.getById(id);
    if (!influencer) {
      throw new Error('Influencer not found');
    }

    return {
      totalFollowers: influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0),
      trueFollowers: influencer.trueFollowerCount || 0,
      platforms: influencer.socialAccounts.length,
      averageEngagementRate: this.calculateAverageEngagement(influencer.socialAccounts),
      growthTrend: await this.socialMediaService.getGrowthTrend(id),
      categories: influencer.categories,
    };
  }

  async getTrueFollowers(id: string) {
    const influencer = await this.repository.getById(id);
    if (!influencer) {
      throw new Error('Influencer not found');
    }

    if (influencer.trueFollowerCount !== undefined) {
      return {
        trueFollowerCount: influencer.trueFollowerCount,
        totalFollowerCount: influencer.socialAccounts.reduce(
          (sum, acc) => sum + acc.followerCount, 0
        ),
        deduplicationRate: (
          (1 - influencer.trueFollowerCount / 
            influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0)) * 100
        ).toFixed(2) + '%',
      };
    }

    // Calculate on the fly
    const trueFollowers = await this.deduplicationService.calculateTrueFollowers(
      influencer.socialAccounts
    );

    return {
      trueFollowerCount: trueFollowers,
      totalFollowerCount: influencer.socialAccounts.reduce(
        (sum, acc) => sum + acc.followerCount, 0
      ),
      deduplicationRate: (
        (1 - trueFollowers / 
          influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0)) * 100
      ).toFixed(2) + '%',
    };
  }

  async getCategories(id: string): Promise<string[]> {
    const influencer = await this.repository.getById(id);
    if (!influencer) {
      throw new Error('Influencer not found');
    }
    return influencer.categories;
  }

  async getByCategory(category: string, limit: number, offset: number): Promise<Influencer[]> {
    return this.repository.getByCategory(category, limit, offset);
  }

  private calculateAverageEngagement(accounts: SocialAccount[]): number {
    if (accounts.length === 0) return 0;
    const sum = accounts.reduce((acc, account) => acc + account.engagementRate, 0);
    return sum / accounts.length;
  }
}

