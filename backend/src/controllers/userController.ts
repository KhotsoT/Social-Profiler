import { Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class UserController {
  /**
   * Register a new user
   */
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name, role } = req.body;

      const result = await userService.register({
        email,
        password,
        name,
        role,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'Email already registered') {
        res.status(409).json({
          success: false,
          error: error.message,
          code: 'EMAIL_EXISTS',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await userService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        res.status(401).json({
          success: false,
          error: error.message,
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'MISSING_TOKEN',
        });
        return;
      }

      const tokens = await userService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error: any) {
      if (error.message === 'Invalid refresh token') {
        res.status(401).json({
          success: false,
          error: error.message,
          code: 'INVALID_TOKEN',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      await userService.logout(req.user.userId);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      const user = await userService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: { user },
      });
    } catch (error: any) {
      if (error.message === 'Invalid or expired verification token') {
        res.status(400).json({
          success: false,
          error: error.message,
          code: 'INVALID_TOKEN',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      await userService.forgotPassword(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account exists with that email, a reset link will be sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      await userService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      if (error.message === 'Invalid or expired reset token') {
        res.status(400).json({
          success: false,
          error: error.message,
          code: 'INVALID_TOKEN',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      await userService.changePassword(req.user.userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        res.status(400).json({
          success: false,
          error: error.message,
          code: 'INVALID_PASSWORD',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const user = await userService.getById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { name, email } = req.body;

      const user = await userService.updateProfile(req.user.userId, { name, email });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error: any) {
      if (error.message === 'Email already in use') {
        res.status(409).json({
          success: false,
          error: error.message,
          code: 'EMAIL_EXISTS',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, role } = req.query;

      const result = await userService.getAll({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        role: role as string | undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link user to influencer account
   */
  async linkInfluencer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { influencerId } = req.body;

      const user = await userService.linkInfluencer(req.user.userId, influencerId);

      res.json({
        success: true,
        message: 'Linked to influencer account',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();





