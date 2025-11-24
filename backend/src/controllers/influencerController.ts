import { Request, Response, NextFunction } from 'express';
import { InfluencerService } from '../services/influencerService';
import { logger } from '../utils/logger';

export class InfluencerController {
  private service: InfluencerService;

  constructor() {
    this.service = new InfluencerService();
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, platform, minFollowers, maxFollowers, niche, location } = req.query;
      
      const filters = {
        query: query as string,
        platform: platform as string,
        minFollowers: minFollowers ? parseInt(minFollowers as string) : undefined,
        maxFollowers: maxFollowers ? parseInt(maxFollowers as string) : undefined,
        niche: niche as string,
        location: location as string,
      };

      const influencers = await this.service.search(filters);
      res.json({ influencers, count: influencers.length });
    } catch (error) {
      next(error);
    }
  }

  async discover(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, limit = 50 } = req.query;
      const influencers = await this.service.discover(
        category as string,
        parseInt(limit as string)
      );
      res.json({ influencers, count: influencers.length });
    } catch (error: any) {
      // If database error, return empty array instead of failing
      if (error?.code === 'ECONNREFUSED' || error?.message?.includes('database') || error?.message?.includes('connection')) {
        logger.warn('Database not available, returning empty influencers list');
        res.json({ influencers: [], count: 0 });
        return;
      }
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const influencer = await this.service.getById(id);
      if (!influencer) {
        res.status(404).json({ error: 'Influencer not found' });
        return;
      }
      res.json(influencer);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Creating influencer', { body: req.body });
      
      // Check if this is manual entry (has followerCount in socialAccounts)
      // If so, skip API sync to allow manual data entry
      const skipSync = req.body.socialAccounts?.some((acc: any) => 
        acc.followerCount !== undefined && acc.followerCount !== null && acc.followerCount !== ''
      );
      
      const influencer = await this.service.create(req.body, skipSync);
      logger.info('Influencer created successfully', { id: influencer.id });
      res.status(201).json(influencer);
    } catch (error: any) {
      logger.error('Error creating influencer:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        body: req.body,
      });
      
      // Always return detailed error
      res.status(500).json({
        error: 'Failed to create influencer',
        message: error.message || 'Unknown error',
        code: error.code,
        ...(error.stack && { stack: error.stack }),
      });
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const influencer = await this.service.update(id, req.body);
      res.json(influencer);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const analytics = await this.service.getAnalytics(id);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  async getTrueFollowers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trueFollowers = await this.service.getTrueFollowers(id);
      res.json(trueFollowers);
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const categories = await this.service.getCategories(id);
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const influencers = await this.service.getByCategory(
        category,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json({ influencers, count: influencers.length });
    } catch (error) {
      next(error);
    }
  }

  async syncSocialAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const influencer = await this.service.syncSocialAccounts(id);
      res.json({
        success: true,
        message: 'Social accounts synced successfully',
        influencer,
      });
    } catch (error) {
      next(error);
    }
  }

  async addSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const account = req.body;
      
      const influencer = await this.service.addSocialAccount(id, account);
      res.json({
        success: true,
        message: 'Social account added successfully',
        influencer,
      });
    } catch (error) {
      next(error);
    }
  }

  async collectFollowers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { force } = req.query; // ?force=true to override mode restrictions
      const result = await this.service.collectFollowers(id, force === 'true');
      res.json({
        success: true,
        message: `Collected ${result.collected} followers from ${result.accounts} accounts`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

