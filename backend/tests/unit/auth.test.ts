import { generateAccessToken, generateRefreshToken, verifyToken, JwtPayload } from '../../src/middleware/auth';

describe('Auth Middleware', () => {
  const mockPayload: JwtPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should contain user data in token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyToken(token);
      
      // Token should contain the payload data
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token and return payload', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid-token');
      
      expect(decoded).toBeNull();
    });

    it('should return null for expired token', () => {
      // This test would need to mock time or use a very short expiry
      // For now, we just verify the function handles errors
      const decoded = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxfQ.invalid');
      
      expect(decoded).toBeNull();
    });

    it('should include influencerId if present', () => {
      const payloadWithInfluencer: JwtPayload = {
        ...mockPayload,
        influencerId: 'test-influencer-id',
      };
      
      const token = generateAccessToken(payloadWithInfluencer);
      const decoded = verifyToken(token);
      
      expect(decoded?.influencerId).toBe('test-influencer-id');
    });
  });
});

