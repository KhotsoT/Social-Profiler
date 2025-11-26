/**
 * CreatorPay Wallet Service
 * Manages influencer wallets, earnings, and payouts
 */

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { currencyService } from './currencyService';

// Types
export interface Wallet {
  id: string;
  influencer_id: string;
  currency: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  last_transaction_at: Date | null;
}

export interface Earning {
  id: string;
  influencer_id: string;
  campaign_id: string;
  content_id: string | null;
  gross_amount: number;
  platform_fee: number;
  platform_fee_percentage: number;
  net_amount: number;
  creator_currency: string;
  status: 'pending' | 'approved' | 'available' | 'withdrawn' | 'cancelled';
  available_at: Date | null;
  created_at: Date;
}

export interface PayoutRequest {
  influencer_id: string;
  payout_account_id: string;
  amount: number;
  is_instant?: boolean;
}

export interface Payout {
  id: string;
  influencer_id: string;
  payout_account_id: string;
  currency: string;
  amount: number;
  fee: number;
  net_amount: number;
  is_instant: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: Date;
}

export interface EarningsSummary {
  total_earned: number;
  available_balance: number;
  pending_balance: number;
  this_month: number;
  last_month: number;
  growth_percentage: number;
  currency: string;
  currency_symbol: string;
  by_platform: Record<string, number>;
  by_month: Array<{ month: string; amount: number }>;
}

class WalletService {
  /**
   * Get or create wallet for an influencer
   */
  async getOrCreateWallet(influencerId: string): Promise<Wallet> {
    try {
      // Try to get existing wallet
      let result = await pool.query(
        `SELECT w.*, c.symbol as currency_symbol
         FROM influencer_wallets w
         JOIN currencies c ON w.currency = c.code
         WHERE w.influencer_id = $1`,
        [influencerId]
      );

      if (result.rows[0]) {
        return result.rows[0];
      }

      // Get influencer's preferred currency
      const influencerResult = await pool.query(
        `SELECT payout_currency FROM influencers WHERE id = $1`,
        [influencerId]
      );
      const currency = influencerResult.rows[0]?.payout_currency || 'ZAR';

      // Create new wallet
      result = await pool.query(
        `INSERT INTO influencer_wallets (influencer_id, currency)
         VALUES ($1, $2)
         RETURNING *`,
        [influencerId, currency]
      );

      logger.info(`Created wallet for influencer ${influencerId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in getOrCreateWallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(influencerId: string): Promise<{
    available: number;
    pending: number;
    currency: string;
    formatted_available: string;
    formatted_pending: string;
  }> {
    const wallet = await this.getOrCreateWallet(influencerId);
    const currency = await currencyService.getCurrency(wallet.currency);

    return {
      available: wallet.available_balance,
      pending: wallet.pending_balance,
      currency: wallet.currency,
      formatted_available: currencyService.formatAmount(wallet.available_balance, currency),
      formatted_pending: currencyService.formatAmount(wallet.pending_balance, currency),
    };
  }

  /**
   * Get earnings summary for dashboard
   */
  async getEarningsSummary(influencerId: string): Promise<EarningsSummary> {
    try {
      const wallet = await this.getOrCreateWallet(influencerId);
      const currency = await currencyService.getCurrency(wallet.currency);

      // Get this month and last month earnings
      const monthlyResult = await pool.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) 
                        THEN net_amount_creator_currency ELSE 0 END), 0) as this_month,
           COALESCE(SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') 
                        THEN net_amount_creator_currency ELSE 0 END), 0) as last_month
         FROM earnings
         WHERE influencer_id = $1 AND status IN ('available', 'withdrawn')`,
        [influencerId]
      );

      const thisMonth = parseFloat(monthlyResult.rows[0]?.this_month) || 0;
      const lastMonth = parseFloat(monthlyResult.rows[0]?.last_month) || 0;
      const growthPercentage = lastMonth > 0 
        ? ((thisMonth - lastMonth) / lastMonth) * 100 
        : thisMonth > 0 ? 100 : 0;

      // Get earnings by platform (from campaigns)
      const platformResult = await pool.query(
        `SELECT 
           COALESCE(c.target_platforms[1], 'other') as platform,
           COALESCE(SUM(e.net_amount_creator_currency), 0) as total
         FROM earnings e
         JOIN campaigns c ON e.campaign_id = c.id
         WHERE e.influencer_id = $1 AND e.status IN ('available', 'withdrawn')
         GROUP BY c.target_platforms[1]`,
        [influencerId]
      );

      const byPlatform: Record<string, number> = {};
      platformResult.rows.forEach((row: { platform: string; total: string }) => {
        byPlatform[row.platform] = parseFloat(row.total);
      });

      // Get earnings by month (last 6 months)
      const monthlyTrendResult = await pool.query(
        `SELECT 
           TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
           COALESCE(SUM(net_amount_creator_currency), 0) as amount
         FROM earnings
         WHERE influencer_id = $1 
           AND status IN ('available', 'withdrawn')
           AND created_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`,
        [influencerId]
      );

      return {
        total_earned: wallet.total_earned,
        available_balance: wallet.available_balance,
        pending_balance: wallet.pending_balance,
        this_month: thisMonth,
        last_month: lastMonth,
        growth_percentage: Math.round(growthPercentage * 10) / 10,
        currency: wallet.currency,
        currency_symbol: currency?.symbol || wallet.currency,
        by_platform: byPlatform,
        by_month: monthlyTrendResult.rows.map((row: { month: string; amount: string }) => ({
          month: row.month,
          amount: parseFloat(row.amount),
        })),
      };
    } catch (error) {
      logger.error('Error in getEarningsSummary:', error);
      throw error;
    }
  }

