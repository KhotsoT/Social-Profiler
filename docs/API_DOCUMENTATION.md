# API Documentation: Social Profiler

Base URL: `https://api.socialprofiler.com/v1` (or `http://localhost:3001/api` for development)

## Authentication

Most endpoints require authentication. Include your API key in the request header:

```
Authorization: Bearer YOUR_API_KEY
```

---

## Influencers

### Search Influencers

Search for influencers based on various criteria.

**Endpoint:** `GET /influencers/search`

**Query Parameters:**
- `query` (string, optional): Search by name or username
- `platform` (string, optional): Filter by platform (instagram, tiktok, twitter, facebook, youtube, linkedin)
- `minFollowers` (number, optional): Minimum follower count
- `maxFollowers` (number, optional): Maximum follower count
- `niche` (string, optional): Filter by niche/industry
- `location` (string, optional): Filter by location

**Example Request:**
```bash
GET /api/influencers/search?query=tech&platform=instagram&minFollowers=10000&maxFollowers=100000
```

**Example Response:**
```json
{
  "influencers": [
    {
      "id": "inf_123",
      "name": "John Doe",
      "socialAccounts": [
        {
          "platform": "instagram",
          "username": "johndoe",
          "followerCount": 50000,
          "engagementRate": 4.5,
          "verified": true
        }
      ],
      "trueFollowerCount": 50000,
      "categories": ["tier-micro", "engagement-high", "platform-instagram"]
    }
  ],
  "count": 1
}
```

---

### Discover Influencers

Discover influencers by category or get top influencers.

**Endpoint:** `GET /influencers/discover`

**Query Parameters:**
- `category` (string, optional): Filter by category
- `limit` (number, optional, default: 50): Number of results

**Example Request:**
```bash
GET /api/influencers/discover?category=rising-star&limit=20
```

---

### Get Influencer by ID

Get detailed information about a specific influencer.

**Endpoint:** `GET /influencers/:id`

**Example Response:**
```json
{
  "id": "inf_123",
  "name": "John Doe",
  "email": "john@example.com",
  "socialAccounts": [
    {
      "platform": "instagram",
      "username": "johndoe",
      "platformId": "123456",
      "followerCount": 50000,
      "followingCount": 2000,
      "postCount": 500,
      "engagementRate": 4.5,
      "verified": true,
      "profileUrl": "https://instagram.com/johndoe",
      "lastSyncedAt": "2024-01-15T10:00:00Z"
    },
    {
      "platform": "twitter",
      "username": "johndoe",
      "followerCount": 30000,
      "engagementRate": 3.2,
      "verified": false
    }
  ],
  "trueFollowerCount": 65000,
  "categories": ["tier-micro", "engagement-high", "cross-platform"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

### Get True Followers

Get true follower count with deduplication details.

**Endpoint:** `GET /influencers/:id/true-followers`

**Example Response:**
```json
{
  "trueFollowerCount": 65000,
  "totalFollowerCount": 80000,
  "deduplicationRate": "18.75%"
}
```

---

### Get Influencer Analytics

Get analytics for a specific influencer.

**Endpoint:** `GET /influencers/:id/analytics`

**Example Response:**
```json
{
  "totalFollowers": 80000,
  "trueFollowers": 65000,
  "platforms": 2,
  "averageEngagementRate": 3.85,
  "growthTrend": {
    "period": "30d",
    "growthRate": 5.2,
    "trend": "rising"
  },
  "categories": ["tier-micro", "engagement-high", "cross-platform"]
}
```

---

### Get Influencer Categories

Get all categories for an influencer.

**Endpoint:** `GET /influencers/:id/categories`

**Example Response:**
```json
{
  "categories": [
    "tier-micro",
    "engagement-high",
    "platform-instagram",
    "platform-twitter",
    "cross-platform",
    "rising-star"
  ]
}
```

---

### Get Influencers by Category

Get all influencers in a specific category.

**Endpoint:** `GET /influencers/category/:category`

**Query Parameters:**
- `limit` (number, optional, default: 50)
- `offset` (number, optional, default: 0)

**Example Request:**
```bash
GET /api/influencers/category/rising-star?limit=20&offset=0
```

---

### Create Influencer

Create a new influencer profile.

**Endpoint:** `POST /influencers`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "socialAccounts": [
    {
      "platform": "instagram",
      "username": "janesmith",
      "platformId": "789012"
    }
  ]
}
```

**Example Response:**
```json
{
  "id": "inf_456",
  "name": "Jane Smith",
  "socialAccounts": [
    {
      "platform": "instagram",
      "username": "janesmith",
      "followerCount": 75000,
      "engagementRate": 5.2,
      "verified": true,
      "lastSyncedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "trueFollowerCount": 75000,
  "categories": ["tier-micro", "engagement-high"],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

### Update Influencer

Update an existing influencer.

**Endpoint:** `PUT /influencers/:id`

**Request Body:** (same as create, all fields optional)

---

### Delete Influencer

Delete an influencer profile.

**Endpoint:** `DELETE /influencers/:id`

**Response:** `204 No Content`

---

## Analytics

### Get Trends

Get trending categories and statistics.

**Endpoint:** `GET /analytics/trends`

**Example Response:**
```json
{
  "trends": [
    {
      "category": "rising-star",
      "count": 150,
      "growth": 25
    },
    {
      "category": "tier-micro",
      "count": 500,
      "growth": 10
    }
  ]
}
```

---

### Get Category Statistics

Get statistics by category.

**Endpoint:** `GET /analytics/categories`

**Example Response:**
```json
{
  "categories": {
    "tier-nano": 1000,
    "tier-micro": 500,
    "tier-macro": 200,
    "tier-mega": 50,
    "tier-celebrity": 10
  }
}
```

---

### Get Platform Statistics

Get statistics by platform.

**Endpoint:** `GET /analytics/platforms`

**Example Response:**
```json
{
  "platforms": {
    "instagram": 800,
    "tiktok": 600,
    "twitter": 400,
    "youtube": 300,
    "facebook": 200,
    "linkedin": 100
  }
}
```

---

## Campaigns

### List Campaigns

Get all campaigns.

**Endpoint:** `GET /campaigns`

---

### Get Campaign

Get a specific campaign.

**Endpoint:** `GET /campaigns/:id`

---

### Create Campaign

Create a new campaign.

**Endpoint:** `POST /campaigns`

**Request Body:**
```json
{
  "name": "Summer Product Launch",
  "description": "Promote new summer collection",
  "budget": 10000,
  "startDate": "2024-06-01",
  "endDate": "2024-08-31"
}
```

---

### Update Campaign

Update a campaign.

**Endpoint:** `PUT /campaigns/:id`

---

### Delete Campaign

Delete a campaign.

**Endpoint:** `DELETE /campaigns/:id`

---

### Add Influencer to Campaign

Add an influencer to a campaign.

**Endpoint:** `POST /campaigns/:id/influencers`

**Request Body:**
```json
{
  "influencerId": "inf_123",
  "paymentAmount": 5000
}
```

---

## Health Check

### Health Status

Check API health status.

**Endpoint:** `GET /health`

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "service": "social-profiler-api"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API requests are rate-limited:
- Free tier: 100 requests/hour
- Professional: 1000 requests/hour
- Enterprise: Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642234567
```

---

## Webhooks

(Coming in Phase 3)

Webhooks will be available for:
- Influencer data updates
- Campaign status changes
- Payment events
- Analytics updates





