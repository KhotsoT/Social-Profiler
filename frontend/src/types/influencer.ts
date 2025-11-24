export interface Influencer {
  id: string;
  name: string;
  email?: string;
  socialAccounts: SocialAccount[];
  trueFollowerCount?: number;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialAccount {
  platform: 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'youtube' | 'linkedin';
  username: string;
  platformId: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  engagementRate: number;
  verified: boolean;
  profileUrl: string;
  lastSyncedAt: string;
}

export interface SearchFilters {
  query?: string;
  platform?: string;
  minFollowers?: number;
  maxFollowers?: number;
  niche?: string;
  location?: string;
}





