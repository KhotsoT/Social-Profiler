import {
  registerSchema,
  loginSchema,
  createInfluencerSchema,
  createCampaignSchema,
  searchInfluencersSchema,
} from '../../src/schemas/validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123',
        name: 'Test User',
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('email');
      }
    });

    it('should reject weak password - too short', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass1',
        name: 'Test User',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password',
        name: 'Test User',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject short name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: 'A',
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password',
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('createInfluencerSchema', () => {
    it('should validate valid influencer data', () => {
      const result = createInfluencerSchema.safeParse({
        name: 'Test Influencer',
        email: 'influencer@example.com',
        socialAccounts: [
          {
            platform: 'instagram',
            username: 'testuser',
          },
        ],
      });
      
      expect(result.success).toBe(true);
    });

    it('should validate influencer without social accounts', () => {
      const result = createInfluencerSchema.safeParse({
        name: 'Test Influencer',
        socialAccounts: [],
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform', () => {
      const result = createInfluencerSchema.safeParse({
        name: 'Test Influencer',
        socialAccounts: [
          {
            platform: 'invalid_platform',
            username: 'testuser',
          },
        ],
      });
      
      expect(result.success).toBe(false);
    });

    it('should accept all valid platforms', () => {
      const platforms = ['instagram', 'tiktok', 'twitter', 'facebook', 'youtube', 'linkedin'];
      
      platforms.forEach(platform => {
        const result = createInfluencerSchema.safeParse({
          name: 'Test Influencer',
          socialAccounts: [{ platform, username: 'testuser' }],
        });
        
        expect(result.success).toBe(true);
      });
    });
  });

  describe('createCampaignSchema', () => {
    it('should validate valid campaign data', () => {
      const result = createCampaignSchema.safeParse({
        name: 'Summer Campaign',
        description: 'A great campaign',
        budget: 5000,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-02-01T00:00:00Z',
      });
      
      expect(result.success).toBe(true);
    });

    it('should validate campaign with only name', () => {
      const result = createCampaignSchema.safeParse({
        name: 'Simple Campaign',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject if end date before start date', () => {
      const result = createCampaignSchema.safeParse({
        name: 'Campaign',
        startDate: '2025-02-01T00:00:00Z',
        endDate: '2025-01-01T00:00:00Z',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject negative budget', () => {
      const result = createCampaignSchema.safeParse({
        name: 'Campaign',
        budget: -100,
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('searchInfluencersSchema', () => {
    it('should validate empty search (defaults applied)', () => {
      const result = searchInfluencersSchema.safeParse({});
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('followers');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should coerce string numbers', () => {
      const result = searchInfluencersSchema.safeParse({
        page: '2',
        limit: '50',
        minFollowers: '1000',
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(result.data.minFollowers).toBe(1000);
      }
    });

    it('should reject limit over 100', () => {
      const result = searchInfluencersSchema.safeParse({
        limit: 200,
      });
      
      expect(result.success).toBe(false);
    });

    it('should validate platform filter', () => {
      const result = searchInfluencersSchema.safeParse({
        platform: 'instagram',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform', () => {
      const result = searchInfluencersSchema.safeParse({
        platform: 'myspace',
      });
      
      expect(result.success).toBe(false);
    });
  });
});





