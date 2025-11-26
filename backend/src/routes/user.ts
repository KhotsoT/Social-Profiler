import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authRateLimit } from '../middleware/rateLimit';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../schemas/validation';

export const userRoutes = Router();

// ==================== Public Routes ====================

// Register new user
userRoutes.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  userController.register.bind(userController)
);

// Login
userRoutes.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  userController.login.bind(userController)
);

// Refresh token
userRoutes.post(
  '/refresh-token',
  userController.refreshToken.bind(userController)
);

// Verify email
userRoutes.get(
  '/verify-email/:token',
  userController.verifyEmail.bind(userController)
);

// Forgot password
userRoutes.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  userController.forgotPassword.bind(userController)
);

// Reset password
userRoutes.post(
  '/reset-password',
  validate(resetPasswordSchema),
  userController.resetPassword.bind(userController)
);

// ==================== Protected Routes ====================

// Logout
userRoutes.post(
  '/logout',
  authenticate,
  userController.logout.bind(userController)
);

// Get current user profile
userRoutes.get(
  '/me',
  authenticate,
  userController.getProfile.bind(userController)
);

// Update current user profile
userRoutes.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile.bind(userController)
);

// Change password
userRoutes.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword.bind(userController)
);

// Link user to influencer account
userRoutes.post(
  '/link-influencer',
  authenticate,
  userController.linkInfluencer.bind(userController)
);

// ==================== Admin Routes ====================

// Get all users (admin only)
userRoutes.get(
  '/',
  authenticate,
  authorize('admin'),
  userController.getAllUsers.bind(userController)
);

