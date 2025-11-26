import { z } from 'zod';

// ==================== User Schemas ====================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  role: z.enum(['user', 'brand']).optional().default('user'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ==================== Influencer Schemas ====================

export const platformSchema = z.enum(['instagram', 'tiktok', 'twitter', 'facebook', 'youtube', 'linkedin']);

export const socialAccountSchema = z.object({
  platform: platformSchema,
  username: z.string().min(1, 'Username is required').max(100, 'Username too long'),
  platformId: z.string().optional(),
  followerCount: z.number().int().nonnegative().optional(),
  followingCount: z.number().int().nonnegative().optional(),
  postCount: z.number().int().nonnegative().optional(),
  engagementRate: z.number().min(0).max(100).optional(),
  verified: z.boolean().optional(),
  profileUrl: z.string().url().optional(),
});

export const createInfluencerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long'),
  email: z.string().email('Invalid email address').optional(),
  socialAccounts: z.array(socialAccountSchema).min(0).max(10, 'Maximum 10 social accounts'),
});

export const updateInfluencerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long').optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  categories: z.array(z.string()).optional(),
});

export const searchInfluencersSchema = z.object({
  query: z.string().optional(),
  platform: platformSchema.optional(),
  category: z.string().optional(),
  minFollowers: z.coerce.number().int().nonnegative().optional(),
  maxFollowers: z.coerce.number().int().positive().optional(),
  minEngagement: z.coerce.number().min(0).max(100).optional(),
  verified: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['name', 'followers', 'engagement', 'createdAt']).optional().default('followers'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==================== Campaign Schemas ====================

export const campaignStatusSchema = z.enum(['draft', 'active', 'completed', 'cancelled']);

export const createCampaignSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  budget: z.number().positive('Budget must be positive').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'End date must be after start date' }
);

export const updateCampaignSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  status: campaignStatusSchema.optional(),
  budget: z.number().positive('Budget must be positive').optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export const addInfluencerToCampaignSchema = z.object({
  influencerId: z.string().uuid('Invalid influencer ID'),
  paymentAmount: z.number().positive('Payment must be positive').optional(),
});

// ==================== Pagination Schema ====================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ==================== ID Param Schema ====================

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// ==================== Type Exports ====================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateInfluencerInput = z.infer<typeof createInfluencerSchema>;
export type UpdateInfluencerInput = z.infer<typeof updateInfluencerSchema>;
export type SearchInfluencersInput = z.infer<typeof searchInfluencersSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type AddInfluencerToCampaignInput = z.infer<typeof addInfluencerToCampaignSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;





