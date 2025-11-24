import { logger } from '../utils/logger';
import { query } from '../config/database';

export interface FollowerData {
  id: string;
  username: string;
  displayName?: string;
  profileImageHash?: string;
  bio?: string;
  email?: string;
  phone?: string;
}

/**
 * Repository for follower data access using PostgreSQL
 */
export class FollowerRepository {
  async getFollowers(socialAccountId: string, platform: string): Promise<FollowerData[]> {
    const sql = `
      SELECT 
        f.id,
        f.platform_user_id as id,
        f.username,
        f.display_name as "displayName",
        f.profile_image_hash as "profileImageHash",
        f.bio,
        f.email,
        f.phone
      FROM followers f
      INNER JOIN social_accounts sa ON f.social_account_id = sa.id
      WHERE sa.platform = $1 AND sa.platform_id = $2
      ORDER BY f.created_at DESC
    `;

    try {
      // First get social account ID
      const accountResult = await query(
        'SELECT id FROM social_accounts WHERE platform = $1 AND platform_id = $2',
        [platform, socialAccountId]
      );

      if (accountResult.rows.length === 0) {
        logger.warn(`No social account found for ${platform}:${socialAccountId}`);
        return [];
      }

      const accountId = accountResult.rows[0].id;
      const result = await query(
        'SELECT platform_user_id as id, username, display_name as "displayName", profile_image_hash as "profileImageHash", bio, email, phone FROM followers WHERE social_account_id = $1',
        [accountId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        profileImageHash: row.profileImageHash,
        bio: row.bio,
        email: row.email,
        phone: row.phone,
      }));
    } catch (error) {
      logger.error('Error getting followers', error);
      return [];
    }
  }

  async saveFollowers(socialAccountId: string, platform: string, followers: FollowerData[]): Promise<void> {
    if (followers.length === 0) {
      return;
    }

    const client = await (await import('../config/database')).getDatabasePool().connect();

    try {
      await client.query('BEGIN');

      // Get social account ID
      const accountResult = await client.query(
        'SELECT id FROM social_accounts WHERE platform = $1 AND platform_id = $2',
        [platform, socialAccountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error(`Social account not found: ${platform}:${socialAccountId}`);
      }

      const accountId = accountResult.rows[0].id;

      // Delete existing followers for this account
      await client.query('DELETE FROM followers WHERE social_account_id = $1', [accountId]);

      // Insert new followers in batches
      const batchSize = 1000;
      for (let i = 0; i < followers.length; i += batchSize) {
        const batch = followers.slice(i, i + batchSize);
        const values: string[] = [];
        const params: any[] = [];
        let paramCount = 1;

        for (const follower of batch) {
          values.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`);
          params.push(
            accountId,
            platform,
            follower.id,
            follower.username,
            follower.displayName || null,
            follower.profileImageHash || null,
            follower.bio || null,
            follower.email || null
          );
        }

        const insertSql = `
          INSERT INTO followers (
            social_account_id, platform, platform_user_id, username,
            display_name, profile_image_hash, bio, email
          ) VALUES ${values.join(', ')}
          ON CONFLICT (social_account_id, platform_user_id) DO UPDATE SET
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            profile_image_hash = EXCLUDED.profile_image_hash,
            bio = EXCLUDED.bio,
            email = EXCLUDED.email
        `;

        await client.query(insertSql, params);
      }

      await client.query('COMMIT');
      logger.info(`Saved ${followers.length} followers for ${platform}:${socialAccountId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error saving followers', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getFollowersByUsername(username: string, platform?: string): Promise<FollowerData[]> {
    let sql = `
      SELECT 
        f.platform_user_id as id,
        f.username,
        f.display_name as "displayName",
        f.profile_image_hash as "profileImageHash",
        f.bio,
        f.email,
        f.phone,
        sa.platform
      FROM followers f
      INNER JOIN social_accounts sa ON f.social_account_id = sa.id
      WHERE LOWER(f.username) = LOWER($1)
    `;
    const params: any[] = [username];

    if (platform) {
      sql += ' AND sa.platform = $2';
      params.push(platform);
    }

    try {
      const result = await query(sql, params);
      return result.rows.map((row: any) => ({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        profileImageHash: row.profileImageHash,
        bio: row.bio,
        email: row.email,
        phone: row.phone,
      }));
    } catch (error) {
      logger.error('Error getting followers by username', error);
      return [];
    }
  }

  async getFollowersByEmail(email: string): Promise<FollowerData[]> {
    const sql = `
      SELECT 
        f.platform_user_id as id,
        f.username,
        f.display_name as "displayName",
        f.profile_image_hash as "profileImageHash",
        f.bio,
        f.email,
        f.phone,
        sa.platform
      FROM followers f
      INNER JOIN social_accounts sa ON f.social_account_id = sa.id
      WHERE LOWER(f.email) = LOWER($1)
    `;

    try {
      const result = await query(sql, [email]);
      return result.rows.map((row: any) => ({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        profileImageHash: row.profileImageHash,
        bio: row.bio,
        email: row.email,
        phone: row.phone,
      }));
    } catch (error) {
      logger.error('Error getting followers by email', error);
      return [];
    }
  }

  async getFollowerCount(socialAccountId: string, platform: string): Promise<number> {
    try {
      const accountResult = await query(
        'SELECT id FROM social_accounts WHERE platform = $1 AND platform_id = $2',
        [platform, socialAccountId]
      );

      if (accountResult.rows.length === 0) {
        return 0;
      }

      const accountId = accountResult.rows[0].id;
      const result = await query(
        'SELECT COUNT(*) as count FROM followers WHERE social_account_id = $1',
        [accountId]
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting follower count', error);
      return 0;
    }
  }
}
