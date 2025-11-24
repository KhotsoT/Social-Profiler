import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface UserInfo {
  id: string;
  username: string;
  name?: string;
  email?: string;
}

export class OAuthService {
  /**
   * Instagram OAuth
   */
  getInstagramAuthUrl(redirectUri: string, state: string): string {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    if (!clientId) {
      throw new Error('Instagram Client ID not configured');
    }

    const scopes = [
      'user_profile',
      'user_media',
      'instagram_basic',
      'pages_read_engagement', // For follower counts
    ].join(',');

    return `https://api.instagram.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scopes}&` +
      `response_type=code&` +
      `state=${state}`;
  }

  async exchangeInstagramCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Instagram OAuth credentials not configured');
    }

    try {
      const response = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      });

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('Instagram token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Instagram authorization code');
    }
  }

  async getInstagramUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      // Instagram Graph API endpoint
      const response = await axios.get('https://graph.instagram.com/me', {
        params: {
          fields: 'id,username',
          access_token: accessToken,
        },
      });

      return {
        id: response.data.id,
        username: response.data.username,
      };
    } catch (error: any) {
      logger.error('Instagram user info error:', error.response?.data || error.message);
      throw new Error('Failed to get Instagram user info');
    }
  }

  /**
   * Twitter OAuth 2.0
   */
  getTwitterAuthUrl(redirectUri: string, state: string): { authUrl: string; codeVerifier: string } {
    const clientId = process.env.TWITTER_CLIENT_ID;
    if (!clientId) {
      throw new Error('Twitter Client ID not configured');
    }

    // Twitter OAuth 2.0 requires specific scopes
    // Using minimal scopes that should work without app review
    const scopes = [
      'tweet.read',
      'users.read',
      'offline.access',
    ].join(' ');

    // Generate proper PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;

    return { authUrl, codeVerifier };
  }

  async exchangeTwitterCode(code: string, redirectUri: string, codeVerifier: string): Promise<OAuthTokens> {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Twitter OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier, // Must match the code_challenge from auth URL
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
      };
    } catch (error: any) {
      logger.error('Twitter token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Twitter authorization code');
    }
  }

  async getTwitterUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      const response = await axios.get('https://api.twitter.com/2/users/me', {
        params: {
          'user.fields': 'username,id',
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.data.id,
        username: response.data.data.username,
      };
    } catch (error: any) {
      logger.error('Twitter user info error:', error.response?.data || error.message);
      throw new Error('Failed to get Twitter user info');
    }
  }

  /**
   * TikTok OAuth
   */
  getTikTokAuthUrl(redirectUri: string, state: string): string {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      throw new Error('TikTok Client Key not configured');
    }

    const scopes = [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
    ].join(',');

    return `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}&` +
      `scope=${scopes}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;
  }

  async exchangeTikTokCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
      throw new Error('TikTok OAuth credentials not configured');
    }

    try {
      const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      return {
        access_token: response.data.data.access_token,
        refresh_token: response.data.data.refresh_token,
        expires_in: response.data.data.expires_in,
      };
    } catch (error: any) {
      logger.error('TikTok token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange TikTok authorization code');
    }
  }

  async getTikTokUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      const response = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        params: {
          fields: 'open_id,union_id,avatar_url,display_name',
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.data.user.open_id,
        username: response.data.data.user.display_name,
      };
    } catch (error: any) {
      logger.error('TikTok user info error:', error.response?.data || error.message);
      throw new Error('Failed to get TikTok user info');
    }
  }

  /**
   * Facebook OAuth
   */
  getFacebookAuthUrl(redirectUri: string, state: string): string {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) {
      throw new Error('Facebook App ID not configured');
    }

    const scopes = [
      'public_profile',
      'email',
      'pages_read_engagement',
      'instagram_basic',
    ].join(',');

    return `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scopes}&` +
      `state=${state}&` +
      `response_type=code`;
  }

  async exchangeFacebookCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('Facebook OAuth credentials not configured');
    }

    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('Facebook token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Facebook authorization code');
    }
  }

  async getFacebookUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          fields: 'id,name,email',
          access_token: accessToken,
        },
      });

      return {
        id: response.data.id,
        username: response.data.name,
        email: response.data.email,
      };
    } catch (error: any) {
      logger.error('Facebook user info error:', error.response?.data || error.message);
      throw new Error('Failed to get Facebook user info');
    }
  }

  /**
   * YouTube OAuth
   */
  getYouTubeAuthUrl(redirectUri: string, state: string): string {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    if (!clientId) {
      throw new Error('YouTube Client ID not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`;
  }

  async exchangeYouTubeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('YouTube OAuth credentials not configured');
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('YouTube token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange YouTube authorization code');
    }
  }

  async getYouTubeUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet',
          mine: 'true',
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const channel = response.data.items[0];
      return {
        id: channel.id,
        username: channel.snippet.title,
      };
    } catch (error: any) {
      logger.error('YouTube user info error:', error.response?.data || error.message);
      throw new Error('Failed to get YouTube user info');
    }
  }

  /**
   * Store connected account
   */
  async connectAccount(platform: string, data: { accessToken: string; userId: string; username: string }) {
    // In production, store in database associated with user
    logger.info(`Connected ${platform} account for user ${data.username}`);
    return {
      platform,
      userId: data.userId,
      username: data.username,
    };
  }

  /**
   * Get connected accounts
   */
  async getConnectedAccounts() {
    // In production, fetch from database for logged-in user
    return [];
  }

  /**
   * Disconnect account
   */
  async disconnectAccount(platform: string) {
    // In production, remove from database
    logger.info(`Disconnected ${platform} account`);
  }
}


