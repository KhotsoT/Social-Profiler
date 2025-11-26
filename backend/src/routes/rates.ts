/**
 * CreatorPay Rate Card Routes
 * API endpoints for rate calculations
 */

import { Router } from 'express';
import { rateCardController } from '../controllers/rateCardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public endpoint for landing page calculator
router.get('/calculate', (req, res) => rateCardController.quickEstimate(req, res));

// Authenticated endpoints
router.get('/my-rate-card', authenticate, (req, res) => rateCardController.getMyRateCard(req, res));
router.post('/my-rate-card/generate', authenticate, (req, res) => rateCardController.generateMyRateCard(req, res));

export default router;