  /**
   * Credit earnings to influencer (when content is approved)
   */
  async creditEarning(params: {
    influencer_id: string;
    campaign_id: string;
    content_id?: string;
    escrow_id?: string;
    gross_amount: number;
    brand_currency: string;
    creator_currency: string;
    platform_fee_percentage: number;
    locked_rate_id?: string;
  }): Promise<Earning> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get exchange rate
      let exchangeRate = 1.0;
      if (params.locked_rate_id) {
        exchangeRate = await currencyService.getLockedRate(params.locked_rate_id);
      } else {
        exchangeRate = await currencyService.getExchangeRate(
          params.brand_currency,
          params.creator_currency
        );
      }

      // Calculate amounts in creator's currency
      const grossCreatorCurrency = Math.round(params.gross_amount * exchangeRate * 100) / 100;
      const platformFee = Math.round(grossCreatorCurrency * (params.platform_fee_percentage / 100) * 100) / 100;
      const netAmount = grossCreatorCurrency - platformFee;

      // Insert earning
      const earningResult = await client.query(
        `INSERT INTO earnings (
           influencer_id, campaign_id, content_id, escrow_id,
           gross_amount, gross_amount_creator_currency,
           platform_fee, platform_fee_creator_currency,
           platform_fee_percentage,
           net_amount, net_amount_creator_currency,
           creator_currency, brand_currency,
           gross_amount_brand_currency,
           exchange_rate_used, locked_rate_id,
           status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending')
         RETURNING *`,
        [
          params.influencer_id,
          params.campaign_id,
          params.content_id || null,
          params.escrow_id || null,
          grossCreatorCurrency,
          grossCreatorCurrency,
          platformFee,
          platformFee,
          params.platform_fee_percentage,
          netAmount,
          netAmount,
          params.creator_currency,
          params.brand_currency,
          params.gross_amount,
          exchangeRate,
          params.locked_rate_id || null,
        ]
      );

      // Update wallet pending balance
      await client.query(
        `UPDATE influencer_wallets
         SET pending_balance = pending_balance + $1,
             total_earned = total_earned + $1,
             last_transaction_at = NOW()
         WHERE influencer_id = $2`,
        [netAmount, params.influencer_id]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (
           influencer_id, transaction_type, campaign_id, earning_id,
           amount, currency, direction, description
         ) VALUES ($1, 'earning_credited', $2, $3, $4, $5, 'credit', $6)`,
        [
          params.influencer_id,
          params.campaign_id,
          earningResult.rows[0].id,
          netAmount,
          params.creator_currency,
          'Earnings credited from campaign',
        ]
      );

      await client.query('COMMIT');

      logger.info(`Credited earning of ${netAmount} ${params.creator_currency} to influencer ${params.influencer_id}`);
      return earningResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error crediting earning:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Make earnings available (after hold period)
   */
  async makeEarningsAvailable(earningId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get earning details
      const earningResult = await client.query(
        `SELECT * FROM earnings WHERE id = $1 AND status = 'pending'`,
        [earningId]
      );

      if (!earningResult.rows[0]) {
        throw new Error('Earning not found or not pending');
      }

      const earning = earningResult.rows[0];

      // Update earning status
      await client.query(
        `UPDATE earnings SET status = 'available', available_at = NOW() WHERE id = $1`,
        [earningId]
      );

      // Move from pending to available in wallet
      await client.query(
        `UPDATE influencer_wallets
         SET pending_balance = pending_balance - $1,
             available_balance = available_balance + $1,
             last_transaction_at = NOW()
         WHERE influencer_id = $2`,
        [earning.net_amount_creator_currency, earning.influencer_id]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (
           influencer_id, transaction_type, earning_id,
           amount, currency, direction, description
         ) VALUES ($1, 'earning_available', $2, $3, $4, 'credit', $5)`,
        [
          earning.influencer_id,
          earningId,
          earning.net_amount_creator_currency,
          earning.creator_currency,
          'Earnings now available for withdrawal',
        ]
      );

      await client.query('COMMIT');

