import { Request, Response, NextFunction } from 'express';
import { getAPIMode, getAPIModeConfig, APICallMode } from '../config/apiMode';
import { APICacheService } from '../services/apiCacheService';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export class AdminController {
  private cacheService: APICacheService;

  constructor() {
    this.cacheService = new APICacheService();
  }

  async getAPIMode(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = getAPIMode();
      const config = getAPIModeConfig();

      res.json({
        mode,
        config: {
          accountSyncInterval: `${config.accountSyncInterval / 1000 / 60} minutes`,
          followerSyncInterval: `${config.followerSyncInterval / 1000 / 60 / 60} hours`,
          analyticsSyncInterval: `${config.analyticsSyncInterval / 1000 / 60} minutes`,
          useCache: config.useCache,
          cacheExpiry: `${config.cacheExpiry / 1000 / 60} minutes`,
          requireChangeForSync: config.requireChangeForSync,
          changeThreshold: `${config.changeThreshold}%`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async setAPIMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mode } = req.body;

      if (!mode || !Object.values(APICallMode).includes(mode)) {
        res.status(400).json({
          error: 'Invalid mode. Must be one of: minimal, medium, live',
        });
        return;
      }

      // Note: In production, you'd want to persist this to database or config file
      // For now, we'll just log it - the actual mode is read from environment variable
      logger.info(`API mode change requested: ${mode} (set API_CALL_MODE environment variable)`);

      res.json({
        message: `API mode set to ${mode}. Update API_CALL_MODE environment variable to persist.`,
        mode,
        note: 'Restart server for changes to take effect',
      });
    } catch (error) {
      next(error);
    }
  }

  async testTwitterAPI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.query;
      if (!username) {
        res.status(400).json({ error: 'Username parameter required' });
        return;
      }

      const bearerToken = process.env.TWITTER_BEARER_TOKEN;
      if (!bearerToken) {
        res.status(500).json({ error: 'Twitter bearer token not configured' });
        return;
      }

      const axios = (await import('axios')).default;
      const response = await axios.get(
        `https://api.twitter.com/2/users/by/username/${username}`,
        {
          params: {
            'user.fields': 'public_metrics,verified,description',
          },
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
          },
          timeout: 10000,
        }
      );

      res.json({
        success: true,
        data: response.data,
        metrics: response.data.data?.public_metrics,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Twitter API test failed',
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  }

  async getCacheStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.cacheService.getCacheStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async clearCache(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform, platformId } = req.body;

      if (platform && platformId) {
        // Clear specific account cache
        await query(
          'UPDATE social_accounts SET last_synced_at = NULL WHERE platform = $1 AND platform_id = $2',
          [platform, platformId]
        );
        res.json({ message: `Cache cleared for ${platform}:${platformId}` });
      } else {
        // Clear all caches
        await query('UPDATE social_accounts SET last_synced_at = NULL', []);
        res.json({ message: 'All caches cleared' });
      }
    } catch (error) {
      next(error);
    }
  }
}


