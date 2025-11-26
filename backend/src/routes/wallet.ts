/**
 * CreatorPay Wallet Routes
 * API endpoints for wallet, earnings, and payouts
 */

import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

// Wallet endpoints
router.get('/', (req, res) => walletController.getWallet(req, res));
router.get('/balance', (req, res) => walletController.getBalance(req, res));
router.get('/summary', (req, res) => walletController.getEarningsSummary(req, res));

// Earnings endpoints
router.get('/earnings', (req, res) => walletController.getEarnings(req, res));

// Payout endpoints
router.get('/payouts', (req, res) => walletController.getPayouts(req, res));
router.post('/payout', (req, res) => walletController.requestPayout(req, res));

// Payout accounts
router.get('/payout-accounts', (req, res) => walletController.getPayoutAccounts(req, res));
router.post('/payout-accounts', (req, res) => walletController.addPayoutAccount(req, res));

export default router;


