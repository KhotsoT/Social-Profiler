/**
 * CreatorPay Currency Routes
 * API endpoints for currency and country data
 */

import { Router } from 'express';
import { currencyController } from '../controllers/currencyController';

const router = Router();

// Currency endpoints
router.get('/currencies', (req, res) => currencyController.getAllCurrencies(req, res));
router.get('/currencies/:code', (req, res) => currencyController.getCurrency(req, res));

// Country endpoints
router.get('/countries', (req, res) => currencyController.getAllCountries(req, res));

// Exchange rate endpoints
router.get('/exchange-rates', (req, res) => currencyController.getExchangeRates(req, res));
router.get('/exchange-rates/convert', (req, res) => currencyController.convertAmount(req, res));
router.get('/exchange-rates/rate', (req, res) => currencyController.getRate(req, res));

export default router;


