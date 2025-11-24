/**
 * API Client for Social Profiler Backend
 * Centralized API calls with error handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw {
          error: errorData.error || 'Request failed',
          message: errorData.message,
          status: response.status,
        } as ApiError;
      }

      return await response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'error' in error) {
        throw error;
      }
      throw {
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Failed to connect to server',
      } as ApiError;
    }
  }

  // Influencer endpoints
  async searchInfluencers(filters: {
    query?: string;
    platform?: string;
    minFollowers?: number;
    maxFollowers?: number;
    niche?: string;
    location?: string;
  }) {
    const params = new URLSearchParams();
    if (filters.query) params.append('query', filters.query);
    if (filters.platform) params.append('platform', filters.platform);
    if (filters.minFollowers) params.append('minFollowers', String(filters.minFollowers));
    if (filters.maxFollowers) params.append('maxFollowers', String(filters.maxFollowers));
    if (filters.niche) params.append('niche', filters.niche);
    if (filters.location) params.append('location', filters.location);

    return this.request<{ influencers: any[]; count: number }>(
      `/api/influencers/search?${params.toString()}`
    );
  }

  async discoverInfluencers(category?: string, limit: number = 50) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', String(limit));

    return this.request<{ influencers: any[]; count: number }>(
      `/api/influencers/discover?${params.toString()}`
    );
  }

  async getInfluencer(id: string) {
    return this.request<any>(`/api/influencers/${id}`);
  }

  async createInfluencer(data: {
    name: string;
    email: string;
    socialAccounts: Array<{
      platform: string;
      username: string;
      platformId?: string;
      followerCount?: number;
      followingCount?: number;
      postCount?: number;
      engagementRate?: number;
      verified?: boolean;
      profileUrl?: string;
    }>;
  }) {
    return this.request<any>('/api/influencers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncInfluencer(id: string) {
    return this.request<{ success: boolean; message: string; influencer: any }>(
      `/api/influencers/${id}/sync`,
      { method: 'POST' }
    );
  }

  async collectFollowers(id: string, force: boolean = false) {
    return this.request<{ success: boolean; message: string; collected: number; accounts: number }>(
      `/api/influencers/${id}/collect-followers?force=${force}`,
      { method: 'POST' }
    );
  }

  async getInfluencerAnalytics(id: string) {
    return this.request<any>(`/api/influencers/${id}/analytics`);
  }

  async getTrueFollowers(id: string) {
    return this.request<{
      trueFollowerCount: number;
      totalFollowerCount: number;
      deduplicationRate: string;
    }>(`/api/influencers/${id}/true-followers`);
  }

  // Analytics endpoints
  async getCategoryStats() {
    return this.request<any>('/api/analytics/categories');
  }

  async getPlatformStats() {
    return this.request<any>('/api/analytics/platforms');
  }

  async getTrends() {
    return this.request<any>('/api/analytics/trends');
  }

  // Admin endpoints
  async getAPIMode() {
    return this.request<{ mode: string; config: any }>('/api/admin/api-mode');
  }

  async setAPIMode(mode: 'minimal' | 'medium' | 'live') {
    return this.request<{ message: string; mode: string }>('/api/admin/api-mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }
}

export const api = new ApiClient();

