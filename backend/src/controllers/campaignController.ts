import { Request, Response, NextFunction } from 'express';

export class CampaignController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ campaigns: [] });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ campaign: null });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ campaign: req.body });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ campaign: req.body });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async addInfluencer(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

