# API Call Mode Configuration

## Overview

The Social Profiler platform includes a smart API call management system that prevents unnecessary API calls through intelligent caching and change detection. This system has three modes that control how aggressively the system makes API calls.

## Modes

### 1. **MINIMAL** (Default - Development/Testing)
- **Purpose**: Minimize API calls during development and testing
- **Account Sync**: Every 24 hours
- **Follower Sync**: Every 7 days
- **Analytics Sync**: Every 24 hours
- **Cache Expiry**: 24 hours
- **Change Detection**: Required (5% threshold)
- **Follower Collection**: Disabled by default (must use `force=true`)

**Use Case**: Development, testing, or when API quotas are limited

### 2. **MEDIUM** (Staging/Pre-Production)
- **Purpose**: Balanced approach for staging environments
- **Account Sync**: Every 6 hours
- **Follower Sync**: Every 24 hours
- **Analytics Sync**: Every 6 hours
- **Cache Expiry**: 6 hours
- **Change Detection**: Required (2% threshold)
- **Follower Collection**: Enabled on schedule

**Use Case**: Staging environments, pre-production testing

### 3. **LIVE** (Production)
- **Purpose**: Full API access for production
- **Account Sync**: Every 15 minutes
- **Follower Sync**: Every 1 hour
- **Analytics Sync**: Every 15 minutes
- **Cache Expiry**: 15 minutes
- **Change Detection**: Disabled (always sync)
- **Follower Collection**: Enabled on schedule

**Use Case**: Production environments with active monitoring

## Configuration

### Environment Variable

Set the mode using the `API_CALL_MODE` environment variable:

```bash
# Minimal mode (default)
API_CALL_MODE=minimal

# Medium mode
API_CALL_MODE=medium

# Live mode
API_CALL_MODE=live
```

### API Endpoints

#### Get Current Mode
```bash
GET /api/admin/api-mode
```

Response:
```json
{
  "mode": "minimal",
  "config": {
    "accountSyncInterval": "1440 minutes",
    "followerSyncInterval": "168 hours",
    "analyticsSyncInterval": "1440 minutes",
    "useCache": true,
    "cacheExpiry": "1440 minutes",
    "requireChangeForSync": true,
    "changeThreshold": "5%"
  }
}
```

#### Set Mode (Note: Requires environment variable change)
```bash
POST /api/admin/api-mode
{
  "mode": "medium"
}
```

#### Get Cache Statistics
```bash
GET /api/admin/cache-stats
```

Response:
```json
{
  "totalCached": 150,
  "expiredCaches": 12,
  "validCaches": 138
}
```

#### Clear Cache
```bash
# Clear all caches
POST /api/admin/clear-cache

# Clear specific account cache
POST /api/admin/clear-cache
{
  "platform": "twitter",
  "platformId": "123456"
}
```

## Smart Caching Features

### 1. Change Detection
The system only makes API calls when data has actually changed:

- **Minimal Mode**: Requires 5% change in followers/posts/engagement
- **Medium Mode**: Requires 2% change
- **Live Mode**: Always syncs (change detection disabled)

### 2. Time-Based Caching
Even if data hasn't changed, the system respects sync intervals:

- **Minimal**: 24 hours between account syncs
- **Medium**: 6 hours between account syncs
- **Live**: 15 minutes between account syncs

### 3. Automatic Fallback
If an API call fails, the system automatically uses cached data instead of returning errors.

### 4. Follower Collection Control
- **Minimal Mode**: Follower collection is disabled by default
- **Medium/Live Mode**: Follower collection runs on schedule
- **Force Override**: Use `?force=true` parameter to override mode restrictions

## Usage Examples

### Force Follower Collection (Override Mode)
```bash
POST /api/influencers/:id/collect-followers?force=true
```

### Check if Account Needs Sync
The system automatically checks:
1. Has enough time passed since last sync?
2. Is cached data still valid?
3. Has data changed significantly?

If all checks pass, it uses cached data instead of making an API call.

## Benefits

1. **Reduced API Costs**: Minimize unnecessary API calls
2. **Faster Response Times**: Use cached data when possible
3. **Rate Limit Protection**: Respect API rate limits automatically
4. **Smart Updates**: Only sync when data actually changes
5. **Flexible Control**: Switch modes based on environment needs

## Best Practices

1. **Development**: Use `minimal` mode to avoid API quota exhaustion
2. **Staging**: Use `medium` mode for realistic testing
3. **Production**: Use `live` mode for active monitoring
4. **Testing**: Use `force=true` when you need fresh data immediately
5. **Monitoring**: Check cache stats regularly to optimize settings

## Monitoring

Monitor API usage through:
- Cache statistics endpoint
- Application logs (shows when API calls are skipped)
- Database `last_synced_at` timestamps

## Troubleshooting

### API calls not happening
- Check current mode: `GET /api/admin/api-mode`
- Verify cache expiry hasn't been reached
- Check if change detection is blocking updates
- Use `force=true` to override

### Too many API calls
- Switch to `minimal` mode
- Increase change threshold
- Check cache expiry settings
- Review sync intervals

### Stale data
- Clear cache: `POST /api/admin/clear-cache`
- Force sync: Use `force=true` parameter
- Switch to `live` mode for more frequent updates





