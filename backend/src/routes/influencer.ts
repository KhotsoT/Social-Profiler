import { Router } from 'express';
import { InfluencerController } from '../controllers/influencerController';

export const influencerRoutes = Router();
const controller = new InfluencerController();

// Search and discovery
influencerRoutes.get('/search', controller.search.bind(controller));
influencerRoutes.get('/discover', controller.discover.bind(controller));

// Individual influencer operations
influencerRoutes.get('/:id', controller.getById.bind(controller));
influencerRoutes.post('/', controller.create.bind(controller));
influencerRoutes.put('/:id', controller.update.bind(controller));
influencerRoutes.delete('/:id', controller.delete.bind(controller));

// Analytics
influencerRoutes.get('/:id/analytics', controller.getAnalytics.bind(controller));
influencerRoutes.get('/:id/true-followers', controller.getTrueFollowers.bind(controller));

// Social Media Sync (uses free tier APIs - public_metrics)
influencerRoutes.post('/:id/sync', controller.syncSocialAccounts.bind(controller));

// Add Social Account (adds without deleting existing)
influencerRoutes.post('/:id/social-accounts', controller.addSocialAccount.bind(controller));

// Follower Collection (requires elevated API access for full lists)
influencerRoutes.post('/:id/collect-followers', controller.collectFollowers.bind(controller));

// Categorization
influencerRoutes.get('/:id/categories', controller.getCategories.bind(controller));
influencerRoutes.get('/category/:category', controller.getByCategory.bind(controller));

