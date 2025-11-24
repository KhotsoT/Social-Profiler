import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';

export const campaignRoutes = Router();
const controller = new CampaignController();

campaignRoutes.get('/', controller.list.bind(controller));
campaignRoutes.get('/:id', controller.getById.bind(controller));
campaignRoutes.post('/', controller.create.bind(controller));
campaignRoutes.put('/:id', controller.update.bind(controller));
campaignRoutes.delete('/:id', controller.delete.bind(controller));
campaignRoutes.post('/:id/influencers', controller.addInfluencer.bind(controller));