      logger.info(`Made earning ${earningId} available for withdrawal`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error making earning available:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get earnings history for an influencer
   */
  async getEarningsHistory(
    influencerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ earnings: Earning[]; total: number }> {
    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM earnings WHERE influencer_id = $1`,
        [influencerId]
      );

      const earningsResult = await pool.query(
        `SELECT e.*, c.name as campaign_name, comp.name as company_name
         FROM earnings e
         JOIN campaigns c ON e.campaign_id = c.id
         LEFT JOIN companies comp ON c.company_id = comp.id
         WHERE e.influencer_id = $1
         ORDER BY e.created_at DESC
         LIMIT $2 OFFSET $3`,
        [influencerId, limit, offset]
      );

      return {
        earnings: earningsResult.rows,
        total: parseInt(countResult.rows[0].count),
      };
    } catch (error) {
      logger.error('Error getting earnings history:', error);
      throw error;
    }
  }

  /**
   * Request a payout
   */
  async requestPayout(params: PayoutRequest): Promise<Payout> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get wallet
      const walletResult = await client.query(
        `SELECT * FROM influencer_wallets WHERE influencer_id = $1 FOR UPDATE`,
        [params.influencer_id]
      );

      if (!walletResult.rows[0]) {
        throw new Error('Wallet not found');
      }

      const wallet = walletResult.rows[0];

      // Check balance
      if (wallet.available_balance < params.amount) {
        throw new Error('Insufficient balance');
      }

      // Calculate fee (1.5% for instant, 0 for standard)
      const fee = params.is_instant ? Math.round(params.amount * 0.015 * 100) / 100 : 0;
      const netAmount = params.amount - fee;

      // Create payout request
      const payoutResult = await client.query(
        `INSERT INTO payouts (
           influencer_id, payout_account_id, currency,
           amount, fee, net_amount, is_instant, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [
          params.influencer_id,
          params.payout_account_id,
          wallet.currency,
          params.amount,
          fee,
          netAmount,
          params.is_instant || false,
        ]
      );

      // Deduct from available balance
      await client.query(
        `UPDATE influencer_wallets
         SET available_balance = available_balance - $1,
             last_transaction_at = NOW()
         WHERE influencer_id = $2`,
        [params.amount, params.influencer_id]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (
           influencer_id, transaction_type, payout_id,
           amount, currency, direction, description
         ) VALUES ($1, 'payout_requested', $2, $3, $4, 'debit', $5)`,
        [
          params.influencer_id,
          payoutResult.rows[0].id,
          params.amount,
          wallet.currency,
          params.is_instant ? 'Instant payout requested' : 'Payout requested',
        ]
      );

      await client.query('COMMIT');

      logger.info(`Payout of ${params.amount} requested by influencer ${params.influencer_id}`);
      return payoutResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error requesting payout:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(
    influencerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ payouts: Payout[]; total: number }> {
    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM payouts WHERE influencer_id = $1`,
        [influencerId]
      );

      const payoutsResult = await pool.query(
        `SELECT p.*, pa.account_type, pa.bank_name, pa.account_number_last4
         FROM payouts p
         JOIN payout_accounts pa ON p.payout_account_id = pa.id
         WHERE p.influencer_id = $1
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [influencerId, limit, offset]
      );

      return {
        payouts: payoutsResult.rows,
        total: parseInt(countResult.rows[0].count),
      };
    } catch (error) {
      logger.error('Error getting payout history:', error);
      throw error;
    }
  }

  /**
   * Get payout accounts for an influencer
   */
  async getPayoutAccounts(influencerId: string): Promise<Array<{
    id: string;
    account_type: string;
    bank_name: string | null;
    account_number_last4: string | null;
    paypal_email: string | null;
    is_default: boolean;
    is_verified: boolean;
  }>> {
    try {
      const result = await pool.query(
        `SELECT id, account_type, bank_name, account_number_last4, 
                paypal_email, is_default, is_verified
         FROM payout_accounts
         WHERE influencer_id = $1
         ORDER BY is_default DESC, created_at DESC`,
        [influencerId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting payout accounts:', error);
      throw error;
    }
  }

  /**
   * Add a payout account
   */
  async addPayoutAccount(params: {
    influencer_id: string;
    account_type: 'bank_account' | 'paypal' | 'mobile_money';
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    branch_code?: string;
    paypal_email?: string;
    mobile_number?: string;
    mobile_provider?: string;
    is_default?: boolean;
  }): Promise<{ id: string }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (params.is_default) {
        await client.query(
          `UPDATE payout_accounts SET is_default = FALSE WHERE influencer_id = $1`,
          [params.influencer_id]
        );
      }

      // Encrypt account number if provided
      const accountNumberLast4 = params.account_number 
        ? params.account_number.slice(-4) 
        : null;

      const result = await client.query(
        `INSERT INTO payout_accounts (
           influencer_id, account_type, bank_name, account_holder_name,
           account_number_last4, account_number_encrypted, branch_code,
           paypal_email, mobile_number, mobile_provider, is_default
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          params.influencer_id,
          params.account_type,
          params.bank_name || null,
          params.account_holder_name || null,
          accountNumberLast4,
          params.account_number || null, // In production, encrypt this
          params.branch_code || null,
          params.paypal_email || null,
          params.mobile_number || null,
          params.mobile_provider || null,
          params.is_default || false,
        ]
      );

      await client.query('COMMIT');

      logger.info(`Added payout account for influencer ${params.influencer_id}`);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding payout account:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export const walletService = new WalletService();
export default walletService;


