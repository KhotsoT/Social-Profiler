import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

export const adminRoutes = Router();
const controller = new AdminController();

adminRoutes.get('/api-mode', controller.getAPIMode.bind(controller));
adminRoutes.post('/api-mode', controller.setAPIMode.bind(controller));
adminRoutes.get('/test/twitter', controller.testTwitterAPI.bind(controller));
adminRoutes.get('/cache-stats', controller.getCacheStats.bind(controller));
adminRoutes.post('/clear-cache', controller.clearCache.bind(controller));



