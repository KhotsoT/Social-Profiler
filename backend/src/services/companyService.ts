/**
 * CreatorPay Company Service
 * Manages company/brand accounts
 */

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { currencyService } from './currencyService';

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  city?: string;
  province?: string;
  country_code: string;
  billing_currency: string;
  billing_email?: string;
  billing_address?: Record<string, unknown>;
  tax_number?: string;
  total_campaigns: number;
  total_spent: number;
  average_rating: number;
  is_verified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  created_at: Date;
  updated_at: Date;
}

export interface CreateCompanyParams {
  owner_id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  city?: string;
  province?: string;
  country_code?: string;
  billing_currency?: string;
  billing_email?: string;
  tax_number?: string;
}

class CompanyService {
  /**
   * Create a new company
   */
  async createCompany(params: CreateCompanyParams): Promise<Company> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate slug from name
      const slug = this.generateSlug(params.name);

      // Get default currency for country
      const countryCode = params.country_code || 'ZA';
      const defaultCurrency = params.billing_currency || 
        await currencyService.getDefaultCurrency(countryCode);

      // Create company
      const result = await client.query(
        `INSERT INTO companies (
           owner_id, name, slug, description, logo_url, website,
           industry, company_size, city, province, country_code,
           billing_currency, billing_email, tax_number
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          params.owner_id,
          params.name,
          slug,
          params.description || null,
          params.logo_url || null,
          params.website || null,
          params.industry || null,
          params.company_size || null,
          params.city || null,
          params.province || null,
          countryCode,
          defaultCurrency,
          params.billing_email || null,
          params.tax_number || null,
        ]
      );

      // Add owner as company member
      await client.query(
        `INSERT INTO company_members (company_id, user_id, role, status, joined_at)
         VALUES ($1, $2, 'owner', 'active', NOW())`,
        [result.rows[0].id, params.owner_id]
      );

      // Update user role to 'brand'
      await client.query(
        `UPDATE users SET role = 'brand' WHERE id = $1 AND role = 'user'`,
        [params.owner_id]
      );

      await client.query('COMMIT');

      logger.info(`Created company: ${params.name} (${result.rows[0].id})`);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating company:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: string): Promise<Company | null> {
    try {
      const result = await pool.query(
        `SELECT c.*, 
                co.name as country_name, co.flag_emoji,
                cur.symbol as currency_symbol, cur.name as currency_name
         FROM companies c
         LEFT JOIN countries co ON c.country_code = co.code
         LEFT JOIN currencies cur ON c.billing_currency = cur.code
         WHERE c.id = $1`,
        [companyId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting company:', error);
      throw error;
    }
  }

  /**
   * Get company by owner user ID
   */
  async getCompanyByOwner(ownerId: string): Promise<Company | null> {
    try {
      const result = await pool.query(
        `SELECT c.*, 
                co.name as country_name, co.flag_emoji,
                cur.symbol as currency_symbol
         FROM companies c
         LEFT JOIN countries co ON c.country_code = co.code
         LEFT JOIN currencies cur ON c.billing_currency = cur.code
         WHERE c.owner_id = $1`,
        [ownerId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting company by owner:', error);
      throw error;
    }
  }

  /**
   * Get companies where user is a member
   */
  async getUserCompanies(userId: string): Promise<Company[]> {
    try {
      const result = await pool.query(
        `SELECT c.*, cm.role as member_role,
                co.name as country_name, co.flag_emoji,
                cur.symbol as currency_symbol
         FROM companies c
         JOIN company_members cm ON c.id = cm.company_id
         LEFT JOIN countries co ON c.country_code = co.code
         LEFT JOIN currencies cur ON c.billing_currency = cur.code
         WHERE cm.user_id = $1 AND cm.status = 'active'
         ORDER BY c.name`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting user companies:', error);
      throw error;
    }
  }

  /**
   * Update company
   */
  async updateCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
    try {
      const allowedFields = [
        'name', 'description', 'logo_url', 'website', 'industry',
        'company_size', 'city', 'province', 'country_code',
        'billing_currency', 'billing_email', 'billing_address', 'tax_number'
      ];

      const setClause: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(key === 'billing_address' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(companyId);

      const result = await pool.query(
        `UPDATE companies SET ${setClause.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (!result.rows[0]) {
        throw new Error('Company not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Add team member to company
   */
  async addTeamMember(params: {
    company_id: string;
    user_id: string;
    role: 'admin' | 'member' | 'viewer';
    invited_by: string;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO company_members (company_id, user_id, role, invited_by, status, joined_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())
         ON CONFLICT (company_id, user_id) 
         DO UPDATE SET role = $3, status = 'active', joined_at = NOW()`,
        [params.company_id, params.user_id, params.role, params.invited_by]
      );

      logger.info(`Added team member ${params.user_id} to company ${params.company_id}`);
    } catch (error) {
      logger.error('Error adding team member:', error);
      throw error;
    }
  }

  /**
   * Get company team members
   */
  async getTeamMembers(companyId: string): Promise<Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: string;
    joined_at: Date;
  }>> {
    try {
      const result = await pool.query(
        `SELECT cm.id, cm.user_id, u.name, u.email, cm.role, cm.joined_at
         FROM company_members cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.company_id = $1 AND cm.status = 'active'
         ORDER BY 
           CASE cm.role 
             WHEN 'owner' THEN 1 
             WHEN 'admin' THEN 2 
             WHEN 'member' THEN 3 
             ELSE 4 
           END`,
        [companyId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting team members:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to company
   */
  async userHasAccess(userId: string, companyId: string, requiredRole?: string[]): Promise<boolean> {
    try {
      let query = `
        SELECT role FROM company_members 
        WHERE company_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const params: (string | string[])[] = [companyId, userId];

      if (requiredRole && requiredRole.length > 0) {
        query += ` AND role = ANY($3)`;
        params.push(requiredRole);
      }

      const result = await pool.query(query, params);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking company access:', error);
      return false;
    }
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  /**
   * Get company campaign statistics
   */
  async getCompanyStats(companyId: string): Promise<{
    total_campaigns: number;
    active_campaigns: number;
    completed_campaigns: number;
    total_spent: number;
    total_reach: number;
    total_engagements: number;
    avg_engagement_rate: number;
    top_creators: Array<{ name: string; campaigns: number }>;
  }> {
    try {
      const statsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_campaigns,
           COUNT(*) FILTER (WHERE status = 'active' OR status = 'in_progress') as active_campaigns,
           COUNT(*) FILTER (WHERE status = 'completed') as completed_campaigns,
           COALESCE(SUM(budget), 0) as total_spent,
           COALESCE(SUM(total_reach), 0) as total_reach,
           COALESCE(SUM(total_engagements), 0) as total_engagements,
           COALESCE(AVG(average_engagement_rate), 0) as avg_engagement_rate
         FROM campaigns
         WHERE company_id = $1`,
        [companyId]
      );

      const topCreatorsResult = await pool.query(
        `SELECT i.name, COUNT(*) as campaigns
         FROM campaign_invitations ci
         JOIN campaigns c ON ci.campaign_id = c.id
         JOIN influencers i ON ci.influencer_id = i.id
         WHERE c.company_id = $1 AND ci.status = 'accepted'
         GROUP BY i.id, i.name
         ORDER BY campaigns DESC
         LIMIT 5`,
        [companyId]
      );

      const stats = statsResult.rows[0];

      return {
        total_campaigns: parseInt(stats.total_campaigns),
        active_campaigns: parseInt(stats.active_campaigns),
        completed_campaigns: parseInt(stats.completed_campaigns),
        total_spent: parseFloat(stats.total_spent),
        total_reach: parseInt(stats.total_reach),
        total_engagements: parseInt(stats.total_engagements),
        avg_engagement_rate: parseFloat(stats.avg_engagement_rate),
        top_creators: topCreatorsResult.rows.map((row: { name: string; campaigns: string }) => ({
          name: row.name,
          campaigns: parseInt(row.campaigns),
        })),
      };
    } catch (error) {
      logger.error('Error getting company stats:', error);
      throw error;
    }
  }
}

export const companyService = new CompanyService();
export default companyService;

