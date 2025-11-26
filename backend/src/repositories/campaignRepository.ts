import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';

export interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  user_id?: string | null;
  company_id?: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  budget?: number | null;
  budget_currency?: string | null;
  budget_usd?: number | null;
  target_countries?: string[] | null;
  start_date?: Date | null;
  end_date?: Date | null;
  platform_fee_percentage?: number | null;
  is_global?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignInfluencer {
  id: string;
  campaign_id: string;
  influencer_id: string;
  influencer_name?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  payment_amount?: number | null;
  payment_status?: string;
  created_at: Date;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  user_id?: string;
  company_id?: string;
  budget?: number;
  budget_currency?: string;
  budget_usd?: number;
  target_countries?: string[];
  start_date?: Date;
  end_date?: Date;
  is_global?: boolean;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string | null;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  budget?: number | null;
  budget_currency?: string | null;
  budget_usd?: number | null;
  target_countries?: string[] | null;
  start_date?: Date | null;
  end_date?: Date | null;
  is_global?: boolean | null;
}

class CampaignRepository {
  /**
   * Create a new campaign (with global/multi-currency support)
   */
  async create(input: CreateCampaignInput): Promise<Campaign> {
    const pool = getDatabasePool();
    
    const result = await pool.query<Campaign>(
      `INSERT INTO campaigns (
        name, description, user_id, company_id, 
        budget, budget_currency, budget_usd,
        target_countries, start_date, end_date, is_global
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        input.name,
        input.description || null,
        input.user_id || null,
        input.company_id || null,
        input.budget || null,
        input.budget_currency || 'USD',
        input.budget_usd || input.budget || null,
        input.target_countries || null,
        input.start_date || null,
        input.end_date || null,
        input.is_global || false,
      ]
    );

    logger.info('Campaign created', { 
      campaignId: result.rows[0].id,
      isGlobal: input.is_global,
      currency: input.budget_currency 
    });
    return result.rows[0];
  }

  /**
   * Find campaign by ID
   */
  async findById(id: string): Promise<Campaign | null> {
    const pool = getDatabasePool();
    
    const result = await pool.query<Campaign>(
      'SELECT * FROM campaigns WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get campaign with influencers
   */
  async findByIdWithInfluencers(id: string): Promise<(Campaign & { influencers: CampaignInfluencer[] }) | null> {
    const pool = getDatabasePool();
    
    const campaignResult = await pool.query<Campaign>(
      'SELECT * FROM campaigns WHERE id = $1',
      [id]
    );

    if (!campaignResult.rows[0]) {
      return null;
    }

    const influencersResult = await pool.query<CampaignInfluencer>(
      `SELECT ci.*, i.name as influencer_name
       FROM campaign_influencers ci
       JOIN influencers i ON i.id = ci.influencer_id
       WHERE ci.campaign_id = $1`,
      [id]
    );

    return {
      ...campaignResult.rows[0],
      influencers: influencersResult.rows,
    };
  }

  /**
   * Find all campaigns
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  } = {}): Promise<{ campaigns: Campaign[]; total: number }> {
    const pool = getDatabasePool();
    const { page = 1, limit = 20, status, userId } = options;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (userId) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM campaigns ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const selectValues = [...values, limit, offset];
    const result = await pool.query<Campaign>(
      `SELECT * FROM campaigns ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      selectValues
    );

    return { campaigns: result.rows, total };
  }

  /**
   * Update campaign
   */
  async update(id: string, input: UpdateCampaignInput): Promise<Campaign | null> {
    const pool = getDatabasePool();
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await pool.query<Campaign>(
      `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows[0]) {
      logger.info('Campaign updated', { campaignId: id });
    }

    return result.rows[0] || null;
  }

  /**
   * Delete campaign
   */
  async delete(id: string): Promise<boolean> {
    const pool = getDatabasePool();
    
    const result = await pool.query(
      'DELETE FROM campaigns WHERE id = $1',
      [id]
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info('Campaign deleted', { campaignId: id });
      return true;
    }

    return false;
  }

  /**
   * Add influencer to campaign
   */
  async addInfluencer(campaignId: string, influencerId: string, paymentAmount?: number): Promise<CampaignInfluencer> {
    const pool = getDatabasePool();
    
    const result = await pool.query<CampaignInfluencer>(
      `INSERT INTO campaign_influencers (campaign_id, influencer_id, payment_amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [campaignId, influencerId, paymentAmount || null]
    );

    logger.info('Influencer added to campaign', { campaignId, influencerId });
    return result.rows[0];
  }

  /**
   * Remove influencer from campaign
   */
  async removeInfluencer(campaignId: string, influencerId: string): Promise<boolean> {
    const pool = getDatabasePool();
    
    const result = await pool.query(
      'DELETE FROM campaign_influencers WHERE campaign_id = $1 AND influencer_id = $2',
      [campaignId, influencerId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update influencer status in campaign
   */
  async updateInfluencerStatus(
    campaignId: string,
    influencerId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'completed'
  ): Promise<CampaignInfluencer | null> {
    const pool = getDatabasePool();
    
    const result = await pool.query<CampaignInfluencer>(
      `UPDATE campaign_influencers 
       SET status = $3 
       WHERE campaign_id = $1 AND influencer_id = $2
       RETURNING *`,
      [campaignId, influencerId, status]
    );

    return result.rows[0] || null;
  }

  /**
   * Get campaign influencers
   */
  async getInfluencers(campaignId: string): Promise<CampaignInfluencer[]> {
    const pool = getDatabasePool();
    
    const result = await pool.query<CampaignInfluencer>(
      `SELECT ci.*, i.name as influencer_name
       FROM campaign_influencers ci
       JOIN influencers i ON i.id = ci.influencer_id
       WHERE ci.campaign_id = $1
       ORDER BY ci.created_at DESC`,
      [campaignId]
    );

    return result.rows;
  }
}

export const campaignRepository = new CampaignRepository();





