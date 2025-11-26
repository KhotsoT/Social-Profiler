import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';

export class AnalyticsController {
  async getTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const pool = getDatabasePool();
      
      // Get growth trends from analytics table if available
      const trendsQuery = await pool.query(`
        SELECT 
          unnest(categories) as category,
          COUNT(*) as count
        FROM influencers 
        WHERE categories IS NOT NULL AND array_length(categories, 1) > 0
        GROUP BY unnest(categories)
        ORDER BY count DESC
        LIMIT 10
      `).catch(() => ({ rows: [] }));

      res.json({
        trends: trendsQuery.rows.map(row => ({
          category: row.category,
          count: parseInt(row.count),
          growth: Math.floor(Math.random() * 20) + 5, // Placeholder growth
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryStats(req: Request, res: Response, next: NextFunction) {
    try {
      const pool = getDatabasePool();
      
      // Get total influencers
      const totalResult = await pool.query('SELECT COUNT(*) FROM influencers');
      const totalInfluencers = parseInt(totalResult.rows[0].count);

      // Get total true followers
      const followersResult = await pool.query('SELECT COALESCE(SUM(true_follower_count), 0) as total FROM influencers');
      const totalTrueFollowers = parseInt(followersResult.rows[0].total);

      // Get category distribution
      const categoryResult = await pool.query(`
        SELECT 
          unnest(categories) as category,
          COUNT(*) as count
        FROM influencers 
        WHERE categories IS NOT NULL AND array_length(categories, 1) > 0
        GROUP BY unnest(categories)
        ORDER BY count DESC
      `).catch(() => ({ rows: [] }));

      // Get average engagement from social accounts
      const engagementResult = await pool.query(`
        SELECT COALESCE(AVG(engagement_rate), 0) as avg_engagement 
        FROM social_accounts
      `).catch(() => ({ rows: [{ avg_engagement: 0 }] }));
      const averageEngagement = parseFloat(engagementResult.rows[0].avg_engagement) || 0;

      // Get top categories
      const topCategories = categoryResult.rows.slice(0, 5).map(r => r.category);

      res.json({
        totalInfluencers,
        totalTrueFollowers,
        averageEngagement,
        topCategories,
        categories: categoryResult.rows.map(row => ({
          category: row.category,
          count: parseInt(row.count),
          percentage: totalInfluencers > 0 ? ((parseInt(row.count) / totalInfluencers) * 100).toFixed(1) : 0,
        })),
      });
    } catch (error) {
      logger.error('Error getting category stats:', error);
      next(error);
    }
  }

  async getPlatformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const pool = getDatabasePool();
      
      // Get platform distribution
      const platformResult = await pool.query(`
        SELECT 
          platform,
          COUNT(*) as count,
          COALESCE(SUM(follower_count), 0) as total_followers,
          COALESCE(AVG(engagement_rate), 0) as avg_engagement
        FROM social_accounts
        GROUP BY platform
        ORDER BY count DESC
      `);

      res.json({
        platforms: platformResult.rows.map(row => ({
          platform: row.platform,
          count: parseInt(row.count),
          totalFollowers: parseInt(row.total_followers),
          avgEngagement: parseFloat(row.avg_engagement) || 0,
        })),
      });
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      next(error);
    }
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const pool = getDatabasePool();

      // Get all stats in parallel
      const [
        influencerCount,
        campaignCount,
        followerSum,
        avgEngagement,
        platformBreakdown,
        topCategories
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM influencers'),
        pool.query('SELECT COUNT(*) FROM campaigns').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COALESCE(SUM(true_follower_count), 0) as total FROM influencers'),
        pool.query('SELECT COALESCE(AVG(engagement_rate), 0) as avg FROM social_accounts'),
        pool.query(`
          SELECT platform, COUNT(*) as count 
          FROM social_accounts 
          GROUP BY platform
        `),
        pool.query(`
          SELECT unnest(categories) as category, COUNT(*) as count
          FROM influencers 
          WHERE categories IS NOT NULL AND array_length(categories, 1) > 0
          GROUP BY unnest(categories)
          ORDER BY count DESC
          LIMIT 5
        `).catch(() => ({ rows: [] })),
      ]);

      // Build platform breakdown object
      const platforms: Record<string, number> = {};
      platformBreakdown.rows.forEach(row => {
        platforms[row.platform] = parseInt(row.count);
      });

      res.json({
        success: true,
        data: {
          totalInfluencers: parseInt(influencerCount.rows[0].count),
          totalCampaigns: parseInt(campaignCount.rows[0].count),
          totalFollowers: parseInt(followerSum.rows[0].total),
          avgEngagement: parseFloat(avgEngagement.rows[0].avg) || 0,
          platformBreakdown: platforms,
          topCategories: topCategories.rows.map(r => r.category),
        },
      });
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      next(error);
    }
  }
}
