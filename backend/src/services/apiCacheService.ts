import { logger } from '../utils/logger';
import { query } from '../config/database';
import { SocialAccount } from './influencerService';
import { getAPIModeConfig } from '../config/apiMode';

interface CachedAccountData {
  platform: string;
  platformId: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  engagementRate: number;
  verified: boolean;
  cachedAt: Date;
  dataHash: string; // Hash of key data for change detection
}

/**
 * Service for caching API responses and detecting changes
 * Prevents unnecessary API calls by comparing cached data
 */
export class APICacheService {
  /**
   * Get cached account data if available and still valid
   */
  async getCachedAccount(platform: string, platformId: string): Promise<CachedAccountData | null> {
    const config = getAPIModeConfig();
    
    if (!config.useCache) {
      return null;
    }

    try {
      const result = await query(
        `SELECT 
          platform, platform_id, follower_count, following_count, 
          post_count, engagement_rate, verified, last_synced_at, 
          (follower_count || '|' || following_count || '|' || post_count || '|' || engagement_rate)::text as data_hash
        FROM social_accounts 
        WHERE platform = $1 AND platform_id = $2`,
        [platform, platformId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const lastSyncedAt = new Date(row.last_synced_at);
      const cacheAge = Date.now() - lastSyncedAt.getTime();

      // Check if cache is still valid
      if (cacheAge > config.cacheExpiry) {
        logger.debug(`Cache expired for ${platform}:${platformId} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
        return null;
      }

      return {
        platform: row.platform,
        platformId: row.platform_id,
        followerCount: row.follower_count,
        followingCount: row.following_count,
        postCount: row.post_count,
        engagementRate: parseFloat(row.engagement_rate) || 0,
        verified: row.verified,
        cachedAt: lastSyncedAt,
        dataHash: row.data_hash,
      };
    } catch (error) {
      logger.error('Error getting cached account', error);
      return null;
    }
  }

  /**
   * Check if account data has changed significantly
   */
  hasSignificantChange(
    cached: CachedAccountData | null,
    newData: SocialAccount
  ): boolean {
    const config = getAPIModeConfig();

    if (!cached) {
      return true; // No cache, must sync
    }

    if (!config.requireChangeForSync) {
      return true; // Mode doesn't require change detection
    }

    // Calculate change percentages
    const followerChange = this.calculateChangePercentage(
      cached.followerCount,
      newData.followerCount
    );
    const followingChange = this.calculateChangePercentage(
      cached.followingCount,
      newData.followingCount
    );
    const postChange = this.calculateChangePercentage(
      cached.postCount,
      newData.postCount
    );

    // Check if any metric changed above threshold
    const maxChange = Math.max(followerChange, followingChange, postChange);
    const hasChange = maxChange >= config.changeThreshold;

    if (hasChange) {
      logger.info(
        `Significant change detected for ${newData.platform}:${newData.username} ` +
        `(follower: ${followerChange.toFixed(1)}%, following: ${followingChange.toFixed(1)}%, posts: ${postChange.toFixed(1)}%)`
      );
    } else {
      logger.debug(
        `No significant change for ${newData.platform}:${newData.username} ` +
        `(max change: ${maxChange.toFixed(1)}%, threshold: ${config.changeThreshold}%)`
      );
    }

    return hasChange;
  }

  /**
   * Calculate percentage change between two values
   */
  private calculateChangePercentage(oldValue: number, newValue: number): number {
    if (oldValue === 0 && newValue === 0) return 0;
    if (oldValue === 0) return 100; // New value is infinite % increase
    return Math.abs((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Store account data in cache
   */
  async cacheAccountData(account: SocialAccount): Promise<void> {
    try {
      // Update is handled by the repository when syncing
      // This method is for explicit caching if needed
      logger.debug(`Cached account data for ${account.platform}:${account.username}`);
    } catch (error) {
      logger.error('Error caching account data', error);
    }
  }

  /**
   * Check if we should make an API call based on cache and mode
   */
  async shouldMakeAPICall(
    platform: string,
    platformId: string,
    lastSyncedAt: Date | null
  ): Promise<{ shouldCall: boolean; reason: string; cached?: CachedAccountData }> {
    const config = getAPIModeConfig();

    // Check if enough time has passed
    if (lastSyncedAt) {
      const timeSinceSync = Date.now() - lastSyncedAt.getTime();
      const interval = config.accountSyncInterval;

      if (timeSinceSync < interval) {
        return {
          shouldCall: false,
          reason: `Too soon to sync (${Math.round((interval - timeSinceSync) / 1000 / 60)} minutes remaining)`,
        };
      }
    }

    // Get cached data
    const cached = await this.getCachedAccount(platform, platformId);

    if (cached && !config.requireChangeForSync) {
      // In live mode or when change detection is disabled, use cache if valid
      return {
        shouldCall: false,
        reason: 'Using valid cached data',
        cached,
      };
    }

    return {
      shouldCall: true,
      reason: lastSyncedAt ? 'Cache expired or change detected' : 'Never synced',
      cached: cached || undefined,
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalCached: number;
    expiredCaches: number;
    validCaches: number;
  }> {
    try {
      const config = getAPIModeConfig();
      const now = Date.now();

      const result = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE last_synced_at < NOW() - INTERVAL '${config.cacheExpiry}ms') as expired,
          COUNT(*) FILTER (WHERE last_synced_at >= NOW() - INTERVAL '${config.cacheExpiry}ms') as valid
        FROM social_accounts`,
        []
      );

      return {
        totalCached: parseInt(result.rows[0].total, 10),
        expiredCaches: parseInt(result.rows[0].expired, 10),
        validCaches: parseInt(result.rows[0].valid, 10),
      };
    } catch (error) {
      logger.error('Error getting cache stats', error);
      return { totalCached: 0, expiredCaches: 0, validCaches: 0 };
    }
  }
}


