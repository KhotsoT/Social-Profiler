import { Response, NextFunction } from 'express';
import { campaignRepository } from '../repositories/campaignRepository';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { currencyService } from '../services/currencyService';

export class CampaignController {
  /**
   * List all campaigns
   */
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, status, displayCurrency } = req.query;
      const targetCurrency = (displayCurrency as string) || 'USD';

      const result = await campaignRepository.findAll({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string | undefined,
        userId: req.user?.userId,
      });

      // Convert budgets to display currency if needed
      const campaignsWithCurrency = await Promise.all(
        result.campaigns.map(async (c) => {
          let displayBudget = c.budget;
          let formattedBudget = '';
          
          if (c.budget_currency && c.budget_currency !== targetCurrency) {
            const conversion = await currencyService.convertCurrency(
              c.budget || 0, 
              c.budget_currency, 
              targetCurrency
            );
            displayBudget = conversion.converted_amount;
            formattedBudget = conversion.formatted_converted;
          } else {
            const currencyData = await currencyService.getCurrency(c.budget_currency || 'USD');
            formattedBudget = currencyService.formatAmount(c.budget || 0, currencyData);
          }

          return {
            id: c.id,
            name: c.name,
            description: c.description,
            status: c.status,
            budget: c.budget,
            budgetCurrency: c.budget_currency,
            budgetUsd: c.budget_usd,
            displayBudget,
            formattedBudget,
            targetCountries: c.target_countries,
            isGlobal: c.is_global,
            startDate: c.start_date,
            endDate: c.end_date,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          };
        })
      );

      res.json({
        success: true,
        data: {
          campaigns: campaignsWithCurrency,
          total: result.total,
          page: page ? parseInt(page as string, 10) : 1,
          totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 20)),
          displayCurrency: targetCurrency,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign by ID (with multi-currency support)
   */
  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { displayCurrency } = req.query;
      const targetCurrency = (displayCurrency as string) || undefined;

      const campaign = await campaignRepository.findByIdWithInfluencers(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Get currency data for formatting
      const campaignCurrency = campaign.budget_currency || 'USD';
      const currencyData = await currencyService.getCurrency(campaignCurrency);
      const formattedBudget = currencyService.formatAmount(campaign.budget || 0, currencyData);

      // Convert to display currency if specified
      let displayBudget = campaign.budget;
      let formattedDisplayBudget = formattedBudget;
      
      if (targetCurrency && targetCurrency !== campaignCurrency) {
        const conversion = await currencyService.convertCurrency(
          campaign.budget || 0,
          campaignCurrency,
          targetCurrency
        );
        displayBudget = conversion.converted_amount;
        formattedDisplayBudget = conversion.formatted_converted;
      }

      res.json({
        success: true,
        data: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          budget: campaign.budget,
          budgetCurrency: campaignCurrency,
          budgetUsd: campaign.budget_usd,
          formattedBudget,
          displayBudget,
          formattedDisplayBudget,
          targetCountries: campaign.target_countries,
          isGlobal: campaign.is_global,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          influencers: campaign.influencers.map(i => ({
            id: i.id,
            influencerId: i.influencer_id,
            influencerName: i.influencer_name,
            status: i.status,
            paymentAmount: i.payment_amount,
            paymentStatus: i.payment_status,
          })),
          createdAt: campaign.created_at,
          updatedAt: campaign.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new campaign (with global/multi-currency support)
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        name, 
        description, 
        budget, 
        budgetCurrency,
        targetCountries,
        startDate, 
        endDate,
        companyId,
        isGlobal
      } = req.body;

      // Convert budget to USD for standardization
      let budgetUsd = budget;
      const currency = budgetCurrency || 'USD';
      
      if (currency !== 'USD' && budget) {
        const conversion = await currencyService.convertCurrency(budget, currency, 'USD');
        budgetUsd = conversion.converted_amount;
      }

      const campaign = await campaignRepository.create({
        name,
        description,
        budget,
        budget_currency: currency,
        budget_usd: budgetUsd,
        target_countries: targetCountries,
        start_date: startDate ? new Date(startDate) : undefined,
        end_date: endDate ? new Date(endDate) : undefined,
        user_id: req.user?.userId,
        company_id: companyId,
        is_global: isGlobal || (targetCountries && targetCountries.length > 1),
      });

      // Format budget in the campaign's currency
      const currencyData = await currencyService.getCurrency(currency);
      const formattedBudget = currencyService.formatAmount(budget || 0, currencyData);

      res.status(201).json({
        success: true,
        data: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          budget: campaign.budget,
          budgetCurrency: campaign.budget_currency,
          budgetUsd: campaign.budget_usd,
          formattedBudget,
          targetCountries: campaign.target_countries,
          isGlobal: campaign.is_global,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          createdAt: campaign.created_at,
          updatedAt: campaign.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update campaign
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, status, budget, startDate, endDate } = req.body;

      const existingCampaign = await campaignRepository.findById(id);
      if (!existingCampaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const campaign = await campaignRepository.update(id, {
        name,
        description,
        status,
        budget,
        start_date: startDate ? new Date(startDate) : undefined,
        end_date: endDate ? new Date(endDate) : undefined,
      });

      res.json({
        success: true,
        data: {
          id: campaign!.id,
          name: campaign!.name,
          description: campaign!.description,
          status: campaign!.status,
          budget: campaign!.budget,
          startDate: campaign!.start_date,
          endDate: campaign!.end_date,
          createdAt: campaign!.created_at,
          updatedAt: campaign!.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete campaign
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await campaignRepository.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add influencer to campaign
   */
  async addInfluencer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { influencerId, paymentAmount } = req.body;

      const campaign = await campaignRepository.findById(id);
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const campaignInfluencer = await campaignRepository.addInfluencer(
        id,
        influencerId,
        paymentAmount
      );

      res.status(201).json({
        success: true,
        data: {
          id: campaignInfluencer.id,
          campaignId: campaignInfluencer.campaign_id,
          influencerId: campaignInfluencer.influencer_id,
          status: campaignInfluencer.status,
          paymentAmount: campaignInfluencer.payment_amount,
        },
      });
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        res.status(409).json({
          success: false,
          error: 'Influencer already added to this campaign',
          code: 'DUPLICATE',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Remove influencer from campaign
   */
  async removeInfluencer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, influencerId } = req.params;

      const removed = await campaignRepository.removeInfluencer(id, influencerId);

      if (!removed) {
        res.status(404).json({
          success: false,
          error: 'Influencer not found in campaign',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Influencer removed from campaign',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign influencers
   */
  async getInfluencers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const influencers = await campaignRepository.getInfluencers(id);

      res.json({
        success: true,
        data: influencers.map(i => ({
          id: i.id,
          influencerId: i.influencer_id,
          influencerName: i.influencer_name,
          status: i.status,
          paymentAmount: i.payment_amount,
          paymentStatus: i.payment_status,
          createdAt: i.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
