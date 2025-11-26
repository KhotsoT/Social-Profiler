import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { userRepository, User, CreateUserInput, UpdateUserInput } from '../repositories/userRepository';
import { generateAccessToken, generateRefreshToken, verifyToken, JwtPayload } from '../middleware/auth';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'brand';
  isVerified: boolean;
  influencerId?: string | null;
  createdAt: Date;
}

class UserService {
  /**
   * Register a new user
   */
  async register(input: {
    email: string;
    password: string;
    name: string;
    role?: 'user' | 'brand';
  }): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    // Create user
    const user = await userRepository.create({
      email: input.email,
      password_hash: passwordHash,
      name: input.name,
      role: input.role || 'user',
      verification_token: verificationToken,
      verification_expires: verificationExpires,
    });

    // Generate tokens
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      influencerId: user.influencer_id || undefined,
    };

    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    // Store refresh token
    await userRepository.update(user.id, { refresh_token: refreshToken });

    // TODO: Send verification email
    logger.info('User registered', { userId: user.id, email: user.email });

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      influencerId: user.influencer_id || undefined,
    };

    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    // Update user
    await userRepository.update(user.id, {
      refresh_token: refreshToken,
      last_login_at: new Date(),
    });

    logger.info('User logged in', { userId: user.id });

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await userRepository.findByRefreshToken(refreshToken);
    if (!user) {
      throw new Error('Invalid refresh token');
    }

    // Verify the refresh token is still valid
    const payload = verifyToken(refreshToken);
    if (!payload || payload.userId !== user.id) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      influencerId: user.influencer_id || undefined,
    };

    const newAccessToken = generateAccessToken(jwtPayload);
    const newRefreshToken = generateRefreshToken(jwtPayload);

    // Update refresh token
    await userRepository.update(user.id, { refresh_token: newRefreshToken });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    await userRepository.update(userId, { refresh_token: null });
    logger.info('User logged out', { userId });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<PublicUser> {
    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    const updatedUser = await userRepository.update(user.id, {
      is_verified: true,
      verification_token: null,
      verification_expires: null,
    });

    logger.info('Email verified', { userId: user.id });

    return this.toPublicUser(updatedUser!);
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    await userRepository.update(user.id, {
      reset_password_token: resetToken,
      reset_password_expires: resetExpires,
    });

    // TODO: Send password reset email
    logger.info('Password reset requested', { userId: user.id });
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await userRepository.findByResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await userRepository.update(user.id, {
      password_hash: passwordHash,
      reset_password_token: null,
      reset_password_expires: null,
      refresh_token: null, // Invalidate all sessions
    });

    logger.info('Password reset completed', { userId: user.id });
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await userRepository.update(userId, {
      password_hash: passwordHash,
      refresh_token: null, // Invalidate all sessions
    });

    logger.info('Password changed', { userId });
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, input: { name?: string; email?: string }): Promise<PublicUser> {
    if (input.email) {
      const existingUser = await userRepository.findByEmail(input.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already in use');
      }
    }

    const user = await userRepository.update(userId, input);
    if (!user) {
      throw new Error('User not found');
    }

    return this.toPublicUser(user);
  }

  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<PublicUser | null> {
    const user = await userRepository.findById(userId);
    return user ? this.toPublicUser(user) : null;
  }

  /**
   * Get all users (admin)
   */
  async getAll(options: { page?: number; limit?: number; role?: string }): Promise<{
    users: PublicUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { users, total } = await userRepository.findAll(options);
    const page = options.page || 1;
    const limit = options.limit || 20;

    return {
      users: users.map(this.toPublicUser),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Link user to influencer account
   */
  async linkInfluencer(userId: string, influencerId: string): Promise<PublicUser> {
    const user = await userRepository.update(userId, { influencer_id: influencerId });
    if (!user) {
      throw new Error('User not found');
    }

    logger.info('User linked to influencer', { userId, influencerId });
    return this.toPublicUser(user);
  }

  /**
   * Convert user to public user (hide sensitive fields)
   */
  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.is_verified,
      influencerId: user.influencer_id,
      createdAt: user.created_at,
    };
  }
}

export const userService = new UserService();

