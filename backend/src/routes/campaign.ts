import { Router } from 'express';
import { campaignController } from '../controllers/campaignController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCampaignSchema, updateCampaignSchema, addInfluencerToCampaignSchema } from '../schemas/validation';

export const campaignRoutes = Router();

// List campaigns (optional auth - shows user's campaigns if logged in)
campaignRoutes.get(
  '/',
  optionalAuth,
  campaignController.list.bind(campaignController)
);

// Get campaign by ID
campaignRoutes.get(
  '/:id',
  optionalAuth,
  campaignController.getById.bind(campaignController)
);

// Create new campaign (requires auth)
campaignRoutes.post(
  '/',
  optionalAuth,
  validate(createCampaignSchema),
  campaignController.create.bind(campaignController)
);

// Update campaign (requires auth)
campaignRoutes.put(
  '/:id',
  optionalAuth,
  validate(updateCampaignSchema),
  campaignController.update.bind(campaignController)
);

// Delete campaign (requires auth)
campaignRoutes.delete(
  '/:id',
  optionalAuth,
  campaignController.delete.bind(campaignController)
);

// Get campaign influencers
campaignRoutes.get(
  '/:id/influencers',
  optionalAuth,
  campaignController.getInfluencers.bind(campaignController)
);

// Add influencer to campaign (requires auth)
campaignRoutes.post(
  '/:id/influencers',
  optionalAuth,
  validate(addInfluencerToCampaignSchema),
  campaignController.addInfluencer.bind(campaignController)
);

// Remove influencer from campaign (requires auth)
campaignRoutes.delete(
  '/:id/influencers/:influencerId',
  optionalAuth,
  campaignController.removeInfluencer.bind(campaignController)
);
