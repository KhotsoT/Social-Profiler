# Influencer Categories - Explained

## What Are Categories?

Categories are **auto-generated tags** that help classify and search influencers. They're created automatically when an influencer is added or updated.

## Current Categories

Based on your profile showing: `nano`, `stable`, `low`, `twitter`, `organic`, `rising-star`

### 1. **Follower Tier** (`nano`)
- **nano**: 0 - 10,000 followers
- **micro**: 10,000 - 100,000 followers
- **macro**: 100,000 - 1,000,000 followers
- **mega**: 1,000,000 - 10,000,000 followers
- **celebrity**: 10,000,000+ followers

### 2. **Growth Rate** (`stable`)
- **stable**: Steady growth
- **rising**: Rapid growth (would show if detected)
- **declining**: Losing followers (would show if detected)

### 3. **Engagement** (`low`)
- **low**: < 2% engagement rate
- **medium-engagement**: 2% - 5% engagement
- **high-engagement**: > 5% engagement

### 4. **Platform** (`twitter`)
- **twitter**: Has Twitter account
- **instagram**: Has Instagram account
- **youtube**: Has YouTube account
- etc.

### 5. **Authenticity** (`organic`)
- **organic**: Natural growth pattern
- **verified**: Has verified badge
- **suspicious**: Potential fake followers (high followers, low engagement)

### 6. **Special** (`rising-star`)
- **rising-star**: New/rapidly growing influencer
- **cross-platform**: Active on multiple platforms

## Are They Active?

**Yes!** Categories are used for:
- ✅ **Search/Filtering**: You can filter by niche/category
- ✅ **Discovery**: Find influencers by category
- ✅ **Analytics**: Category-based statistics

## How to Use Them

**In Search:**
```
GET /api/influencers/search?niche=nano
GET /api/influencers/search?niche=twitter
```

**In Frontend:**
- Filter by category
- Display category badges
- Category-based recommendations

## Refinements Made

1. **Simplified names**: `tier-nano` → `nano`, `platform-twitter` → `twitter`
2. **Cleaner tags**: Removed redundant prefixes
3. **Better logic**: Improved categorization accuracy

## Next Steps

Categories will automatically update when:
- Follower count changes significantly
- New platforms are added
- Engagement rate changes
- Account is verified

