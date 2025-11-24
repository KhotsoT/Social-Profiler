import axios from 'axios';
import { logger } from '../utils/logger';
import { FollowerRepository, FollowerData } from '../repositories/followerRepository';
import { SocialAccount } from './influencerService';
import { shouldSyncFollowers, getAPIModeConfig } from '../config/apiMode';

/**
 * Service for collecting follower data from social media platforms
 * Handles pagination, rate limiting, and data storage
 */
export class FollowerCollectionService {
  private followerRepository: FollowerRepository;

  constructor() {
    this.followerRepository = new FollowerRepository();
  }

  /**
   * Collect followers for a social account
   * Smart collection: only collects if enough time has passed and mode allows it
   */
  async collectFollowers(account: SocialAccount, force: boolean = false): Promise<number> {
    const config = getAPIModeConfig();
    const lastSyncedAt = account.lastSyncedAt ? new Date(account.lastSyncedAt) : null;

    // Check if we should collect followers
    if (!force) {
      if (lastSyncedAt && !shouldSyncFollowers(lastSyncedAt)) {
        const timeRemaining = config.followerSyncInterval - (Date.now() - lastSyncedAt.getTime());
        logger.info(
          `Skipping follower collection for ${account.platform}:${account.username} - ` +
          `too soon (${Math.round(timeRemaining / 1000 / 60 / 60)} hours remaining)`
        );
        return 0;
      }

      // In minimal mode, only collect followers if explicitly requested
      if (config.mode === 'minimal') {
        logger.info(
          `Skipping follower collection for ${account.platform}:${account.username} - ` +
          `minimal mode (use force=true to override)`
        );
        return 0;
      }
    }

    logger.info(`Collecting followers for ${account.platform}:${account.username}${force ? ' (forced)' : ''}`);

    try {
      switch (account.platform) {
        case 'instagram':
          return await this.collectInstagramFollowers(account);
        case 'tiktok':
          return await this.collectTikTokFollowers(account);
        case 'twitter':
          return await this.collectTwitterFollowers(account);
        case 'facebook':
          return await this.collectFacebookFollowers(account);
        case 'youtube':
          return await this.collectYouTubeFollowers(account);
        case 'linkedin':
          return await this.collectLinkedInFollowers(account);
        default:
          throw new Error(`Unsupported platform: ${account.platform}`);
      }
    } catch (error) {
      logger.error(`Error collecting followers for ${account.platform}:`, error);
      throw error;
    }
  }

  private async collectInstagramFollowers(account: SocialAccount): Promise<number> {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!accessToken) {
      logger.warn('Instagram access token not configured');
      return 0;
    }

