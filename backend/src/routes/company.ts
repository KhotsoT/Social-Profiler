/**
 * CreatorPay Company Routes
 * API endpoints for company/brand management
 */

import { Router } from 'express';
import { companyController } from '../controllers/companyController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All company routes require authentication
router.use(authenticate);

// Company CRUD
router.post('/', (req, res) => companyController.createCompany(req, res));
router.get('/me', (req, res) => companyController.getMyCompany(req, res));
router.get('/:id', (req, res) => companyController.getCompany(req, res));
router.put('/:id', (req, res) => companyController.updateCompany(req, res));

// Company stats
router.get('/:id/stats', (req, res) => companyController.getCompanyStats(req, res));

// Team management
router.get('/:id/team', (req, res) => companyController.getTeamMembers(req, res));
router.post('/:id/team', (req, res) => companyController.addTeamMember(req, res));

export default router;


