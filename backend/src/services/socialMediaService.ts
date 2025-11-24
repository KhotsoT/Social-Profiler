import { SocialAccount } from './influencerService';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { APICacheService } from './apiCacheService';
import { shouldSyncAccount } from '../config/apiMode';

interface RateLimit {
  remaining: number;
  resetAt: number;
  limit: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number; // Multiplier for exponential backoff
}

/**
 * Service for syncing influencer data from various social media platforms
 * Integrates with official APIs and handles rate limiting
 */
export class SocialMediaService {
  private rateLimits: Map<string, RateLimit> = new Map();
  private axiosInstances: Map<string, AxiosInstance> = new Map();
  private cacheService: APICacheService;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
  };

  constructor() {
    this.cacheService = new APICacheService();
  }

  private readonly API_CONFIGS = {
    instagram: {
      baseUrl: 'https://graph.instagram.com',
      version: 'v18.0',
    },
    tiktok: {
      baseUrl: 'https://open.tiktokapis.com',
      version: 'v2',
    },
    twitter: {
      baseUrl: 'https://api.twitter.com',
      version: '2',
    },
    facebook: {
      baseUrl: 'https://graph.facebook.com',
      version: 'v18.0',
    },
    youtube: {
      baseUrl: 'https://www.googleapis.com/youtube',
      version: 'v3',
    },
    linkedin: {
      baseUrl: 'https://api.linkedin.com',
      version: 'v2',
    },
  };

  /**
   * Sync account data from the platform
   * Smart sync: only calls API if cache is expired or data has changed
   */
  async syncAccount(account: Partial<SocialAccount>): Promise<SocialAccount> {
    if (!account.platform || !account.username) {
      throw new Error('Platform and username are required');
    }

    const platformId = account.platformId || account.username;
    const lastSyncedAt = account.lastSyncedAt ? new Date(account.lastSyncedAt) : null;

    // Check if we should make an API call
    const shouldCall = await this.cacheService.shouldMakeAPICall(
      account.platform,
      platformId,
      lastSyncedAt
    );

    if (!shouldCall.shouldCall) {
      logger.info(
        `Skipping API call for ${account.platform}:${account.username} - ${shouldCall.reason}`
      );

      // Return cached data if available
      if (shouldCall.cached) {
        return {
          platform: account.platform,
          username: account.username!,
          platformId: shouldCall.cached.platformId,
          followerCount: shouldCall.cached.followerCount,
          followingCount: shouldCall.cached.followingCount,
          postCount: shouldCall.cached.postCount,
          engagementRate: shouldCall.cached.engagementRate,
          verified: shouldCall.cached.verified,
          profileUrl: account.profileUrl || this.getDefaultAccount(account).profileUrl,
          lastSyncedAt: shouldCall.cached.cachedAt,
        };
      }

      // No cache available, return default
      return this.getDefaultAccount(account);
    }

    // Check if enough time has passed since last sync
    if (lastSyncedAt && !shouldSyncAccount(lastSyncedAt)) {
      logger.debug(`Too soon to sync ${account.platform}:${account.username}`);
      return this.getDefaultAccount(account);
    }

    logger.info(`Syncing ${account.platform} account: ${account.username} (${shouldCall.reason})`);

    let syncedAccount: SocialAccount;

    try {
      switch (account.platform) {
        case 'instagram':
          syncedAccount = await this.syncInstagram(account);
          break;
        case 'tiktok':
          syncedAccount = await this.syncTikTok(account);
          break;
        case 'twitter':
          syncedAccount = await this.syncTwitter(account);
          break;
        case 'facebook':
          syncedAccount = await this.syncFacebook(account);
          break;
        case 'youtube':
          syncedAccount = await this.syncYouTube(account);
          break;
        case 'linkedin':
          syncedAccount = await this.syncLinkedIn(account);
          break;
        default:
          throw new Error(`Unsupported platform: ${account.platform}`);
      }

      // Check if data has changed significantly (if we have cached data)
      if (shouldCall.cached) {
        const hasChange = this.cacheService.hasSignificantChange(shouldCall.cached, syncedAccount);
        if (!hasChange) {
          logger.info(
            `No significant change detected for ${account.platform}:${account.username}, ` +
            `using cached data to avoid unnecessary updates`
          );
          // Return cached data instead of making database update
          return {
            ...syncedAccount,
            lastSyncedAt: shouldCall.cached.cachedAt,
          };
        }
      }

      return syncedAccount;
    } catch (error: any) {
      logger.error(`Error syncing ${account.platform} account:`, error);
      
      // If we have cached data, use it as fallback
      if (shouldCall.cached) {
        logger.info(`Using cached data as fallback for ${account.platform}:${account.username}`);
        return {
          platform: account.platform,
          username: account.username!,
          platformId: shouldCall.cached.platformId,
          followerCount: shouldCall.cached.followerCount,
          followingCount: shouldCall.cached.followingCount,
          postCount: shouldCall.cached.postCount,
          engagementRate: shouldCall.cached.engagementRate,
          verified: shouldCall.cached.verified,
          profileUrl: account.profileUrl || this.getDefaultAccount(account).profileUrl,
          lastSyncedAt: shouldCall.cached.cachedAt,
        };
      }

      // Return basic account info even if API fails
      return this.getDefaultAccount(account);
    }
  }

  /**
   * Clear cache for a specific account to force fresh sync
   */
  async clearCache(platform: string, platformId: string): Promise<void> {
    // Clear cache by updating last_synced_at to null in database
    // This will force a fresh API call on next sync
    try {
      const { query } = await import('../config/database');
      await query(
        'UPDATE social_accounts SET last_synced_at = NULL WHERE platform = $1 AND platform_id = $2',
        [platform, platformId]
      );
      logger.info(`Cache cleared for ${platform}:${platformId}`);
    } catch (error) {
      logger.error(`Error clearing cache for ${platform}:${platformId}`, error);
    }
  }

  /**
   * Force sync account bypassing all cache and time checks
   * Used for manual sync operations
   */
  async forceSyncAccount(account: Partial<SocialAccount>): Promise<SocialAccount> {
    if (!account.platform || !account.username) {
      throw new Error('Platform and username are required');
    }

    logger.info(`Force syncing ${account.platform} account: ${account.username}`);

    let syncedAccount: SocialAccount;

    try {
      switch (account.platform) {
        case 'twitter':
          syncedAccount = await this.syncTwitter(account);
          break;
        case 'instagram':
          syncedAccount = await this.syncInstagram(account);
          break;
        case 'facebook':
          syncedAccount = await this.syncFacebook(account);
          break;
        case 'youtube':
          syncedAccount = await this.syncYouTube(account);
          break;
        case 'tiktok':
          syncedAccount = await this.syncTikTok(account);
          break;
        case 'linkedin':
          syncedAccount = await this.syncLinkedIn(account);
          break;
        default:
          throw new Error(`Unsupported platform: ${account.platform}`);
      }

      // Verify we got real data (not default/empty)
      if (syncedAccount.followerCount === 0 && syncedAccount.followingCount === 0 && syncedAccount.postCount === 0) {
        logger.warn(
          `Force sync returned empty data for ${account.platform}:${account.username}. ` +
          `This might indicate an API error or the account has no activity.`
        );
      }

      // Cache the result
      await this.cacheService.cacheAccountData(syncedAccount);

      logger.info(
        `Force sync completed for ${account.platform}:${account.username} - ` +
        `Followers: ${syncedAccount.followerCount}, Following: ${syncedAccount.followingCount}, Posts: ${syncedAccount.postCount}`
      );

      return syncedAccount;
    } catch (error: any) {
      logger.error(`Error force syncing ${account.platform} account:`, error.response?.data || error.message);
      return this.getDefaultAccount(account);
    }
  }

  /**
   * Get growth trend for an influencer
   */
  async getGrowthTrend(influencerId: string): Promise<{
    period: string;
    growthRate: number;
    trend: 'rising' | 'stable' | 'declining';
  }> {
    try {
      const { query } = await import('../config/database');
      const result = await query(
        `SELECT 
          date,
          follower_count,
          LAG(follower_count) OVER (ORDER BY date) as prev_count
        FROM influencer_analytics
        WHERE influencer_id = $1
        ORDER BY date DESC
        LIMIT 30`,
        [influencerId]
      );

      if (result.rows.length < 2) {
        return { period: '30d', growthRate: 0, trend: 'stable' };
      }

      const recent = result.rows[0];
      const older = result.rows[result.rows.length - 1];
      const growthRate = ((recent.follower_count - older.follower_count) / older.follower_count) * 100;

      return {
        period: '30d',
        growthRate: Math.round(growthRate * 100) / 100,
        trend: growthRate > 5 ? 'rising' : growthRate < -5 ? 'declining' : 'stable',
      };
    } catch (error) {
      logger.error('Error getting growth trend', error);
      return { period: '30d', growthRate: 0, trend: 'stable' };
    }
  }

  private async syncInstagram(account: Partial<SocialAccount>): Promise<SocialAccount> {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!accessToken) {
      logger.warn('Instagram access token not configured, using default');
      return this.getDefaultAccount(account);
    }

    try {
      await this.checkRateLimit('instagram');

      // First, get user ID from username (requires Instagram Basic Display API or Graph API)
      // Note: Instagram Graph API requires business account and app review
      const api = this.getAxiosInstance('instagram');
      
      // Try to get user info (this is a simplified version)
      // In production, you'd need proper OAuth flow
      const response = await api.get(`/me`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken,
        },
        timeout: 10000,
      });

      const data = response.data;
      
      // Get follower count (requires different endpoint)
      // Note: Instagram API has strict rate limits and requires app review
      const followerCount = data.followers_count || 0;
      const followingCount = data.follows_count || 0;
      const postCount = data.media_count || 0;

      return {
        platform: 'instagram',
        username: account.username!,
        platformId: data.id || account.platformId || account.username!,
        followerCount,
        followingCount,
        postCount,
        engagementRate: 0, // Would need to calculate from posts
        verified: data.is_verified || false,
        profileUrl: `https://instagram.com/${account.username}`,
        lastSyncedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Instagram API error', error.response?.data || error.message);
      return this.getDefaultAccount(account);
    }
  }

  private async syncTikTok(account: Partial<SocialAccount>): Promise<SocialAccount> {
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    if (!accessToken) {
      logger.warn('TikTok access token not configured, using default');
      return this.getDefaultAccount(account);
    }

    try {
      await this.checkRateLimit('tiktok');

      const api = this.getAxiosInstance('tiktok');
      const response = await api.get('/user/info/', {
        params: {
          fields: 'display_name,bio_description,avatar_url,profile_deep_link,follower_count,following_count,likes_count,video_count,is_verified',
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });

      const data = response.data.data?.user || response.data;

      return {
        platform: 'tiktok',
        username: account.username!,
        platformId: data.open_id || account.platformId || account.username!,
        followerCount: data.follower_count || 0,
        followingCount: data.following_count || 0,
        postCount: data.video_count || 0,
        engagementRate: 0, // Would need to calculate
        verified: data.is_verified || false,
        profileUrl: `https://tiktok.com/@${account.username}`,
        lastSyncedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('TikTok API error', error.response?.data || error.message);
      return this.getDefaultAccount(account);
    }
  }

  private async syncTwitter(account: Partial<SocialAccount>): Promise<SocialAccount> {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      logger.warn('Twitter bearer token not configured, using default');
      return this.getDefaultAccount(account);
    }

    logger.info(`Attempting Twitter API call for username: ${account.username}`);

    // Use retry logic with exponential backoff
    return await this.retryWithBackoff(
      async () => {
        await this.checkRateLimit('twitter');

        // Use axios directly with full URL to avoid base URL issues
        const url = `https://api.twitter.com/2/users/by/username/${account.username}`;
        
        const userResponse = await axios.get(url, {
          params: {
            'user.fields': 'public_metrics,verified,description',
          },
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
          },
          timeout: 10000,
        });

        // Update rate limit info from response headers
        this.updateRateLimitFromHeaders('twitter', userResponse.headers);
        
        logger.info(`Twitter API call successful, status: ${userResponse.status}`);

        const user = userResponse.data.data;
        if (!user) {
          logger.error('Twitter API returned no user data', userResponse.data);
          throw new Error('Twitter API returned no user data');
        }

        const metrics = user.public_metrics || {};
        
        logger.info(
          `Twitter API metrics for ${account.username}: ` +
          `followers=${metrics.followers_count}, following=${metrics.following_count}, tweets=${metrics.tweet_count}`
        );
        
        const syncedAccount: SocialAccount = {
          platform: 'twitter',
          username: account.username!,
          platformId: user.id || account.platformId || account.username!,
          followerCount: metrics.followers_count || 0,
          followingCount: metrics.following_count || 0,
          postCount: metrics.tweet_count || 0,
          engagementRate: 0, // Would need to calculate from recent tweets
          verified: user.verified || false,
          profileUrl: `https://twitter.com/${account.username}`,
          lastSyncedAt: new Date(),
        };

        logger.info(
          `Twitter sync successful for ${account.username}: ` +
          `${syncedAccount.followerCount} followers, ${syncedAccount.followingCount} following, ${syncedAccount.postCount} tweets`
        );

        return syncedAccount;
      },
      (error: any) => {
        // Check if it's a rate limit error
        if (error.response?.status === 429) {
          const resetTime = this.getRateLimitResetTime('twitter', error.response.headers);
          if (resetTime) {
            const waitTime = resetTime - Date.now();
            if (waitTime > 0 && waitTime < this.retryConfig.maxDelay) {
              logger.warn(
                `Twitter rate limit hit. Waiting ${Math.ceil(waitTime / 1000)} seconds until reset...`
              );
              return waitTime; // Return wait time for retry
            }
          }
        }
        return null; // Don't retry for other errors
      },
      `Twitter sync for ${account.username}`
    );
  }

  private async syncFacebook(account: Partial<SocialAccount>): Promise<SocialAccount> {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!accessToken) {
      logger.warn('Facebook access token not configured, using default');
      return this.getDefaultAccount(account);
    }

    try {
      await this.checkRateLimit('facebook');

      const api = this.getAxiosInstance('facebook');
      const response = await api.get(`/${account.username}`, {
        params: {
          fields: 'id,name,followers_count,fan_count,is_verified',
          access_token: accessToken,
        },
        timeout: 10000,
      });

      const data = response.data;

      return {
        platform: 'facebook',
        username: account.username!,
        platformId: data.id || account.platformId || account.username!,
        followerCount: data.followers_count || data.fan_count || 0,
        followingCount: 0,
        postCount: 0,
        engagementRate: 0,
        verified: data.is_verified || false,
        profileUrl: `https://facebook.com/${account.username}`,
        lastSyncedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Facebook API error', error.response?.data || error.message);
      return this.getDefaultAccount(account);
    }
  }

  private async syncYouTube(account: Partial<SocialAccount>): Promise<SocialAccount> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      logger.warn('YouTube API key not configured, using default');
      return this.getDefaultAccount(account);
    }

    try {
      await this.checkRateLimit('youtube');

      const api = this.getAxiosInstance('youtube');
      
      // First, get channel ID from username
      const searchResponse = await api.get('/search', {
        params: {
          part: 'snippet',
          q: account.username,
          type: 'channel',
          maxResults: 1,
          key: apiKey,
        },
        timeout: 10000,
      });

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return this.getDefaultAccount(account);
      }

      const channelId = searchResponse.data.items[0].id.channelId;

      // Get channel statistics
      const statsResponse = await api.get('/channels', {
        params: {
          part: 'statistics,snippet',
          id: channelId,
          key: apiKey,
        },
        timeout: 10000,
      });

      const channel = statsResponse.data.items[0];
      const stats = channel.statistics;

      return {
        platform: 'youtube',
        username: account.username!,
        platformId: channelId || account.platformId || account.username!,
        followerCount: parseInt(stats.subscriberCount || '0', 10),
        followingCount: 0,
        postCount: parseInt(stats.videoCount || '0', 10),
        engagementRate: 0, // Would need to calculate from views/likes
        verified: channel.snippet?.brandingSettings?.channel?.isDefaultBranding === false,
        profileUrl: `https://youtube.com/@${account.username}`,
        lastSyncedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('YouTube API error', error.response?.data || error.message);
      return this.getDefaultAccount(account);
    }
  }

  private async syncLinkedIn(account: Partial<SocialAccount>): Promise<SocialAccount> {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!accessToken) {
      logger.warn('LinkedIn access token not configured, using default');
      return this.getDefaultAccount(account);
    }

    try {
      await this.checkRateLimit('linkedin');

      const api = this.getAxiosInstance('linkedin');
      const response = await api.get('/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });

      const data = response.data;

      return {
        platform: 'linkedin',
        username: account.username!,
        platformId: data.id || account.platformId || account.username!,
        followerCount: 0, // LinkedIn API doesn't provide follower count easily
        followingCount: 0,
        postCount: 0,
        engagementRate: 0,
        verified: false,
        profileUrl: `https://linkedin.com/in/${account.username}`,
        lastSyncedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('LinkedIn API error', error.response?.data || error.message);
      return this.getDefaultAccount(account);
    }
  }

  private getAxiosInstance(platform: string): AxiosInstance {
    if (!this.axiosInstances.has(platform)) {
      const config = this.API_CONFIGS[platform as keyof typeof this.API_CONFIGS];
      const instance = axios.create({
        baseURL: `${config.baseUrl}/${config.version}`,
        timeout: 15000,
      });

      // Add response interceptor for rate limiting
      instance.interceptors.response.use(
        (response: any) => {
          this.updateRateLimitFromHeaders(platform, response.headers);
          return response;
        },
        (error: any) => {
          if (error.response?.status === 429) {
            this.handleRateLimit(platform, error.response.headers);
          }
          return Promise.reject(error);
        }
      );

      this.axiosInstances.set(platform, instance);
    }

    return this.axiosInstances.get(platform)!;
  }

  /**
   * Check if we should wait due to rate limiting
   */
  private async checkRateLimit(platform: string): Promise<void> {
    const limit = this.rateLimits.get(platform);
    if (limit && limit.remaining <= 0 && Date.now() < limit.resetAt) {
      const waitTime = limit.resetAt - Date.now();
      if (waitTime > 0) {
        logger.warn(
          `Rate limit reached for ${platform}, waiting ${Math.ceil(waitTime / 1000)} seconds until reset...`
        );
        await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
      }
    }
  }

  /**
   * Update rate limit info from response headers
   */
  private updateRateLimitFromHeaders(platform: string, headers: any): void {
    // Twitter API v2 uses x-rate-limit-* headers
    const remaining = parseInt(
      headers['x-rate-limit-remaining'] || 
      headers['x-ratelimit-remaining'] || 
      '100', 
      10
    );
    
    const limit = parseInt(
      headers['x-rate-limit-limit'] || 
      headers['x-ratelimit-limit'] || 
      '100', 
      10
    );
    
    // Twitter returns reset time as Unix timestamp (seconds)
    const resetHeader = headers['x-rate-limit-reset'] || headers['x-ratelimit-reset'];
    let resetAt: number;
    
    if (resetHeader) {
      const resetSeconds = parseInt(resetHeader, 10);
      // Check if it's already in milliseconds (very large number) or seconds
      resetAt = resetSeconds > 1000000000000 ? resetSeconds : resetSeconds * 1000;
    } else {
      // Default to 15 minutes from now if no reset header
      resetAt = Date.now() + (15 * 60 * 1000);
    }
    
    this.rateLimits.set(platform, {
      remaining,
      resetAt,
      limit,
    });
    
    logger.debug(
      `Rate limit updated for ${platform}: ${remaining}/${limit} remaining, resets at ${new Date(resetAt).toISOString()}`
    );
  }

  /**
   * Get rate limit reset time from error response headers
   */
  private getRateLimitResetTime(platform: string, headers: any): number | null {
    const resetHeader = headers['x-rate-limit-reset'] || headers['x-ratelimit-reset'] || headers['retry-after'];
    
    if (resetHeader) {
      // If it's retry-after, it's in seconds
      if (headers['retry-after']) {
        return Date.now() + (parseInt(resetHeader, 10) * 1000);
      }
      
      // Otherwise it's a Unix timestamp
      const resetSeconds = parseInt(resetHeader, 10);
      return resetSeconds > 1000000000000 ? resetSeconds : resetSeconds * 1000;
    }
    
    // Check our stored rate limit
    const limit = this.rateLimits.get(platform);
    if (limit && limit.resetAt > Date.now()) {
      return limit.resetAt;
    }
    
    return null;
  }

  /**
   * Retry a function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: any) => number | null, // Returns wait time in ms if should retry, null otherwise
    operationName: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if we should retry
        const waitTime = shouldRetry(error);
        
        if (waitTime === null || attempt >= this.retryConfig.maxRetries) {
          // Don't retry or max retries reached
          if (attempt >= this.retryConfig.maxRetries) {
            logger.error(
              `${operationName} failed after ${this.retryConfig.maxRetries} retries`,
              error.response?.data || error.message
            );
          }
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          waitTime || (this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt)),
          this.retryConfig.maxDelay
        );
        
        logger.warn(
          `${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}). ` +
          `Retrying in ${Math.ceil(delay / 1000)} seconds...`,
          error.response?.status === 429 ? 'Rate limited' : error.message
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  private handleRateLimit(platform: string, headers: any): void {
    const retryAfter = parseInt(headers['retry-after'] || '60', 10);
    const limit = parseInt(
      headers['x-rate-limit-limit'] || 
      headers['x-ratelimit-limit'] || 
      '100', 
      10
    );
    
    this.rateLimits.set(platform, {
      remaining: 0,
      resetAt: Date.now() + (retryAfter * 1000),
      limit,
    });
  }

  private getDefaultAccount(account: Partial<SocialAccount>): SocialAccount {
    const platformUrls: Record<string, string> = {
      instagram: `https://instagram.com/${account.username}`,
      tiktok: `https://tiktok.com/@${account.username}`,
      twitter: `https://twitter.com/${account.username}`,
      facebook: `https://facebook.com/${account.username}`,
      youtube: `https://youtube.com/@${account.username}`,
      linkedin: `https://linkedin.com/in/${account.username}`,
    };

    return {
      platform: account.platform!,
      username: account.username!,
      platformId: account.platformId || account.username!,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      engagementRate: 0,
      verified: false,
      profileUrl: platformUrls[account.platform!] || '',
      lastSyncedAt: new Date(),
    };
  }
}
