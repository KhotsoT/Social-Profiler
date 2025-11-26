/**
 * CreatorPay Currency Service
 * Handles multi-currency operations, exchange rates, and conversions
 */

import { pool } from '../config/database';
import { logger } from '../utils/logger';

// Types
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  symbol_position: 'before' | 'after';
  decimal_places: number;
  thousand_separator: string;
  decimal_separator: string;
  is_active: boolean;
  is_payout_supported: boolean;
  is_payment_supported: boolean;
  min_payout_amount: number;
  min_campaign_amount: number;
}

export interface Country {
  code: string;
  code_alpha3: string;
  name: string;
  default_currency: string;
  region: string;
  flag_emoji: string;
  is_creator_available: boolean;
  is_brand_available: boolean;
  payment_providers: string[];
  payout_providers: string[];
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  valid_from: Date;
}

export interface ConversionResult {
  original_amount: number;
  original_currency: string;
  converted_amount: number;
  target_currency: string;
  exchange_rate: number;
  formatted_original: string;
  formatted_converted: string;
}

class CurrencyService {
  // Cache for exchange rates (refresh every 5 minutes)
  private rateCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all active currencies
   */
  async getAllCurrencies(): Promise<Currency[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM currencies WHERE is_active = TRUE ORDER BY code`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching currencies:', error);
      throw error;
    }
  }

  /**
   * Get a single currency by code
   */
  async getCurrency(code: string): Promise<Currency | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM currencies WHERE code = $1`,
        [code.toUpperCase()]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching currency:', error);
      throw error;
    }
  }

  /**
   * Get all active countries
   */
  async getAllCountries(): Promise<Country[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM countries WHERE is_active = TRUE ORDER BY name`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching countries:', error);
      throw error;
    }
  }

  /**
   * Get countries where creators can register
   */
  async getCreatorCountries(): Promise<Country[]> {
    try {
      const result = await pool.query(
        `SELECT c.*, cur.symbol, cur.name as currency_name 
         FROM countries c
         JOIN currencies cur ON c.default_currency = cur.code
         WHERE c.is_active = TRUE AND c.is_creator_available = TRUE 
         ORDER BY c.name`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching creator countries:', error);
      throw error;
    }
  }

  /**
   * Get countries where brands can operate
   */
  async getBrandCountries(): Promise<Country[]> {
    try {
      const result = await pool.query(
        `SELECT c.*, cur.symbol, cur.name as currency_name 
         FROM countries c
         JOIN currencies cur ON c.default_currency = cur.code
         WHERE c.is_active = TRUE AND c.is_brand_available = TRUE 
         ORDER BY c.name`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching brand countries:', error);
      throw error;
    }
  }

  /**
   * Get current exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Same currency
    if (from === to) return 1.0;

    // Check cache first
    const cacheKey = `${from}_${to}`;
    const cached = this.rateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.rate;
    }

    try {
      // Use the database function
      const result = await pool.query(
        `SELECT get_exchange_rate($1, $2) as rate`,
        [from, to]
      );
      
      const rate = parseFloat(result.rows[0]?.rate) || 1.0;
      
      // Cache the result
      this.rateCache.set(cacheKey, { rate, timestamp: Date.now() });
      
      return rate;
    } catch (error) {
      logger.error('Error getting exchange rate:', error);
      // Return 1.0 as fallback
      return 1.0;
    }
  }

  /**
   * Convert an amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    const rate = await this.getExchangeRate(from, to);
    const convertedAmount = Math.round(amount * rate * 100) / 100;

    const fromCurrencyData = await this.getCurrency(from);
    const toCurrencyData = await this.getCurrency(to);

    return {
      original_amount: amount,
      original_currency: from,
      converted_amount: convertedAmount,
      target_currency: to,
      exchange_rate: rate,
      formatted_original: this.formatAmount(amount, fromCurrencyData),
      formatted_converted: this.formatAmount(convertedAmount, toCurrencyData),
    };
  }

  /**
   * Format an amount with currency symbol
   */
  formatAmount(amount: number, currency: Currency | null): string {
    if (!currency) {
      return amount.toFixed(2);
    }

    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places,
    });

    if (currency.symbol_position === 'before') {
      return `${currency.symbol}${formatted}`;
    } else {
      return `${formatted} ${currency.symbol}`;
    }
  }

  /**
   * Lock an exchange rate for a campaign
   */
  async lockExchangeRate(
    campaignId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ id: string; rate: number }> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);

    try {
      const result = await pool.query(
        `INSERT INTO locked_exchange_rates 
         (campaign_id, from_currency, to_currency, locked_rate)
         VALUES ($1, $2, $3, $4)
         RETURNING id, locked_rate as rate`,
        [campaignId, fromCurrency.toUpperCase(), toCurrency.toUpperCase(), rate]
      );

      logger.info(`Locked exchange rate for campaign ${campaignId}: ${fromCurrency} -> ${toCurrency} @ ${rate}`);
      
      return {
        id: result.rows[0].id,
        rate: parseFloat(result.rows[0].rate),
      };
    } catch (error) {
      logger.error('Error locking exchange rate:', error);
      throw error;
    }
  }

  /**
   * Get a locked exchange rate
   */
  async getLockedRate(lockedRateId: string): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT locked_rate FROM locked_exchange_rates WHERE id = $1`,
        [lockedRateId]
      );
      return parseFloat(result.rows[0]?.locked_rate) || 1.0;
    } catch (error) {
      logger.error('Error getting locked rate:', error);
      return 1.0;
    }
  }

  /**
   * Update exchange rates from external API
   * This would be called by a scheduled job
   */
  async updateExchangeRates(rates: Record<string, number>): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const [currency, rate] of Object.entries(rates)) {
        // Insert new rate
        await client.query(
          `INSERT INTO exchange_rates (from_currency, to_currency, rate, source)
           VALUES ('USD', $1, $2, 'api')`,
          [currency.toUpperCase(), rate]
        );

        // Update previous rate's validity
        await client.query(
          `UPDATE exchange_rates 
           SET valid_until = NOW()
           WHERE from_currency = 'USD' 
             AND to_currency = $1
             AND valid_until IS NULL
             AND id != (
               SELECT id FROM exchange_rates
               WHERE from_currency = 'USD' AND to_currency = $1
               ORDER BY created_at DESC LIMIT 1
             )`,
          [currency.toUpperCase()]
        );
      }

      await client.query('COMMIT');
      
      // Clear cache
      this.rateCache.clear();
      
      logger.info('Exchange rates updated successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating exchange rates:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get the default currency for a country
   */
  async getDefaultCurrency(countryCode: string): Promise<string> {
    try {
      const result = await pool.query(
        `SELECT default_currency FROM countries WHERE code = $1`,
        [countryCode.toUpperCase()]
      );
      return result.rows[0]?.default_currency || 'USD';
    } catch (error) {
      logger.error('Error getting default currency:', error);
      return 'USD';
    }
  }

  /**
   * Calculate influencer rates in multiple currencies
   */
  async convertRateCard(
    rates: Record<string, number>,
    fromCurrency: string,
    toCurrency: string
  ): Promise<Record<string, number>> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    
    const converted: Record<string, number> = {};
    for (const [key, value] of Object.entries(rates)) {
      if (value !== null && value !== undefined) {
        converted[key] = Math.round(value * rate * 100) / 100;
      }
    }
    
    return converted;
  }

  /**
   * Get all exchange rates for display (from USD)
   */
  async getAllExchangeRates(): Promise<ExchangeRate[]> {
    try {
      const result = await pool.query(
        `SELECT DISTINCT ON (to_currency) 
           from_currency, to_currency, rate, valid_from
         FROM exchange_rates
         WHERE from_currency = 'USD'
           AND valid_from <= NOW()
           AND (valid_until IS NULL OR valid_until > NOW())
         ORDER BY to_currency, valid_from DESC`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching exchange rates:', error);
      throw error;
    }
  }
}

export const currencyService = new CurrencyService();
export default currencyService;


