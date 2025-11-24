import { Router } from 'express';
import { AuthController } from '../controllers/authController';

export const authRoutes = Router();
const controller = new AuthController();

// OAuth initiation endpoints
authRoutes.get('/instagram', controller.initiateInstagramOAuth.bind(controller));
authRoutes.get('/twitter', controller.initiateTwitterOAuth.bind(controller));
authRoutes.get('/tiktok', controller.initiateTikTokOAuth.bind(controller));
authRoutes.get('/facebook', controller.initiateFacebookOAuth.bind(controller));
authRoutes.get('/youtube', controller.initiateYouTubeOAuth.bind(controller));

// OAuth callback endpoints
authRoutes.get('/instagram/callback', controller.handleInstagramCallback.bind(controller));
authRoutes.get('/twitter/callback', controller.handleTwitterCallback.bind(controller));
authRoutes.get('/tiktok/callback', controller.handleTikTokCallback.bind(controller));
authRoutes.get('/facebook/callback', controller.handleFacebookCallback.bind(controller));
authRoutes.get('/youtube/callback', controller.handleYouTubeCallback.bind(controller));

// Connect existing account (for logged-in influencers)
authRoutes.post('/connect/:platform', controller.connectAccount.bind(controller));

// Get connected accounts for current user
authRoutes.get('/accounts', controller.getConnectedAccounts.bind(controller));

// Disconnect account
authRoutes.delete('/accounts/:platform', controller.disconnectAccount.bind(controller));



