import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { join } from 'path';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimit } from './middleware/rateLimit';
import { logger } from './utils/logger';
import { influencerRoutes } from './routes/influencer';
import { analyticsRoutes } from './routes/analytics';
import { campaignRoutes } from './routes/campaign';
import { healthRoutes } from './routes/health';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import currencyRoutes from './routes/currency';
import walletRoutes from './routes/wallet';
import companyRoutes from './routes/company';
import ratesRoutes from './routes/rates';
import { getDatabasePool, closeDatabasePool } from './config/database';

// Load .env from root directory
dotenv.config({ path: join(__dirname, '../../.env') });

// Initialize database connection
if (process.env.DATABASE_URL) {
  getDatabasePool();
  logger.info('Database connection initialized');
} else {
  logger.warn('DATABASE_URL not set, using in-memory storage');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database pool');
  await closeDatabasePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database pool');
  await closeDatabasePool();
  process.exit(0);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Rate limiting for API routes (skip health checks)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return apiRateLimit(req, res, next);
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/influencers', influencerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', currencyRoutes);  // /api/currencies, /api/countries, /api/exchange-rates
app.use('/api/wallet', walletRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/rates', ratesRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;

