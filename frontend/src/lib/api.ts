/**
 * API Client for Social Profiler Backend
 * Centralized API calls with error handling and authentication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'brand';
  isVerified: boolean;
  influencerId?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  budget?: number;
  budgetCurrency?: string;
  budgetUsd?: number;
  formattedBudget?: string;
  displayBudget?: number;
  formattedDisplayBudget?: string;
  targetCountries?: string[];
  isGlobal?: boolean;
  startDate?: string;
  endDate?: string;
  influencers?: CampaignInfluencer[];
  createdAt: string;
  updatedAt: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  isActive: boolean;
  isPayoutSupported: boolean;
  isPaymentSupported: boolean;
  minPayoutAmount: number;
  minCampaignAmount: number;
}

export interface Country {
  code: string;
  name: string;
  defaultCurrency: string;
  region: string;
  flagEmoji: string;
  isCreatorAvailable: boolean;
  isBrandAvailable: boolean;
}

export interface Wallet {
  id: string;
  userId: string;
  currencyCode: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  formattedAvailable?: string;
  formattedPending?: string;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'fee' | 'refund' | 'bonus';
  amount: number;
  currencyCode: string;
  formattedAmount?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

export interface CampaignInfluencer {
  id: string;
  influencerId: string;
  influencerName?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  paymentAmount?: number;
  paymentStatus?: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
    // Try to get token from localStorage on init (client-side only)
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && this.accessToken) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
        // Refresh failed, clear tokens
        this.logout();
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw {
          error: errorData.error || 'Request failed',
          message: errorData.message,
          code: errorData.code,
          status: response.status,
          details: errorData.details,
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

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refreshToken') 
      : null;
    
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/users/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          this.accessToken = data.data.accessToken;
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', data.data.accessToken);
            localStorage.setItem('refreshToken', data.data.refreshToken);
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to refresh token:', e);
    }
    return false;
  }

  // ==================== Auth endpoints ====================
  
  async register(data: { email: string; password: string; name: string; role?: 'user' | 'brand' }) {
    const response = await this.request<AuthResponse>('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) {
      this.setAccessToken(response.data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<AuthResponse>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.data) {
      this.setAccessToken(response.data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response;
  }

  async logout() {
    try {
      await this.request('/api/users/logout', { method: 'POST' });
    } catch (e) {
      // Ignore errors on logout
    }
    this.setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
    }
  }

  async getProfile() {
    return this.request<{ success: boolean; data: { user: User } }>('/api/users/me');
  }

  async updateProfile(data: { name?: string; email?: string }) {
    return this.request<{ success: boolean; data: { user: User } }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean }>('/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ success: boolean }>('/api/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ success: boolean }>('/api/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // ==================== Influencer endpoints ====================
  
  async searchInfluencers(filters: {
    query?: string;
    platform?: string;
    minFollowers?: number;
    maxFollowers?: number;
    niche?: string;
    location?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });

    return this.request<{ influencers: any[]; count: number; page: number; totalPages: number }>(
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
    email?: string;
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

  async updateInfluencer(id: string, data: { name?: string; email?: string; categories?: string[] }) {
    return this.request<any>(`/api/influencers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInfluencer(id: string) {
    return this.request<{ success: boolean }>(`/api/influencers/${id}`, {
      method: 'DELETE',
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

  // ==================== Campaign endpoints ====================

  async getCampaigns(options?: { page?: number; limit?: number; status?: string; displayCurrency?: string }) {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.status) params.append('status', options.status);
    if (options?.displayCurrency) params.append('displayCurrency', options.displayCurrency);

    return this.request<{ 
      success: boolean; 
      data: { campaigns: Campaign[]; total: number; page: number; totalPages: number; displayCurrency?: string } 
    }>(`/api/campaigns?${params.toString()}`);
  }

  async getCampaign(id: string, displayCurrency?: string) {
    const params = new URLSearchParams();
    if (displayCurrency) params.append('displayCurrency', displayCurrency);
    return this.request<{ success: boolean; data: Campaign }>(`/api/campaigns/${id}?${params.toString()}`);
  }

  async createCampaign(data: {
    name: string;
    description?: string;
    budget?: number;
    budgetCurrency?: string;
    targetCountries?: string[];
    startDate?: string;
    endDate?: string;
    companyId?: string;
    isGlobal?: boolean;
  }) {
    return this.request<{ success: boolean; data: Campaign }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: Partial<Campaign>) {
    return this.request<{ success: boolean; data: Campaign }>(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string) {
    return this.request<{ success: boolean }>(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  async addInfluencerToCampaign(campaignId: string, influencerId: string, paymentAmount?: number) {
    return this.request<{ success: boolean }>(`/api/campaigns/${campaignId}/influencers`, {
      method: 'POST',
      body: JSON.stringify({ influencerId, paymentAmount }),
    });
  }

  async removeInfluencerFromCampaign(campaignId: string, influencerId: string) {
    return this.request<{ success: boolean }>(`/api/campaigns/${campaignId}/influencers/${influencerId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Currency endpoints ====================

  async getCurrencies() {
    return this.request<{ success: boolean; data: { currencies: Currency[] } }>('/api/currencies');
  }

  async getCountries() {
    return this.request<{ success: boolean; data: { countries: Country[] } }>('/api/countries');
  }

  async getCreatorCountries() {
    return this.request<{ success: boolean; data: { countries: Country[] } }>('/api/countries?type=creators');
  }

  async getBrandCountries() {
    return this.request<{ success: boolean; data: { countries: Country[] } }>('/api/countries?type=brands');
  }

  async getExchangeRates() {
    return this.request<{ success: boolean; data: { rates: any[]; baseCurrency: string } }>('/api/exchange-rates');
  }

  async convertCurrency(amount: number, from: string, to: string) {
    return this.request<{ 
      success: boolean; 
      data: { 
        originalAmount: number;
        originalCurrency: string;
        convertedAmount: number;
        targetCurrency: string;
        exchangeRate: number;
        formattedOriginal: string;
        formattedConverted: string;
      } 
    }>(`/api/exchange-rates/convert?amount=${amount}&from=${from}&to=${to}`);
  }

  // ==================== Wallet endpoints ====================

  async getWallet(currencyCode?: string) {
    const params = new URLSearchParams();
    if (currencyCode) params.append('currency', currencyCode);
    return this.request<{ success: boolean; data: { wallet: Wallet } }>(`/api/wallet?${params.toString()}`);
  }

  async getWallets() {
    return this.request<{ success: boolean; data: { wallets: Wallet[] } }>('/api/wallet/all');
  }

  async getTransactions(options?: { page?: number; limit?: number; type?: string }) {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.type) params.append('type', options.type);

    return this.request<{ 
      success: boolean; 
      data: { transactions: Transaction[]; total: number; page: number; totalPages: number } 
    }>(`/api/wallet/transactions?${params.toString()}`);
  }

  async requestPayout(data: { amount: number; currencyCode: string; paymentMethod: string; paymentDetails: any }) {
    return this.request<{ success: boolean; data: { payoutRequest: any } }>('/api/wallet/payout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayoutHistory() {
    return this.request<{ success: boolean; data: { payouts: any[] } }>('/api/wallet/payouts');
  }

  // ==================== Analytics endpoints ====================
  
  async getCategoryStats() {
    return this.request<any>('/api/analytics/categories');
  }

  async getPlatformStats() {
    return this.request<any>('/api/analytics/platforms');
  }

  async getTrends() {
    return this.request<any>('/api/analytics/trends');
  }

  async getDashboardStats() {
    return this.request<{
      totalInfluencers: number;
      totalCampaigns: number;
      totalFollowers: number;
      avgEngagement: number;
      recentActivity: any[];
      topCategories: string[];
      platformBreakdown: Record<string, number>;
    }>('/api/analytics/dashboard');
  }

  // ==================== Admin endpoints ====================
  
  async getAPIMode() {
    return this.request<{ mode: string; config: any }>('/api/admin/api-mode');
  }

  async setAPIMode(mode: 'minimal' | 'medium' | 'live') {
    return this.request<{ message: string; mode: string }>('/api/admin/api-mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async getUsers(options?: { page?: number; limit?: number; role?: string }) {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.role) params.append('role', options.role);

    return this.request<{ 
      success: boolean; 
      data: { users: User[]; total: number; page: number; totalPages: number } 
    }>(`/api/users?${params.toString()}`);
  }

  // ==================== Utility methods ====================

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  storeUser(user: User) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
}

export const api = new ApiClient();
