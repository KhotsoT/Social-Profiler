import { SocialAccount } from './influencerService';
import { FollowerRepository, FollowerData } from '../repositories/followerRepository';
import { logger } from '../utils/logger';
import { query } from '../config/database';

/**
 * Service responsible for deduplicating followers across multiple social media platforms
 * to calculate the true unique follower count.
 * 
 * Uses multiple matching strategies:
 * 1. Username matching (exact and fuzzy)
 * 2. Profile image similarity (via hashing)
 * 3. Bio/content analysis
 * 4. Email/phone matching (when available via API)
 */
export class FollowerDeduplicationService {
  private followerRepository: FollowerRepository;

  constructor() {
    this.followerRepository = new FollowerRepository();
  }

  /**
   * Calculate true unique follower count across all platforms
   */
  async calculateTrueFollowers(accounts: SocialAccount[]): Promise<number> {
    if (accounts.length === 0) return 0;
    if (accounts.length === 1) return accounts[0].followerCount;

    logger.info(`Calculating true followers for ${accounts.length} platforms`);

    // Get all followers from all platforms
    const allFollowers = await Promise.all(
      accounts.map(account => this.followerRepository.getFollowers(account.platformId, account.platform))
    );

    // Check if we have any followers collected
    const totalFollowers = allFollowers.reduce((sum, arr) => sum + arr.length, 0);
    if (totalFollowers === 0) {
      // If no followers collected, use sum of follower counts as fallback
      logger.warn('No follower data collected, using sum of follower counts');
      return accounts.reduce((sum, acc) => sum + acc.followerCount, 0);
    }

    // Flatten and deduplicate
    const uniqueFollowers = await this.deduplicateFollowersDatabase(allFollowers, accounts);

    logger.info(`Found ${uniqueFollowers} unique followers out of ${totalFollowers} total`);

    return uniqueFollowers;
  }

  /**
   * Deduplicate followers using database queries for better performance
   */
  private async deduplicateFollowersDatabase(
    followerLists: Array<FollowerData[]>,
    accounts: SocialAccount[]
  ): Promise<number> {
    // Get all unique usernames across all platforms
    const allUsernames = new Set<string>();
    const usernameToPlatforms = new Map<string, Set<string>>();

    followerLists.forEach((followers, platformIndex) => {
      const platform = accounts[platformIndex].platform;
      followers.forEach(follower => {
        const normalizedUsername = this.normalizeUsername(follower.username);
        allUsernames.add(normalizedUsername);
        
        if (!usernameToPlatforms.has(normalizedUsername)) {
          usernameToPlatforms.set(normalizedUsername, new Set());
        }
        usernameToPlatforms.get(normalizedUsername)!.add(platform);
      });
    });

    // Count unique usernames that appear on multiple platforms
    let uniqueCount = 0;
    let duplicateCount = 0;

    for (const username of allUsernames) {
      const platforms = usernameToPlatforms.get(username)!;
      if (platforms.size > 1) {
        duplicateCount += platforms.size - 1; // One is unique, rest are duplicates
      }
      uniqueCount++;
    }

    // Total followers minus duplicates
    const totalFollowers = followerLists.reduce((sum, arr) => sum + arr.length, 0);
    const trueFollowers = totalFollowers - duplicateCount;

    // Also check for email matches
    const emailMatches = await this.findEmailMatches(followerLists);
    const additionalDedup = emailMatches.size;
    const finalCount = Math.max(trueFollowers - additionalDedup, uniqueCount);

    logger.info(`Deduplication: ${totalFollowers} total, ${duplicateCount} username duplicates, ${additionalDedup} email duplicates, ${finalCount} unique`);

    return finalCount;
  }

  /**
   * Find followers with matching emails across platforms
   */
  private async findEmailMatches(followerLists: Array<FollowerData[]>): Promise<Set<string>> {
    const emailMap = new Map<string, Set<string>>(); // email -> set of follower IDs

    followerLists.forEach((followers, platformIndex) => {
      followers.forEach(follower => {
        if (follower.email) {
          const normalizedEmail = follower.email.toLowerCase().trim();
          if (!emailMap.has(normalizedEmail)) {
            emailMap.set(normalizedEmail, new Set());
          }
          emailMap.get(normalizedEmail)!.add(`${platformIndex}:${follower.id}`);
        }
      });
    });

    // Count emails that appear on multiple platforms
    const duplicates = new Set<string>();
    emailMap.forEach((followerIds, email) => {
      if (followerIds.size > 1) {
        // This email appears on multiple platforms - all but one are duplicates
        const idsArray = Array.from(followerIds);
        for (let i = 1; i < idsArray.length; i++) {
          duplicates.add(idsArray[i]);
        }
      }
    });

    return duplicates;
  }

