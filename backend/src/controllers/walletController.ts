/**
 * CreatorPay Wallet Controller
 * Handles wallet, earnings, and payout endpoints
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { walletService } from '../services/walletService';
import { logger } from '../utils/logger';

export class WalletController {
  /**
   * GET /api/wallet
   * Get current user's wallet
   */
  async getWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have wallets',
        });
        return;
      }

      const wallet = await walletService.getOrCreateWallet(influencerId);
      const balance = await walletService.getBalance(influencerId);

      res.json({
        success: true,
        data: {
          ...wallet,
          ...balance,
        },
      });
    } catch (error) {
      logger.error('Error in getWallet:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet',
      });
    }
  }

  /**
   * GET /api/wallet/balance
   * Get wallet balance
   */
  async getBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have wallets',
        });
        return;
      }

      const balance = await walletService.getBalance(influencerId);

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      logger.error('Error in getBalance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch balance',
      });
    }
  }

  /**
   * GET /api/wallet/summary
   * Get earnings summary for dashboard
   */
  async getEarningsSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have earnings',
        });
        return;
      }

      const summary = await walletService.getEarningsSummary(influencerId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error in getEarningsSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch earnings summary',
      });
    }
  }

  /**
   * GET /api/wallet/earnings
   * Get earnings history
   */
  async getEarnings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have earnings',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const { earnings, total } = await walletService.getEarningsHistory(
        influencerId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: earnings,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + earnings.length < total,
        },
      });
    } catch (error) {
      logger.error('Error in getEarnings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch earnings',
      });
    }
  }

  /**
   * GET /api/wallet/payouts
   * Get payout history
   */
  async getPayouts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have payouts',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const { payouts, total } = await walletService.getPayoutHistory(
        influencerId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: payouts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + payouts.length < total,
        },
      });
    } catch (error) {
      logger.error('Error in getPayouts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payouts',
      });
    }
  }

  /**
   * POST /api/wallet/payout
   * Request a payout
   */
  async requestPayout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers can request payouts',
        });
        return;
      }

      const { payout_account_id, amount, is_instant } = req.body;

      if (!payout_account_id || !amount) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: payout_account_id, amount',
        });
        return;
      }

      const payout = await walletService.requestPayout({
        influencer_id: influencerId,
        payout_account_id,
        amount: parseFloat(amount),
        is_instant: is_instant || false,
      });

      res.status(201).json({
        success: true,
        data: payout,
        message: is_instant 
          ? 'Instant payout initiated. Funds will arrive within minutes.'
          : 'Payout requested. Funds will arrive in 3-5 business days.',
      });
    } catch (error: any) {
      logger.error('Error in requestPayout:', error);
      
      if (error.message === 'Insufficient balance') {
        res.status(400).json({
          success: false,
          error: 'Insufficient balance for this payout',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to request payout',
      });
    }
  }

  /**
   * GET /api/wallet/payout-accounts
   * Get payout accounts
   */
  async getPayoutAccounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers have payout accounts',
        });
        return;
      }

      const accounts = await walletService.getPayoutAccounts(influencerId);

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      logger.error('Error in getPayoutAccounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payout accounts',
      });
    }
  }

  /**
   * POST /api/wallet/payout-accounts
   * Add a payout account
   */
  async addPayoutAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const influencerId = req.user?.influencerId;
      
      if (!influencerId) {
        res.status(403).json({
          success: false,
          error: 'Only influencers can add payout accounts',
        });
        return;
      }

      const { 
        account_type, bank_name, account_holder_name, account_number,
        branch_code, paypal_email, mobile_number, mobile_provider, is_default 
      } = req.body;

      if (!account_type) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: account_type',
        });
        return;
      }

      const account = await walletService.addPayoutAccount({
        influencer_id: influencerId,
        account_type,
        bank_name,
        account_holder_name,
        account_number,
        branch_code,
        paypal_email,
        mobile_number,
        mobile_provider,
        is_default,
      });

      res.status(201).json({
        success: true,
        data: account,
        message: 'Payout account added successfully',
      });
    } catch (error) {
      logger.error('Error in addPayoutAccount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add payout account',
      });
    }
  }
}

export const walletController = new WalletController();
export default walletController;


