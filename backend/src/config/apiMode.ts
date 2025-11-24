/**
 * API Call Intensity Modes
 * Controls how aggressively we make API calls to social media platforms
 */

export enum APICallMode {
  MINIMAL = 'minimal',    // Only essential calls, maximum caching, longest refresh intervals
  MEDIUM = 'medium',      // Balanced approach, moderate caching, standard refresh
  LIVE = 'live'           // Full API access, minimal caching, frequent refreshes
}

export interface APIModeConfig {
  mode: APICallMode;
  // Refresh intervals in milliseconds
  accountSyncInterval: number;      // How often to check for account changes
  followerSyncInterval: number;      // How often to sync followers
  analyticsSyncInterval: number;    // How often to sync analytics
  // Caching behavior
  useCache: boolean;                 // Whether to use cached data
  cacheExpiry: number;               // Cache expiry in milliseconds
  // Change detection
  requireChangeForSync: boolean;     // Only sync if data has changed
  changeThreshold: number;            // Minimum change % to trigger sync
}

const MODE_CONFIGS: Record<APICallMode, APIModeConfig> = {
  [APICallMode.MINIMAL]: {
    mode: APICallMode.MINIMAL,
    accountSyncInterval: 24 * 60 * 60 * 1000,      // 24 hours
    followerSyncInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
    analyticsSyncInterval: 24 * 60 * 60 * 1000,     // 24 hours
    useCache: true,
    cacheExpiry: 24 * 60 * 60 * 1000,               // 24 hours
    requireChangeForSync: true,
    changeThreshold: 5.0,                           // 5% change required
  },
  [APICallMode.MEDIUM]: {
    mode: APICallMode.MEDIUM,
    accountSyncInterval: 6 * 60 * 60 * 1000,        // 6 hours
    followerSyncInterval: 24 * 60 * 60 * 1000,       // 24 hours
    analyticsSyncInterval: 6 * 60 * 60 * 1000,       // 6 hours
    useCache: true,
    cacheExpiry: 6 * 60 * 60 * 1000,                // 6 hours
    requireChangeForSync: true,
    changeThreshold: 2.0,                            // 2% change required
  },
  [APICallMode.LIVE]: {
    mode: APICallMode.LIVE,
    accountSyncInterval: 15 * 60 * 1000,            // 15 minutes
    followerSyncInterval: 60 * 60 * 1000,           // 1 hour
    analyticsSyncInterval: 15 * 60 * 1000,          // 15 minutes
    useCache: true,
    cacheExpiry: 15 * 60 * 1000,                    // 15 minutes
    requireChangeForSync: false,                     // Always sync in live mode
    changeThreshold: 0.0,                           // Any change triggers sync
  },
};

export function getAPIMode(): APICallMode {
  const mode = (process.env.API_CALL_MODE || 'minimal').toLowerCase();
  
  switch (mode) {
    case 'minimal':
      return APICallMode.MINIMAL;
    case 'medium':
      return APICallMode.MEDIUM;
    case 'live':
      return APICallMode.LIVE;
    default:
      return APICallMode.MINIMAL;
  }
}

export function getAPIModeConfig(): APIModeConfig {
  const mode = getAPIMode();
  return MODE_CONFIGS[mode];
}

export function shouldSyncAccount(lastSyncedAt: Date | null): boolean {
  const config = getAPIModeConfig();
  
  if (!lastSyncedAt) {
    return true; // Never synced, must sync
  }

  const timeSinceSync = Date.now() - lastSyncedAt.getTime();
  return timeSinceSync >= config.accountSyncInterval;
}

export function shouldSyncFollowers(lastSyncedAt: Date | null): boolean {
  const config = getAPIModeConfig();
  
  if (!lastSyncedAt) {
    return true; // Never synced, must sync
  }

  const timeSinceSync = Date.now() - lastSyncedAt.getTime();
  return timeSinceSync >= config.followerSyncInterval;
}





