/**
 * CreatorPay Currency Controller
 * Handles currency-related API endpoints
 */

import { Request, Response } from 'express';
import { currencyService } from '../services/currencyService';
import { logger } from '../utils/logger';

export class CurrencyController {
  /**
   * GET /api/currencies
   * Get all active currencies
   */
  async getAllCurrencies(req: Request, res: Response): Promise<void> {
    try {
      const currencies = await currencyService.getAllCurrencies();
      res.json({
        success: true,
        data: { currencies },
      });
    } catch (error) {
      logger.error('Error in getAllCurrencies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch currencies',
      });
    }
  }

  /**
   * GET /api/currencies/:code
   * Get a single currency by code
   */
  async getCurrency(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const currency = await currencyService.getCurrency(code);
      
      if (!currency) {
        res.status(404).json({
          success: false,
          error: 'Currency not found',
        });
        return;
      }

      res.json({
        success: true,
        data: currency,
      });
    } catch (error) {
      logger.error('Error in getCurrency:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch currency',
      });
    }
  }

  /**
   * GET /api/countries
   * Get all active countries
   */
  async getAllCountries(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      
      let countries;
      if (type === 'creators') {
        countries = await currencyService.getCreatorCountries();
      } else if (type === 'brands') {
        countries = await currencyService.getBrandCountries();
      } else {
        countries = await currencyService.getAllCountries();
      }

      res.json({
        success: true,
        data: { countries },
      });
    } catch (error) {
      logger.error('Error in getAllCountries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch countries',
      });
    }
  }

  /**
   * GET /api/exchange-rates
   * Get current exchange rates
   */
  async getExchangeRates(req: Request, res: Response): Promise<void> {
    try {
      const rates = await currencyService.getAllExchangeRates();
      res.json({
        success: true,
        data: rates,
        base_currency: 'USD',
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error in getExchangeRates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exchange rates',
      });
    }
  }

  /**
   * GET /api/exchange-rates/convert
   * Convert an amount between currencies
   */
  async convertAmount(req: Request, res: Response): Promise<void> {
    try {
      const { amount, from, to } = req.query;

      if (!amount || !from || !to) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: amount, from, to',
        });
        return;
      }

      const numericAmount = parseFloat(amount as string);
      if (isNaN(numericAmount)) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount',
        });
        return;
      }

      const result = await currencyService.convertCurrency(
        numericAmount,
        from as string,
        to as string
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in convertAmount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to convert amount',
      });
    }
  }

  /**
   * GET /api/exchange-rates/rate
   * Get exchange rate between two currencies
   */
  async getRate(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: from, to',
        });
        return;
      }

      const rate = await currencyService.getExchangeRate(
        from as string,
        to as string
      );

      res.json({
        success: true,
        data: {
          from_currency: (from as string).toUpperCase(),
          to_currency: (to as string).toUpperCase(),
          rate,
        },
      });
    } catch (error) {
      logger.error('Error in getRate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get exchange rate',
      });
    }
  }
}

export const currencyController = new CurrencyController();
export default currencyController;