    try {
      const followers: FollowerData[] = [];
      let after: string | undefined;
      let pageCount = 0;
      const maxPages = 100; // Instagram allows pagination

      logger.info(`Starting Instagram follower collection for ${account.username} (ID: ${account.platformId})`);

      while (pageCount < maxPages) {
        const params: any = {
          access_token: accessToken,
          limit: 100, // Max per page
        };

        if (after) {
          params.after = after;
        }

        const response = await axios.get(
          `https://graph.instagram.com/v18.0/${account.platformId}/followers`,
          {
            params,
            timeout: 30000,
          }
        );

        const data = response.data.data || [];
        
        for (const user of data) {
          followers.push({
            id: user.id,
            username: user.username || '',
            displayName: user.name || user.username || '',
          });
        }

        // Check for next page
        const paging = response.data.paging;
        after = paging?.cursors?.after;
        
        if (!after || !paging?.next) {
          logger.info(`Reached end of follower list at page ${pageCount + 1}`);
          break;
        }

        pageCount++;
        
        // Rate limiting - Instagram has strict limits
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds between requests
        
        // Log progress every 10 pages
        if (pageCount % 10 === 0) {
          logger.info(`Collected ${followers.length} Instagram followers so far (page ${pageCount})...`);
        }
      }

      logger.info(`Completed Instagram follower collection: ${followers.length} followers collected in ${pageCount} pages`);
      await this.followerRepository.saveFollowers(account.platformId, account.platform, followers);
      return followers.length;
    } catch (error: any) {
      // Check for specific error codes
      if (error.response?.status === 403) {
        logger.error('Instagram API: Access forbidden. You need App Review and follower list permissions.');
        logger.error('Error details:', error.response.data);
      } else if (error.response?.status === 400) {
        logger.error('Instagram API: Bad request. Check if account is Business/Creator account and has proper permissions.');
        logger.error('Error details:', error.response.data);
      } else {
        logger.error('Instagram follower collection error', error.response?.data || error.message);
      }
      return 0;
    }
  }

  private async collectTikTokFollowers(account: SocialAccount): Promise<number> {
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    if (!accessToken) {
      logger.warn('TikTok access token not configured');
      return 0;
    }

    // TikTok API follower collection
    // Note: TikTok API has rate limits and requires proper authentication
    try {
      const followers: FollowerData[] = [];
      let cursor = '';
      let hasMore = true;
      let pageCount = 0;
      const maxPages = 10; // Limit to prevent excessive API calls

      while (hasMore && pageCount < maxPages) {
        const response = await axios.get('https://open.tiktokapis.com/v2/research/user/following/list/', {
          params: {
            fields: 'user_id,display_name,avatar_url,bio_description',
            max_count: 100,
            cursor,
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          timeout: 15000,
        });

        const data = response.data.data;
        if (data?.users) {
          for (const user of data.users) {
            followers.push({
              id: user.user_id,
              username: user.display_name || '',
              displayName: user.display_name,
              bio: user.bio_description,
            });
          }
        }

        cursor = data?.cursor || '';
        hasMore = !!cursor && data?.has_more;
        pageCount++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await this.followerRepository.saveFollowers(account.platformId, account.platform, followers);
      return followers.length;
    } catch (error: any) {
      logger.error('TikTok follower collection error', error.response?.data || error.message);
      return 0;
    }
  }

  private async collectTwitterFollowers(account: SocialAccount): Promise<number> {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      logger.warn('Twitter bearer token not configured');
      return 0;
    }

    try {
      const followers: FollowerData[] = [];
      let nextToken: string | undefined;
      let pageCount = 0;
      
      // Configurable limit via environment variable (default: unlimited, but can be set for testing)
      // Twitter API v2 has no hard limit on follower count, but has rate limits:
      // - Free tier: 15 requests per 15 minutes for follower endpoints
      // - Each request can fetch up to 100 followers
      // - So free tier can fetch ~1,500 followers per 15 minutes
      // - For larger accounts, collection will take longer due to rate limits
      const maxPages = process.env.TWITTER_MAX_FOLLOWER_PAGES 
        ? parseInt(process.env.TWITTER_MAX_FOLLOWER_PAGES, 10) 
        : Infinity; // No limit by default
      
      const maxFollowers = process.env.TWITTER_MAX_FOLLOWERS
        ? parseInt(process.env.TWITTER_MAX_FOLLOWERS, 10)
        : Infinity; // No limit by default

      logger.info(`Starting Twitter follower collection for ${account.username} (max pages: ${maxPages === Infinity ? 'unlimited' : maxPages}, max followers: ${maxFollowers === Infinity ? 'unlimited' : maxFollowers})`);

      while (pageCount < maxPages && followers.length < maxFollowers) {
        const params: any = {
          'user.fields': 'username,name,description,profile_image_url,verified',
          max_results: 100,
        };

        if (nextToken) {
          params.pagination_token = nextToken;
        }

        try {
          const response = await axios.get(
            `https://api.twitter.com/2/users/${account.platformId}/followers`,
            {
              params,
              headers: {
                'Authorization': `Bearer ${bearerToken}`,
              },
              timeout: 30000, // Increased timeout for large requests
            }
          );

          const data = response.data.data || [];
          for (const user of data) {
            if (followers.length >= maxFollowers) break;
            followers.push({
              id: user.id,
              username: user.username,
              displayName: user.name,
              bio: user.description,
            });
          }

          nextToken = response.data.meta?.next_token;
          if (!nextToken) {
            logger.info(`Reached end of follower list at page ${pageCount + 1}`);
            break;
          }

          pageCount++;
          
          // Check rate limits from response headers
          const rateLimitRemaining = response.headers['x-rate-limit-remaining'];
          if (rateLimitRemaining && parseInt(rateLimitRemaining, 10) <= 1) {
            const rateLimitReset = response.headers['x-rate-limit-reset'];
            if (rateLimitReset) {
              const resetTime = parseInt(rateLimitReset, 10) * 1000; // Convert to milliseconds
              const waitTime = resetTime - Date.now();
              if (waitTime > 0) {
                logger.warn(`Twitter rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
              }
            }
          } else {
            // Standard rate limiting: 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Log progress every 10 pages
          if (pageCount % 10 === 0) {
            logger.info(`Collected ${followers.length} followers so far (page ${pageCount})...`);
          }
        } catch (error: any) {
          // Handle rate limit errors specifically
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            if (retryAfter) {
              const waitTime = parseInt(retryAfter, 10) * 1000;
              logger.warn(`Rate limited. Waiting ${waitTime / 1000} seconds...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue; // Retry this page
            }
          }
          throw error; // Re-throw other errors
        }
      }

      logger.info(`Completed Twitter follower collection: ${followers.length} followers collected in ${pageCount} pages`);
      await this.followerRepository.saveFollowers(account.platformId, account.platform, followers);
      return followers.length;
    } catch (error: any) {
      // Handle 403 Forbidden (Elevated API access required)
      if (error.response?.status === 403) {
        logger.warn(
          `Twitter follower list requires Elevated API access for ${account.username}. ` +
          `Free tier only provides public_metrics. ` +
          `Use POST /api/influencers/:id/sync to get follower counts from public_metrics.`
        );
        return 0; // Graceful degradation
      }
      
      // Handle rate limiting - return 0 since we can't access partial data here
      if (error.response?.status === 429) {
        logger.warn(`Twitter rate limit reached for ${account.username}`);
        return 0; // Can't return partial data from catch block
      }
      
      logger.error('Twitter follower collection error', error.response?.data || error.message);
      return 0;
    }
  }

  private async collectFacebookFollowers(account: SocialAccount): Promise<number> {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!accessToken) {
      logger.warn('Facebook access token not configured');
      return 0;
    }

    // Facebook Graph API follower collection
    // Note: Requires page access token and proper permissions
    logger.warn('Facebook follower collection requires page access - not fully implemented');
    return 0;
  }

  private async collectYouTubeFollowers(account: SocialAccount): Promise<number> {
    // YouTube doesn't provide follower list via API
    // Only subscriber count is available
    logger.warn('YouTube does not provide follower list via API');
    return 0;
  }

  private async collectLinkedInFollowers(account: SocialAccount): Promise<number> {
    // LinkedIn API doesn't provide follower list
    logger.warn('LinkedIn does not provide follower list via API');
    return 0;
  }

  /**
   * Schedule background job to collect followers for an account
   */
  async scheduleFollowerCollection(account: SocialAccount): Promise<void> {
    // In production, this would use a job queue (Bull, Agenda, etc.)
    logger.info(`Scheduling follower collection for ${account.platform}:${account.username}`);
    
    // For now, collect immediately (in production, use job queue)
    try {
      await this.collectFollowers(account);
    } catch (error) {
      logger.error('Scheduled follower collection failed', error);
    }
  }
}

