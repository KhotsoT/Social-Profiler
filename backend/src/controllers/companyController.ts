/**
 * CreatorPay Company Controller
 * Handles company/brand related API endpoints
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { companyService } from '../services/companyService';
import { logger } from '../utils/logger';

export class CompanyController {
  /**
   * POST /api/companies
   * Create a new company
   */
  async createCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { name, description, logo_url, website, industry, company_size,
              city, province, country_code, billing_currency, billing_email, tax_number } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Company name is required' });
        return;
      }

      // Check if user already has a company
      const existingCompany = await companyService.getCompanyByOwner(userId);
      if (existingCompany) {
        res.status(400).json({ 
          success: false, 
          error: 'You already have a company account',
          data: existingCompany
        });
        return;
      }

      const company = await companyService.createCompany({
        owner_id: userId,
        name,
        description,
        logo_url,
        website,
        industry,
        company_size,
        city,
        province,
        country_code,
        billing_currency,
        billing_email,
        tax_number,
      });

      res.status(201).json({
        success: true,
        data: company,
        message: 'Company created successfully',
      });
    } catch (error) {
      logger.error('Error in createCompany:', error);
      res.status(500).json({ success: false, error: 'Failed to create company' });
    }
  }

  /**
   * GET /api/companies/me
   * Get current user's company
   */
  async getMyCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const companies = await companyService.getUserCompanies(userId);

      if (companies.length === 0) {
        res.status(404).json({ 
          success: false, 
          error: 'No company found. Create one to get started.',
        });
        return;
      }

      res.json({
        success: true,
        data: companies[0], // Primary company
        all_companies: companies,
      });
    } catch (error) {
      logger.error('Error in getMyCompany:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch company' });
    }
  }

  /**
   * GET /api/companies/:id
   * Get company by ID
   */
  async getCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const company = await companyService.getCompanyById(id);
      
      if (!company) {
        res.status(404).json({ success: false, error: 'Company not found' });
        return;
      }

      // Check access if not owner
      if (userId && company.owner_id !== userId) {
        const hasAccess = await companyService.userHasAccess(userId, id);
        if (!hasAccess) {
          // Return limited public info
          res.json({
            success: true,
            data: {
              id: company.id,
              name: company.name,
              logo_url: company.logo_url,
              industry: company.industry,
              is_verified: company.is_verified,
              average_rating: company.average_rating,
              total_campaigns: company.total_campaigns,
            },
          });
          return;
        }
      }

      res.json({ success: true, data: company });
    } catch (error) {
      logger.error('Error in getCompany:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch company' });
    }
  }

  /**
   * PUT /api/companies/:id
   * Update company
   */
  async updateCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Check access (owner or admin only)
      const hasAccess = await companyService.userHasAccess(userId, id, ['owner', 'admin']);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Not authorized to update this company' });
        return;
      }

      const company = await companyService.updateCompany(id, req.body);

      res.json({
        success: true,
        data: company,
        message: 'Company updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateCompany:', error);
      res.status(500).json({ success: false, error: 'Failed to update company' });
    }
  }

  /**
   * GET /api/companies/:id/stats
   * Get company statistics
   */
  async getCompanyStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Check access
      const hasAccess = await companyService.userHasAccess(userId, id);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      const stats = await companyService.getCompanyStats(id);

      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error in getCompanyStats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  }

  /**
   * GET /api/companies/:id/team
   * Get company team members
   */
  async getTeamMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Check access
      const hasAccess = await companyService.userHasAccess(userId, id);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      const members = await companyService.getTeamMembers(id);

      res.json({ success: true, data: members });
    } catch (error) {
      logger.error('Error in getTeamMembers:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch team members' });
    }
  }

  /**
   * POST /api/companies/:id/team
   * Add team member
   */
  async addTeamMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Check access (owner or admin only)
      const hasAccess = await companyService.userHasAccess(userId, id, ['owner', 'admin']);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Not authorized to add team members' });
        return;
      }

      const { user_id, role } = req.body;

      if (!user_id || !role) {
        res.status(400).json({ success: false, error: 'user_id and role are required' });
        return;
      }

      if (!['admin', 'member', 'viewer'].includes(role)) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      await companyService.addTeamMember({
        company_id: id,
        user_id,
        role,
        invited_by: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Team member added successfully',
      });
    } catch (error) {
      logger.error('Error in addTeamMember:', error);
      res.status(500).json({ success: false, error: 'Failed to add team member' });
    }
  }
}

export const companyController = new CompanyController();
export default companyController;


