import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

export const analyticsRoutes = Router();
const controller = new AnalyticsController();

analyticsRoutes.get('/trends', controller.getTrends.bind(controller));
analyticsRoutes.get('/categories', controller.getCategoryStats.bind(controller));
analyticsRoutes.get('/platforms', controller.getPlatformStats.bind(controller));

