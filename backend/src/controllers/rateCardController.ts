/**
 * CreatorPay Rate Card Controller
 * Handles rate calculation and rate card endpoints
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { rateCalculatorService } from '../services/rateCalculatorService';
import { logger } from '../utils/logger';

export class RateCardController {
  /**
   * GET /api/rates/calculate
   * Quick rate estimate (public - for landing page)
   */
  async quickEstimate(req: Request, res: Response): Promise<void> {
    try {
      const { platform, followers, engagement_rate, currency } = req.query;

      if (!platform || !followers) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: platform, followers',
        });
        return;
      }

      const estimate = await rateCalculatorService.quickRateEstimate({
        platform: platform as string,
        followers: parseInt(followers as string),
        engagement_rate: engagement_rate ? parseFloat(engagement_rate as string) : undefined,
        currency: currency as string,
      });

      res.json({
        success: true,
        data: estimate,
      });
    } catch (error: any) {
      logger.error('Error in quickEstimate:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to calculate rates',
      });
    }
  }

  /**
   * GET /api/influencers/:id/rates
   * Get rate card for an influencer
   */
  async getInfluencerRates(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { currency } = req.query;

      const profile = await rateCalculatorService.calculateInfluencerRates(id);

      // If different currency requested, convert rates
      if (currency && currency !== profile.currency) {
        // TODO: Add currency conversion for rate cards
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error('Error in getInfluencerRates:', error);
      
      if (error.message === 'Influencer not found') {
        res.status(404).json({
          success: false,
          error: 'Influencer not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get rate card',
      });
    }
  }

  /**
   * GET /api/wallet/rate-card
   * Get current user's rate card
   */
  async getMyRateCard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;

      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have rate cards',
        });
        return;
      }

      const profile = await rateCalculatorService.calculateInfluencerRates(influencerId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error in getMyRateCard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get rate card',
      });
    }
  }

  /**
   * POST /api/wallet/rate-card/generate
   * Generate and save rate cards for current user
   */
  async generateMyRateCard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;

      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have rate cards',
        });
        return;
      }

      const profile = await rateCalculatorService.generateAndSaveRateCards(influencerId);

      res.json({
        success: true,
        data: profile,
        message: 'Rate card generated and saved successfully',
      });
    } catch (error) {
      logger.error('Error in generateMyRateCard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate rate card',
      });
    }
  }
}

export const rateCardController = new RateCardController();
export default rateCardController;


