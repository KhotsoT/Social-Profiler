import { Request, Response, NextFunction } from 'express';
import { OAuthService } from '../services/oauthService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class AuthController {
  private oauthService: OAuthService;

  constructor() {
    this.oauthService = new OAuthService();
  }

  /**
   * Initiate Instagram OAuth flow
   * User will be redirected to Instagram to grant permissions
   */
  async initiateInstagramOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      // Generate state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in session or return it to client
      // For now, we'll include it in the redirect URL
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/instagram/callback`;
      
      const authUrl = this.oauthService.getInstagramAuthUrl(redirectUri, state);
      
      // Store state in response header or return to client
      res.json({
        authUrl,
        state, // Client should store this and verify on callback
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Instagram OAuth callback
   */
  async handleInstagramCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code missing' });
        return;
      }

      // Exchange code for access token
      const tokens = await this.oauthService.exchangeInstagramCode(
        code as string,
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/instagram/callback`
      );

      // Get user info using the access token
      const userInfo = await this.oauthService.getInstagramUserInfo(tokens.access_token);

      // Create or update influencer with this account
      // For now, return tokens to frontend to store
      // In production, you'd store these securely server-side
      res.json({
        success: true,
        platform: 'instagram',
        username: userInfo.username,
        userId: userInfo.id,
        accessToken: tokens.access_token, // In production, store this server-side
        expiresIn: tokens.expires_in,
        message: 'Instagram account connected successfully',
      });
    } catch (error: any) {
      logger.error('Instagram OAuth callback error:', error);
      res.status(500).json({
        error: 'Failed to connect Instagram account',
        message: error.message,
      });
      return;
    }
  }

  async initiateTwitterOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/twitter/callback`;
      
      const result = this.oauthService.getTwitterAuthUrl(redirectUri, state);
      
      // Store codeVerifier with state - in production, use Redis or session
      // For now, we'll return it to frontend to send back
      res.json({
        authUrl: result.authUrl,
        state,
        codeVerifier: result.codeVerifier, // Frontend should store this and send it back
      });
    } catch (error) {
      next(error);
    }
  }

  async handleTwitterCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state, code_verifier } = req.query;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code missing' });
        return;
      }

      if (!code_verifier) {
        res.status(400).json({ error: 'Code verifier missing. Please include it from the initial OAuth request.' });
        return;
      }

      const tokens = await this.oauthService.exchangeTwitterCode(
        code as string,
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/twitter/callback`,
        code_verifier as string
      );

      const userInfo = await this.oauthService.getTwitterUserInfo(tokens.access_token);

      res.json({
        success: true,
        platform: 'twitter',
        username: userInfo.username,
        userId: userInfo.id,
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        message: 'Twitter account connected successfully',
      });
    } catch (error: any) {
      logger.error('Twitter OAuth callback error:', error);
      res.status(500).json({
        error: 'Failed to connect Twitter account',
        message: error.message,
      });
      return;
    }
  }

  async initiateTikTokOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/tiktok/callback`;
      
      const authUrl = this.oauthService.getTikTokAuthUrl(redirectUri, state);
      
      res.json({
        authUrl,
        state,
      });
    } catch (error) {
      next(error);
    }
  }

  async handleTikTokCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code missing' });
        return;
      }

      const tokens = await this.oauthService.exchangeTikTokCode(
        code as string,
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/tiktok/callback`
      );

      const userInfo = await this.oauthService.getTikTokUserInfo(tokens.access_token);

      res.json({
        success: true,
        platform: 'tiktok',
        username: userInfo.username,
        userId: userInfo.id,
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        message: 'TikTok account connected successfully',
      });
    } catch (error: any) {
      logger.error('TikTok OAuth callback error:', error);
      res.status(500).json({
        error: 'Failed to connect TikTok account',
        message: error.message,
      });
      return;
    }
  }

  async initiateFacebookOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/facebook/callback`;
      
      const authUrl = this.oauthService.getFacebookAuthUrl(redirectUri, state);
      
      res.json({
        authUrl,
        state,
      });
    } catch (error) {
      next(error);
    }
  }

  async handleFacebookCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code missing' });
        return;
      }

      const tokens = await this.oauthService.exchangeFacebookCode(
        code as string,
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/facebook/callback`
      );

      const userInfo = await this.oauthService.getFacebookUserInfo(tokens.access_token);

      res.json({
        success: true,
        platform: 'facebook',
        username: userInfo.username,
        userId: userInfo.id,
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        message: 'Facebook account connected successfully',
      });
    } catch (error: any) {
      logger.error('Facebook OAuth callback error:', error);
      res.status(500).json({
        error: 'Failed to connect Facebook account',
        message: error.message,
      });
      return;
    }
  }

  async initiateYouTubeOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/youtube/callback`;
      
      const authUrl = this.oauthService.getYouTubeAuthUrl(redirectUri, state);
      
      res.json({
        authUrl,
        state,
      });
    } catch (error) {
      next(error);
    }
  }

  async handleYouTubeCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code missing' });
        return;
      }

      const tokens = await this.oauthService.exchangeYouTubeCode(
        code as string,
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/youtube/callback`
      );

      const userInfo = await this.oauthService.getYouTubeUserInfo(tokens.access_token);

      res.json({
        success: true,
        platform: 'youtube',
        username: userInfo.username,
        userId: userInfo.id,
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        message: 'YouTube account connected successfully',
      });
    } catch (error: any) {
      logger.error('YouTube OAuth callback error:', error);
      res.status(500).json({
        error: 'Failed to connect YouTube account',
        message: error.message,
      });
      return;
    }
  }

  async connectAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform } = req.params;
      const { accessToken, userId, username } = req.body;

      // Store the connection
      // In production, associate with logged-in user
      const result = await this.oauthService.connectAccount(platform, {
        accessToken,
        userId,
        username,
      });

      res.json({
        success: true,
        message: `${platform} account connected`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getConnectedAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      // In production, get accounts for logged-in user
      const accounts = await this.oauthService.getConnectedAccounts();
      res.json({ accounts });
    } catch (error) {
      next(error);
    }
  }

  async disconnectAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform } = req.params;
      await this.oauthService.disconnectAccount(platform);
      res.json({ success: true, message: `${platform} account disconnected` });
    } catch (error) {
      next(error);
    }
  }
}

