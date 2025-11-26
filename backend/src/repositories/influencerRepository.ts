import { Influencer, SearchFilters, SocialAccount } from '../services/influencerService';
import { logger } from '../utils/logger';
import { query } from '../config/database';

/**
 * Repository for influencer data access using PostgreSQL
 */
export class InfluencerRepository {
  async search(filters: SearchFilters): Promise<Influencer[]> {
    let sql = `
      SELECT 
        i.id,
        i.name,
        i.email,
        i.true_follower_count as "trueFollowerCount",
        i.categories,
        i.created_at as "createdAt",
        i.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'platform', sa.platform,
              'username', sa.username,
              'platformId', sa.platform_id,
              'followerCount', sa.follower_count,
              'followingCount', sa.following_count,
              'postCount', sa.post_count,
              'engagementRate', sa.engagement_rate,
              'verified', sa.verified,
              'profileUrl', sa.profile_url,
              'lastSyncedAt', sa.last_synced_at
            )
          ) FILTER (WHERE sa.id IS NOT NULL),
          '[]'::json
        ) as "socialAccounts"
      FROM influencers i
      LEFT JOIN social_accounts sa ON sa.influencer_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (filters.query) {
      sql += ` AND (
        LOWER(i.name) LIKE $${paramCount} OR
        EXISTS (
          SELECT 1 FROM social_accounts sa2 
          WHERE sa2.influencer_id = i.id 
          AND LOWER(sa2.username) LIKE $${paramCount}
        )
      )`;
      params.push(`%${filters.query.toLowerCase()}%`);
      paramCount++;
    }

    if (filters.platform) {
      sql += ` AND EXISTS (
        SELECT 1 FROM social_accounts sa3 
        WHERE sa3.influencer_id = i.id 
        AND sa3.platform = $${paramCount}
      )`;
      params.push(filters.platform);
      paramCount++;
    }

    if (filters.minFollowers !== undefined) {
      sql += ` AND (
        i.true_follower_count >= $${paramCount} OR
        (SELECT COALESCE(SUM(sa4.follower_count), 0) FROM social_accounts sa4 WHERE sa4.influencer_id = i.id) >= $${paramCount}
      )`;
      params.push(filters.minFollowers);
      paramCount++;
    }

    if (filters.maxFollowers !== undefined) {
      sql += ` AND (
        i.true_follower_count IS NULL OR i.true_follower_count <= $${paramCount}
      ) AND (
        SELECT COALESCE(SUM(sa5.follower_count), 0) FROM social_accounts sa5 WHERE sa5.influencer_id = i.id
      ) <= $${paramCount}
      `;
      params.push(filters.maxFollowers);
      paramCount++;
    }

    if (filters.niche) {
      sql += ` AND $${paramCount} = ANY(i.categories)`;
      params.push(filters.niche.toLowerCase());
      paramCount++;
    }

    sql += ` GROUP BY i.id ORDER BY i.created_at DESC`;

    try {
      const result = await query(sql, params);
      return result.rows.map(this.mapRowToInfluencer);
    } catch (error) {
      logger.error('Error searching influencers', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Influencer | null> {
    const sql = `
      SELECT 
        i.id,
        i.name,
        i.email,
        i.true_follower_count as "trueFollowerCount",
        i.categories,
        i.created_at as "createdAt",
        i.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'platform', sa.platform,
              'username', sa.username,
              'platformId', sa.platform_id,
              'followerCount', sa.follower_count,
              'followingCount', sa.following_count,
              'postCount', sa.post_count,
              'engagementRate', sa.engagement_rate,
              'verified', sa.verified,
              'profileUrl', sa.profile_url,
              'lastSyncedAt', sa.last_synced_at
            )
          ) FILTER (WHERE sa.id IS NOT NULL),
          '[]'::json
        ) as "socialAccounts"
      FROM influencers i
      LEFT JOIN social_accounts sa ON sa.influencer_id = i.id
      WHERE i.id = $1
      GROUP BY i.id
    `;

    try {
      const result = await query(sql, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToInfluencer(result.rows[0]);
    } catch (error) {
      logger.error('Error getting influencer by id', error);
      throw error;
    }
  }

  async create(data: Partial<Influencer>): Promise<Influencer> {
    let client;
    try {
      client = await (await import('../config/database')).getDatabasePool().connect();
    } catch (error: any) {
      logger.error('Failed to get database connection', error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    try {
      await client.query('BEGIN');

      // Insert influencer
      const influencerSql = `
        INSERT INTO influencers (name, email, true_follower_count, categories)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, true_follower_count as "trueFollowerCount", 
                  categories, created_at as "createdAt", updated_at as "updatedAt"
      `;
      const influencerResult = await client.query(influencerSql, [
        data.name || 'Unknown',
        data.email || null,
        data.trueFollowerCount || null,
        data.categories || [],
      ]);

      const influencer = influencerResult.rows[0];
      const influencerId = influencer.id;

      // Insert social accounts
      if (data.socialAccounts && data.socialAccounts.length > 0) {
        const accountSql = `
          INSERT INTO social_accounts (
            influencer_id, platform, username, platform_id,
            follower_count, following_count, post_count,
            engagement_rate, verified, profile_url, last_synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;

        for (const account of data.socialAccounts) {
          await client.query(accountSql, [
            influencerId,
            account.platform,
            account.username,
            account.platformId || account.username,
            account.followerCount || 0,
            account.followingCount || 0,
            account.postCount || 0,
            account.engagementRate || 0,
            account.verified || false,
            account.profileUrl || '',
            account.lastSyncedAt || new Date(),
          ]);
        }
      }

      await client.query('COMMIT');

      // Fetch complete influencer with accounts
      // If getById fails, return the basic influencer we just created
      try {
        const complete = await this.getById(influencerId);
        if (complete) {
          logger.info(`Created influencer: ${influencerId}`);
          return complete;
        }
      } catch (error: any) {
        logger.warn(`Could not fetch complete influencer, returning basic data: ${error.message}`);
      }
      
      // Return basic influencer if getById fails
      return {
        id: influencer.id,
        name: influencer.name,
        email: influencer.email,
        trueFollowerCount: influencer.trueFollowerCount,
        categories: influencer.categories || [],
        socialAccounts: [],
        createdAt: influencer.createdAt,
        updatedAt: influencer.updatedAt,
      } as Influencer;
    } catch (error: any) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error rolling back transaction', rollbackError);
      }
      logger.error('Error creating influencer', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async update(id: string, data: Partial<Influencer>): Promise<Influencer> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      params.push(data.email);
    }
    if (data.trueFollowerCount !== undefined) {
      updates.push(`true_follower_count = $${paramCount++}`);
      params.push(data.trueFollowerCount);
    }
    if (data.categories !== undefined) {
      updates.push(`categories = $${paramCount++}`);
      params.push(data.categories);
    }

    if (updates.length === 0) {
      const influencer = await this.getById(id);
      if (!influencer) {
        throw new Error('Influencer not found');
      }
      return influencer;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const sql = `
      UPDATE influencers 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      await query(sql, params);

      // Update social accounts if provided
      if (data.socialAccounts) {
        const client = await (await import('../config/database')).getDatabasePool().connect();
        try {
          await client.query('BEGIN');

          // Delete existing accounts
          await client.query('DELETE FROM social_accounts WHERE influencer_id = $1', [id]);

          // Insert new accounts
          const accountSql = `
            INSERT INTO social_accounts (
              influencer_id, platform, username, platform_id,
              follower_count, following_count, post_count,
              engagement_rate, verified, profile_url, last_synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `;

          for (const account of data.socialAccounts) {
            // Handle lastSyncedAt - it might be a Date object or string
            let lastSyncedAtValue: Date;
            if (account.lastSyncedAt instanceof Date) {
              lastSyncedAtValue = account.lastSyncedAt;
            } else if (account.lastSyncedAt) {
              lastSyncedAtValue = new Date(account.lastSyncedAt);
            } else {
              lastSyncedAtValue = new Date();
            }

            await client.query(accountSql, [
              id,
              account.platform,
              account.username,
              account.platformId || account.username,
              account.followerCount || 0,
              account.followingCount || 0,
              account.postCount || 0,
              account.engagementRate || 0,
              account.verified || false,
              account.profileUrl || '',
              lastSyncedAtValue,
            ]);
          }

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      const influencer = await this.getById(id);
      if (!influencer) {
        throw new Error('Influencer not found');
      }
      return influencer;
    } catch (error) {
      logger.error('Error updating influencer', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM influencers WHERE id = $1';
    try {
      await query(sql, [id]);
      logger.info(`Deleted influencer: ${id}`);
    } catch (error) {
      logger.error('Error deleting influencer', error);
      throw error;
    }
  }

  async addSocialAccount(influencerId: string, account: Partial<SocialAccount>): Promise<void> {
    const client = await (await import('../config/database')).getDatabasePool().connect();
    
    try {
      await client.query('BEGIN');

      // Check if account already exists for this platform
      const checkSql = `
        SELECT id FROM social_accounts 
        WHERE influencer_id = $1 AND platform = $2
      `;
      const existing = await client.query(checkSql, [influencerId, account.platform]);

      if (existing.rows.length > 0) {
        // Update existing account
        const updateSql = `
          UPDATE social_accounts SET
            username = $3,
            platform_id = $4,
            follower_count = $5,
            following_count = $6,
            post_count = $7,
            engagement_rate = $8,
            verified = $9,
            profile_url = $10,
            last_synced_at = $11,
            updated_at = CURRENT_TIMESTAMP
          WHERE influencer_id = $1 AND platform = $2
        `;
        await client.query(updateSql, [
          influencerId,
          account.platform,
          account.username,
          account.platformId || account.username,
          account.followerCount || 0,
          account.followingCount || 0,
          account.postCount || 0,
          account.engagementRate || 0,
          account.verified || false,
          account.profileUrl || '',
          account.lastSyncedAt || new Date(),
        ]);
      } else {
        // Insert new account or update if exists (ON CONFLICT)
        const insertSql = `
          INSERT INTO social_accounts (
            influencer_id, platform, username, platform_id,
            follower_count, following_count, post_count,
            engagement_rate, verified, profile_url, last_synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (influencer_id, platform) DO UPDATE SET
            username = EXCLUDED.username,
            platform_id = EXCLUDED.platform_id,
            follower_count = EXCLUDED.follower_count,
            following_count = EXCLUDED.following_count,
            post_count = EXCLUDED.post_count,
            engagement_rate = EXCLUDED.engagement_rate,
            verified = EXCLUDED.verified,
            profile_url = EXCLUDED.profile_url,
            last_synced_at = EXCLUDED.last_synced_at,
            updated_at = CURRENT_TIMESTAMP
        `;
        await client.query(insertSql, [
          influencerId,
          account.platform,
          account.username,
          account.platformId || account.username,
          account.followerCount || 0,
          account.followingCount || 0,
          account.postCount || 0,
          account.engagementRate || 0,
          account.verified || false,
          account.profileUrl || '',
          account.lastSyncedAt || new Date(),
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getByCategory(category: string, limit: number, offset: number = 0): Promise<Influencer[]> {
    const sql = `
      SELECT 
        i.id,
        i.name,
        i.email,
        i.true_follower_count as "trueFollowerCount",
        i.categories,
        i.created_at as "createdAt",
        i.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'platform', sa.platform,
              'username', sa.username,
              'platformId', sa.platform_id,
              'followerCount', sa.follower_count,
              'followingCount', sa.following_count,
              'postCount', sa.post_count,
              'engagementRate', sa.engagement_rate,
              'verified', sa.verified,
              'profileUrl', sa.profile_url,
              'lastSyncedAt', sa.last_synced_at
            )
          ) FILTER (WHERE sa.id IS NOT NULL),
          '[]'::json
        ) as "socialAccounts"
      FROM influencers i
      LEFT JOIN social_accounts sa ON sa.influencer_id = i.id
      WHERE $1 = ANY(i.categories)
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await query(sql, [category, limit, offset]);
      return result.rows.map(this.mapRowToInfluencer);
    } catch (error) {
      logger.error('Error getting influencers by category', error);
      throw error;
    }
  }

  async getTopInfluencers(limit: number): Promise<Influencer[]> {
    const sql = `
      SELECT 
        i.id,
        i.name,
        i.email,
        i.true_follower_count as "trueFollowerCount",
        i.categories,
        i.created_at as "createdAt",
        i.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'platform', sa.platform,
              'username', sa.username,
              'platformId', sa.platform_id,
              'followerCount', sa.follower_count,
              'followingCount', sa.following_count,
              'postCount', sa.post_count,
              'engagementRate', sa.engagement_rate,
              'verified', sa.verified,
              'profileUrl', sa.profile_url,
              'lastSyncedAt', sa.last_synced_at
            )
          ) FILTER (WHERE sa.id IS NOT NULL),
          '[]'::json
        ) as "socialAccounts",
        COALESCE(i.true_follower_count, 
          (SELECT SUM(sa2.follower_count) FROM social_accounts sa2 WHERE sa2.influencer_id = i.id), 
          0
        ) as total_followers
      FROM influencers i
      LEFT JOIN social_accounts sa ON sa.influencer_id = i.id
      GROUP BY i.id
      ORDER BY total_followers DESC
      LIMIT $1
    `;

    try {
      const result = await query(sql, [limit]);
      return result.rows.map(this.mapRowToInfluencer);
    } catch (error) {
      logger.error('Error getting top influencers', error);
      throw error;
    }
  }

  private mapRowToInfluencer(row: any): Influencer {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      trueFollowerCount: row.trueFollowerCount,
      categories: row.categories || [],
      socialAccounts: (row.socialAccounts || []).map((acc: any) => ({
        platform: acc.platform,
        username: acc.username,
        platformId: acc.platformId,
        followerCount: acc.followerCount || 0,
        followingCount: acc.followingCount || 0,
        postCount: acc.postCount || 0,
        engagementRate: parseFloat(acc.engagementRate) || 0,
        verified: acc.verified || false,
        profileUrl: acc.profileUrl || '',
        lastSyncedAt: new Date(acc.lastSyncedAt),
      })),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