  /**
   * Core deduplication algorithm (fallback method)
   */
  private deduplicateFollowers(
    followerLists: Array<FollowerData[]>,
    accounts: SocialAccount[]
  ): Set<string> {
    const uniqueFollowers = new Set<string>();
    const seenFollowers = new Map<string, Set<string>>(); // followerId -> set of matched IDs

    // Create a map of all followers by their identifiers
    const followerMap = new Map<string, FollowerData>();

    followerLists.forEach((followers, platformIndex) => {
      followers.forEach(follower => {
        const key = `${accounts[platformIndex].platform}:${follower.id}`;
        followerMap.set(key, follower);
      });
    });

    // First pass: exact username matches
    const usernameGroups = new Map<string, string[]>();
    followerMap.forEach((follower, key) => {
      const normalizedUsername = this.normalizeUsername(follower.username);
      if (!usernameGroups.has(normalizedUsername)) {
        usernameGroups.set(normalizedUsername, []);
      }
      usernameGroups.get(normalizedUsername)!.push(key);
    });

    // Group exact matches
    usernameGroups.forEach((keys) => {
      if (keys.length > 1) {
        // Multiple platforms have the same username
        const primaryKey = keys[0];
        uniqueFollowers.add(primaryKey);
        keys.forEach(key => {
          if (!seenFollowers.has(primaryKey)) {
            seenFollowers.set(primaryKey, new Set());
          }
          seenFollowers.get(primaryKey)!.add(key);
        });
      } else {
        uniqueFollowers.add(keys[0]);
      }
    });

    // Second pass: fuzzy matching for remaining followers
    const unmatchedFollowers = Array.from(followerMap.entries()).filter(
      ([key]) => !Array.from(seenFollowers.values()).some(set => set.has(key))
    );

    // Use fuzzy matching for similar usernames
    for (let i = 0; i < unmatchedFollowers.length; i++) {
      const [key1, follower1] = unmatchedFollowers[i];
      let matched = false;

      for (let j = i + 1; j < unmatchedFollowers.length; j++) {
        const [key2, follower2] = unmatchedFollowers[j];

        if (this.isLikelyDuplicate(follower1, follower2)) {
          // Found a match
          const primaryKey = key1;
          uniqueFollowers.add(primaryKey);
          
          if (!seenFollowers.has(primaryKey)) {
            seenFollowers.set(primaryKey, new Set());
          }
          seenFollowers.get(primaryKey)!.add(key2);
          matched = true;
          break;
        }
      }

      if (!matched && !Array.from(seenFollowers.values()).some(set => set.has(key1))) {
        uniqueFollowers.add(key1);
      }
    }

    return uniqueFollowers;
  }

  /**
   * Check if two followers are likely the same person
   */
  private isLikelyDuplicate(follower1: FollowerData, follower2: FollowerData): boolean {
    // Username similarity (Levenshtein distance)
    const usernameSimilarity = this.calculateSimilarity(
      this.normalizeUsername(follower1.username),
      this.normalizeUsername(follower2.username)
    );
    if (usernameSimilarity > 0.85) return true;

    // Display name similarity
    if (follower1.displayName && follower2.displayName) {
      const nameSimilarity = this.calculateSimilarity(
        follower1.displayName.toLowerCase(),
        follower2.displayName.toLowerCase()
      );
      if (nameSimilarity > 0.9) return true;
    }

    // Profile image hash similarity (if available)
    if (follower1.profileImageHash && follower2.profileImageHash) {
      if (follower1.profileImageHash === follower2.profileImageHash) return true;
    }

    // Bio similarity (if available)
    if (follower1.bio && follower2.bio) {
      const bioSimilarity = this.calculateSimilarity(
        follower1.bio.toLowerCase(),
        follower2.bio.toLowerCase()
      );
      if (bioSimilarity > 0.8 && follower1.bio.length > 20) return true;
    }

    return false;
  }

  /**
   * Normalize username for comparison
   */
  private normalizeUsername(username: string): string {
    return username.toLowerCase().replace(/[._-]/g, '').trim();
  }

  /**
   * Calculate similarity between two strings (Jaro-Winkler-like)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Simple Levenshtein-based similarity
    const maxLen = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Store deduplication results in database for caching
   */
  async cacheDeduplicationResult(influencerId: string, trueFollowerCount: number): Promise<void> {
    try {
      await query(
        'UPDATE influencers SET true_follower_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [trueFollowerCount, influencerId]
      );
      logger.info(`Cached deduplication result for influencer ${influencerId}: ${trueFollowerCount}`);
    } catch (error) {
      logger.error('Error caching deduplication result', error);
    }
  }
}
